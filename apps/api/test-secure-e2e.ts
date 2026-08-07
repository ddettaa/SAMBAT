const API = process.env.API_URL || "http://127.0.0.1:3201";
const OPERATOR = process.env.OPERATOR_API_KEY || "test-operator-key";
const COLLECTOR = process.env.COLLECTOR_API_KEY || "test-collector-key";

async function request(path: string, init: RequestInit = {}, key?: string) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  if (key) headers.set("x-api-key", key);
  const response = await fetch(API + path, { ...init, headers });
  const text = await response.text();
  let body: any = text;
  try { body = JSON.parse(text); } catch {}
  return { status: response.status, body };
}
const post = (path: string, body: any, key?: string) => request(path, { method: "POST", body: JSON.stringify(body) }, key);
const assert = (condition: any, message: string) => { if (!condition) throw new Error(message); };
let r: any;

// Internal report data must not be public.
r = await request("/api/reports");
assert(r.status === 401, `reports without auth: ${r.status}`);

// Intake requires collector/operator authentication.
r = await post("/api/reports", { text: "Jalan berlubang di Jalan Veteran", source: "web", locationText: "Jalan Veteran", latitude: -3.32, longitude: 114.59 });
assert(r.status === 401, `create without auth: ${r.status}`);

// Geoportal integration: official city bounds are respected for coordinate validation.
r = await post("/api/reports", { text: "lampu mati", source: "web", latitude: 999, longitude: 999 }, COLLECTOR);
assert(r.status === 400, `coords out of range: ${r.status}`);
r = await post("/api/reports", { text: "lampu mati", source: "web", latitude: -3.32, longitude: 114.59 }, COLLECTOR);
assert(r.status === 201, `in-city coords accepted: ${r.status}`);
r = await post("/api/reports", { text: "lampu mati", source: "web", latitude: -6.2, longitude: 106.8, sourceRef: "jakarta-1" }, COLLECTOR);
assert(r.status === 201 && r.body.kelurahan === null && r.body.kecamatan === null, "outside city should have null admin");

r = await post("/api/reports", { text: "Jalan berlubang di Jalan Veteran", source: "web", locationText: "Jalan Veteran", latitude: -3.32, longitude: 114.59 }, COLLECTOR);
assert(r.status === 201, `create: ${r.status} ${JSON.stringify(r.body)}`);
const report = r.body;
assert(report.confirmationToken, "missing ownership confirmation token");
assert(report.priority_detail?.method?.startsWith("SMART"), "priority detail must be structured SMART JSON");

// Wrong owner cannot close; valid owner can only close after work awaits confirmation.
r = await post(`/api/reports/${report.id}/confirm`, { token: "wrong" });
assert(r.status === 403, `wrong confirmation token: ${r.status}`);
r = await post(`/api/reports/${report.id}/confirm`, { token: report.confirmationToken });
assert(r.status === 409, `premature confirmation: ${r.status}`);

// Unknown resources and illegal transitions must not report success.
r = await post("/api/reports/not-found/status", { status: "dikerjakan" }, OPERATOR);
assert(r.status === 404, `unknown status resource: ${r.status}`);
r = await post(`/api/reports/${report.id}/status`, { status: "selesai" }, OPERATOR);
assert(r.status === 409, `illegal transition: ${r.status}`);
r = await post(`/api/reports/${report.id}/route`, { dinasId: "not-real" }, OPERATOR);
assert(r.status === 404, `unknown dinas: ${r.status}`);

// Input boundaries.
r = await post("/api/reports", { text: "x".repeat(5001), source: "web" }, COLLECTOR);
assert(r.status === 400 || r.status === 413, `oversized text: ${r.status}`);
r = await request("/api/reports?limit=-1", {}, OPERATOR);
assert(r.status === 400, `negative limit: ${r.status}`);
r = await post("/api/reports", { text: "sampah menumpuk di sungai", source: "web", sourceRef: "dup-1" }, COLLECTOR);
assert(r.status === 201, `idempotent first: ${r.status}`);
const dupFirst = r.body;
r = await post("/api/reports", { text: "sampah menumpuk di sungai", source: "web", sourceRef: "dup-1" }, COLLECTOR);
assert(r.status === 201 && r.body.id === dupFirst.id, `idempotent duplicate should return same report`);
r = await request("/api/ready");
assert(r.status === 200 || r.status === 503, `ready endpoint: ${r.status}`);

// Valid workflow.
r = await post(`/api/reports/${report.id}/route`, { dinasId: "d-pupr" }, OPERATOR);
assert(r.status === 200 && r.body.slaDue, `route: ${r.status}`);
r = await post(`/api/reports/${report.id}/status`, { status: "dikerjakan" }, OPERATOR);
assert(r.status === 200, `dikerjakan: ${r.status}`);
r = await post(`/api/reports/${report.id}/status`, { status: "menunggu_konfirmasi" }, OPERATOR);
assert(r.status === 200, `menunggu: ${r.status}`);
r = await post(`/api/reports/${report.id}/confirm`, { token: report.confirmationToken });
assert(r.status === 200 && r.body.status === "selesai", `confirm: ${r.status}`);

// Similar reports should be grouped automatically, not by a manual arbitrary-ID endpoint.
for (const text of ["Lubang besar di Jalan Veteran", "Jalan berlubang besar di Jalan Veteran"]) {
  r = await post("/api/reports", { text, source: "web", locationText: "Jalan Veteran", latitude: -3.3201, longitude: 114.5901 }, COLLECTOR);
  assert(r.status === 201, `similar create: ${r.status}`);
}
r = await request("/api/cases", {}, OPERATOR);
assert(r.status === 200, `cases: ${r.status}`);
assert(r.body.some((c: any) => c.report_count >= 2), "automatic dedup case missing");

// Audit trail must contain mutations.
r = await request("/api/audit", {}, OPERATOR);
assert(r.status === 200 && r.body.length >= 5, "audit trail missing");

// Rate limiting helper is deterministic and blocks after its ceiling.
{
  const { rateLimit } = await import("./src/rate-limit");
  const key = `self-test-${Date.now()}`;
  assert(rateLimit(key, 2, 60_000), "rate limit first request");
  assert(rateLimit(key, 2, 60_000), "rate limit second request");
  assert(!rateLimit(key, 2, 60_000), "rate limit did not trigger");
}

console.log("ALL SECURE POSTGRES E2E TESTS PASSED");
