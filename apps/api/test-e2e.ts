// SAMBAT API E2E test — butuh AI service jalan di :8000
// Jalankan: bun test-e2e.ts
// (AI offline → laporan tetap masuk dengan kategori 'lainnya')

const API = process.env.API_URL || "http://localhost:3001";

async function post(path: string, body?: any) {
  const res = await fetch(API + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

// 1. health
const health = await (await fetch(`${API}/api/health`)).json();
assert(health.ok, "health");

// 2. create report (Banjar)
const r1 = await post("/api/reports", { text: "lampu jalan di muka rumah ulun mati sudah tiga malam", source: "instagram" });
assert(r1.category === "lampu", `category=${r1.category}`);
assert(r1.text_normalized.includes("depan rumah saya"), r1.text_normalized);
console.log("✓ create + classify:", r1.category, r1.confidence);

// 3. auto-route
const rr = await post(`/api/reports/${r1.id}/auto-route`);
assert(rr.dinasId === "d-dishub", `route=${rr.dinasId}`);
assert(rr.status === "diteruskan", rr.status);
console.log("✓ auto-route:", rr.dinasId);

// 4. status flow
await post(`/api/reports/${r1.id}/status`, { status: "dikerjakan", actor: "dinas" });
const cf = await post(`/api/reports/${r1.id}/confirm`);
assert(cf.status === "selesai", cf.status);
console.log("✓ status → selesai");

// 5. timeline
const detail = await (await fetch(`${API}/api/reports/${r1.id}`)).json();
const tl = detail.timeline.map((t: any) => t.status).join(" → ");
assert(tl === "terdeteksi → diteruskan → dikerjakan → selesai", tl);
console.log("✓ timeline:", tl);

// 6. dashboard public
const pub = await (await fetch(`${API}/api/dashboard/public`)).json();
assert(pub.total >= 1, "total");
console.log("✓ dashboard public:", pub.total, "laporan");

// 7. dinas
const dinas = await (await fetch(`${API}/api/dinas`)).json();
assert(dinas.length === 4, `dinas=${dinas.length}`);
console.log("✓ dinas:", dinas.map((d: any) => d.short).join(", "));

console.log("\nALL API E2E TESTS PASSED");

function assert(cond: any, msg: string) {
  if (!cond) throw new Error("FAIL: " + msg);
}
