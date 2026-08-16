import { Hono } from "hono";
import { cors } from "hono/cors";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { sql, migrate, audit, id, tokenHash, token } from "./db";
import { PILOT_CONFIG, calculatePriority } from "./config";
import { requireRoles, actor, keyHash } from "./auth";
import { rateLimitMiddleware } from "./rate-limit";
import { intake } from "./intake";
import { inCityBounds } from "./geo";

const AI_URL = process.env.AI_URL || "http://localhost:8000";
const CATEGORIES = ["sampah", "drainase", "jalan", "lampu", "lainnya"];
const DINAS_BY_CATEGORY: Record<string, string> = {
  sampah: "d-dlh", drainase: "d-pupr", jalan: "d-pupr", lampu: "d-dishub",
};
const TRANSITIONS: Record<string, string[]> = {
  terdeteksi: ["terverifikasi", "diteruskan", "ditolak"],
  terverifikasi: ["diteruskan", "ditolak"],
  diteruskan: ["dikerjakan", "ditolak"],
  dikerjakan: ["menunggu_konfirmasi", "ditolak"],
  menunggu_konfirmasi: ["selesai", "dikerjakan"],
  selesai: [],
  ditolak: [],
};
const URGENCY_UTILITY: Record<string, number> = { low: 25, medium: 50, high: 75, critical: 100 };

const app = new Hono();
app.use("*", cors({ origin: (process.env.CORS_ORIGIN || "*").split(",") }));
app.use("/api/reports", rateLimitMiddleware(PILOT_CONFIG.rateLimitMax, PILOT_CONFIG.rateLimitWindowMs));
app.use("/api/reports/*", rateLimitMiddleware(PILOT_CONFIG.rateLimitMax, PILOT_CONFIG.rateLimitWindowMs));
app.use("/api/health", rateLimitMiddleware(120, 60_000));
app.use("/api/ready", rateLimitMiddleware(120, 60_000));

function priorityFor(ai: any, reportCount: number, hoursOpen: number, hasLocation: boolean, flood: number | null) {
  return calculatePriority({
    U: URGENCY_UTILITY[ai?.urgency] ?? (ai?.confidence >= PILOT_CONFIG.reviewConfidence ? 75 : 25),
    D: Math.min(100, reportCount * 25),
    V: (hasLocation ? 50 : 0) + (ai?.words_changed > 0 ? 50 : 0),
    T: Math.min(100, Math.floor(hoursOpen / 24) * 25),
    R: flood != null ? Math.min(100, flood * 10) : 25,
  });
}

const PUBLIC_FIELDS = ["id", "category", "location_text", "status", "priority", "dinas_id", "sla_due", "created_at"];
const pickPublic = (row: any) => Object.fromEntries(PUBLIC_FIELDS.map((k) => [k, row[k]]));

app.get("/api/health", (c) => c.json({ ok: true, service: "api", uptime: process.uptime() }));

app.get("/api/ready", async (c) => {
  const checks: Record<string, boolean> = {};
  try {
    await sql`SELECT 1`;
    checks.postgres = true;
  } catch {
    checks.postgres = false;
  }
  try {
    const res = await fetch(`${AI_URL}/health`, { signal: AbortSignal.timeout(5_000) });
    checks.ai = res.ok;
  } catch {
    checks.ai = false;
  }
  const ready = Object.values(checks).every(Boolean);
  return c.json({ ready, checks }, ready ? 200 : 503);
});

// ─── intake ──────────────────────────────────────────────────
app.post("/api/reports", requireRoles("collector", "operator"), async (c) => {
  const body = await c.req.json().catch(() => null);
  const result = await intake(body || {}, actor(c)!.name);
  if (!result.ok) return c.json({ error: result.error }, result.status);
  return c.json({ ...result.report, confirmationToken: result.confirmationToken, priority_detail: result.priorityDetail }, 201);
});

// ─── list / detail (operator/dinas with ownership) ──────────
app.get("/api/reports", requireRoles("operator", "dinas"), async (c) => {
  const category = c.req.query("category");
  const status = c.req.query("status");
  const limitRaw = parseInt(c.req.query("limit") || "50");
  if (!Number.isInteger(limitRaw) || limitRaw < 1 || limitRaw > 100) return c.json({ error: "limit must be 1..100" }, 400);
  const before = c.req.query("before");
  const identity = actor(c);
  const isDinas = identity?.role === "dinas";
  const dinasFilter = isDinas ? sql`AND dinas_id = ${process.env.DINAS_SCOPE || null}` : sql``;
  const cursorFilter = before ? sql`AND created_at < ${before}` : sql``;
  const rows = await sql`
    SELECT * FROM reports
    WHERE (${category ?? null}::text IS NULL OR category = ${category ?? null})
      AND (${status ?? null}::text IS NULL OR status = ${status ?? null})
      ${dinasFilter}
      ${cursorFilter}
    ORDER BY priority DESC, created_at DESC
    LIMIT ${limitRaw}
  `;
  return c.json(rows);
});

app.get("/api/reports/:id", requireRoles("operator", "dinas"), async (c) => {
  const [row] = await sql`SELECT * FROM reports WHERE id = ${c.req.param("id")}`;
  if (!row) return c.json({ error: "not found" }, 404);
  const timeline = await sql`SELECT * FROM sla_events WHERE report_id = ${row.id} ORDER BY created_at`;
  return c.json({ ...row, timeline });
});

// ─── status transition ──────────────────────────────────────
app.post("/api/reports/:id/status", requireRoles("operator", "dinas"), async (c) => {
  const body = await c.req.json().catch(() => null);
  const next = body?.status;
  const [row] = await sql`SELECT status FROM reports WHERE id = ${c.req.param("id")}`;
  if (!row) return c.json({ error: "not found" }, 404);
  if (!TRANSITIONS[row.status]?.includes(next)) {
    return c.json({ error: `illegal transition ${row.status} → ${next}`, allowed: TRANSITIONS[row.status] }, 409);
  }
  const who = actor(c)!.name;
  if (body?.imageAfter) {
    await sql`UPDATE reports SET status = ${next}, image_after = ${body.imageAfter}, updated_at = now() WHERE id = ${c.req.param("id")}`;
  } else {
    await sql`UPDATE reports SET status = ${next}, updated_at = now() WHERE id = ${c.req.param("id")}`;
  }
  await sql`INSERT INTO sla_events ${sql({ id: id("sla"), report_id: c.req.param("id"), status: next, note: body?.note || null, actor: who })}`;
  await audit("status", "report", c.req.param("id")!, who, { from: row.status, to: next });
  return c.json({ id: c.req.param("id"), status: next });
});

// ─── routing ────────────────────────────────────────────────
app.post("/api/reports/:id/route", requireRoles("operator"), async (c) => {
  const body = await c.req.json().catch(() => null);
  const [report] = await sql`SELECT status FROM reports WHERE id = ${c.req.param("id")}`;
  if (!report) return c.json({ error: "not found" }, 404);
  const dinasId = body?.dinasId;
  const [dinas] = await sql`SELECT id FROM dinas WHERE id = ${dinasId ?? null} AND active`;
  if (!dinas) return c.json({ error: "unknown dinas" }, 404);
  if (!["terdeteksi", "terverifikasi"].includes(report.status)) {
    return c.json({ error: `cannot route from ${report.status}` }, 409);
  }
  const [{ category }] = await sql`SELECT category FROM reports WHERE id = ${c.req.param("id")}`;
  const slaHours = PILOT_CONFIG.slaHours[category as keyof typeof PILOT_CONFIG.slaHours] ?? 72;
  const slaDue = new Date(Date.now() + slaHours * 3600 * 1000).toISOString();
  await sql`UPDATE reports SET dinas_id = ${dinasId}, sla_due = ${slaDue}, status = 'diteruskan', updated_at = now() WHERE id = ${c.req.param("id")}`;
  await sql`INSERT INTO sla_events ${sql({ id: id("sla"), report_id: c.req.param("id"), status: "diteruskan", note: `routed ke ${dinasId} (SLA ${slaHours}h)`, actor: actor(c)!.name })}`;
  await audit("route", "report", c.req.param("id")!, actor(c)!.name, { dinasId, slaHours });
  return c.json({ id: c.req.param("id"), dinasId, slaDue, status: "diteruskan" });
});

// ─── auto-route by category ─────────────────────────────────
app.post("/api/reports/:id/auto-route", requireRoles("operator"), async (c) => {
  const [report] = await sql`SELECT status, category FROM reports WHERE id = ${c.req.param("id")}`;
  if (!report) return c.json({ error: "not found" }, 404);
  const dinasId = DINAS_BY_CATEGORY[report.category];
  if (!dinasId) return c.json({ error: "kategori 'lainnya' butuh routing manual operator" }, 409);
  const slaHours = PILOT_CONFIG.slaHours[report.category as keyof typeof PILOT_CONFIG.slaHours];
  const slaDue = new Date(Date.now() + slaHours * 3600 * 1000).toISOString();
  await sql`UPDATE reports SET dinas_id = ${dinasId}, sla_due = ${slaDue}, status = 'diteruskan', updated_at = now() WHERE id = ${c.req.param("id")}`;
  await sql`INSERT INTO sla_events ${sql({ id: id("sla"), report_id: c.req.param("id"), status: "diteruskan", note: `auto-route ${report.category} → ${dinasId}`, actor: "ai" })}`;
  await audit("auto-route", "report", c.req.param("id")!, actor(c)!.name, { dinasId });
  return c.json({ id: c.req.param("id"), dinasId, slaDue, status: "diteruskan" });
});

// ─── citizen confirmation (rate-limited, TTL, attempts) ─────
app.post("/api/reports/:id/confirm", async (c) => {
  const body = await c.req.json().catch(() => null);
  const supplied = typeof body?.token === "string" ? body.token : "";
  const [row] = await sql`SELECT status, confirmation_token_hash, confirmation_expires_at, confirmation_attempts FROM reports WHERE id = ${c.req.param("id")}`;
  if (!row) return c.json({ error: "not found" }, 404);
  if (row.confirmation_expires_at && new Date(row.confirmation_expires_at) < new Date()) {
    return c.json({ error: "confirmation token expired" }, 410);
  }
  if (row.confirmation_attempts >= PILOT_CONFIG.confirmationMaxAttempts) {
    return c.json({ error: "too many attempts" }, 429);
  }
  await sql`UPDATE reports SET confirmation_attempts = confirmation_attempts + 1 WHERE id = ${c.req.param("id")}`;
  if (!supplied || tokenHash(supplied) !== row.confirmation_token_hash) {
    return c.json({ error: "invalid confirmation token" }, 403);
  }
  if (row.status !== "menunggu_konfirmasi") return c.json({ error: `belum siap dikonfirmasi (status ${row.status})` }, 409);
  await sql`UPDATE reports SET status = 'selesai', updated_at = now() WHERE id = ${c.req.param("id")}`;
  await sql`INSERT INTO sla_events ${sql({ id: id("sla"), report_id: c.req.param("id"), status: "selesai", note: "dikonfirmasi warga", actor: "warga" })}`;
  await audit("confirm", "report", c.req.param("id"), "warga", {});
  return c.json({ id: c.req.param("id"), status: "selesai" });
});

// ─── cases ──────────────────────────────────────────────────
app.get("/api/cases", requireRoles("operator", "dinas"), async (c) => {
  return c.json(await sql`SELECT * FROM cases ORDER BY score DESC, created_at DESC`);
});

// ─── audit trail ────────────────────────────────────────────
app.get("/api/audit", requireRoles("operator"), async (c) => {
  return c.json(await sql`SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 200`);
});

// ─── API key management (operator only; raw key shown once) ──
app.post("/api/auth/keys", requireRoles("operator"), async (c) => {
  const body = await c.req.json().catch(() => null);
  const role = body?.role;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const ttlDays = Number(body?.ttlDays ?? 90);
  if (!["collector", "operator", "dinas"].includes(role) || !name || !Number.isInteger(ttlDays) || ttlDays < 1 || ttlDays > 3650) {
    return c.json({ error: "role, name, ttlDays(1..3650) required" }, 400);
  }
  const raw = token();
  const keyId = id("key");
  const expires = new Date(Date.now() + ttlDays * 86400000).toISOString();
  const who = actor(c)?.name || "operator";
  await sql`
    INSERT INTO api_keys (id, role, name, key_hash, expires_at, created_by)
    VALUES (${keyId}, ${role}, ${name}, ${keyHash(raw)}, ${expires}, ${who})
  `;
  await audit("key_created", "api_key", keyId, who, { role, name, expires });
  return c.json({ id: keyId, role, name, expiresAt: expires, apiKey: raw }, 201);
});

app.get("/api/auth/keys", requireRoles("operator"), async (c) => {
  return c.json(await sql`SELECT id, role, name, expires_at, revoked_at, created_at, created_by FROM api_keys ORDER BY created_at DESC`);
});

app.post("/api/auth/keys/:id/revoke", requireRoles("operator"), async (c) => {
  const who = actor(c)?.name || "operator";
  const result = await sql`UPDATE api_keys SET revoked_at = now() WHERE id = ${c.req.param("id")} AND revoked_at IS NULL RETURNING id`;
  if (!result.length) return c.json({ error: "key not found or already revoked" }, 404);
  await audit("key_revoked", "api_key", c.req.param("id")!, who);
  return c.json({ id: c.req.param("id"), revoked: true });
});

// ─── collector webhook intake (collector only) ──────────────
app.post("/api/collector/webhook", requireRoles("collector"), async (c) => {
  const body = await c.req.json().catch(() => null);
  const { enqueueWebhook } = await import("./collector");
  const result = await enqueueWebhook(body || {});
  if (!result.ok) return c.json({ error: result.error }, result.status as ContentfulStatusCode);
  return c.json(result.report, 202);
});

app.get("/api/collector/inbox", requireRoles("collector"), async (c) => {
  const { syncInbox } = await import("./collector");
  return c.json(await syncInbox());
});

// ─── dashboards ─────────────────────────────────────────────
app.get("/api/dashboard/public", async (c) => {
  const [{ total }] = await sql`SELECT count(*)::int AS total FROM reports`;
  const [{ open }] = await sql`SELECT count(*)::int AS open FROM reports WHERE status NOT IN ('selesai','ditolak')`;
  const byCategory = await sql`SELECT category, count(*)::int AS c FROM reports GROUP BY category ORDER BY c DESC`;
  const byStatus = await sql`SELECT status, count(*)::int AS c FROM reports GROUP BY status ORDER BY c DESC`;
  const recent = await sql`SELECT * FROM reports ORDER BY created_at DESC LIMIT 20`;
  return c.json({ total, open, byCategory, byStatus, recent: recent.map(pickPublic) });
});

app.get("/api/dashboard/operator", requireRoles("operator"), async (c) => {
  const queue = await sql`
    SELECT * FROM reports
    WHERE confidence IS NULL OR confidence < ${PILOT_CONFIG.reviewConfidence}
    ORDER BY priority DESC, created_at DESC LIMIT 50
  `;
  return c.json(queue);
});

app.get("/api/dinas", async (c) => c.json(await sql`SELECT id, name, short FROM dinas WHERE active ORDER BY short`));

app.get("/api/geo/summary", async (c) => {
  const admins = await sql`SELECT kind, count(*)::int AS c FROM geo_admin GROUP BY kind`;
  const flood = await sql`SELECT count(*)::int AS c FROM geo_flood`;
  return c.json({ admins, flood });
});


// ─── public demo intake (no API key; prototype only) ─────────
// Keeps the LLM credential server-side so the static page never carries a secret.
app.post("/api/public/reports", async (c) => {
  if (process.env.PUBLIC_DEMO !== "1") return c.json({ error: "public demo disabled" }, 404);
  const body = await c.req.json().catch(() => null);
  const result = await intake({ ...(body || {}), source: "web", sourceRef: null }, "public-demo");
  if (!result.ok) return c.json({ error: result.error }, result.status);
  const r: any = result.report;
  return c.json({
    id: r.id,
    category: r.category,
    normalized: r.text_normalized,
    confidence: r.confidence,
    ai_used: r.ai_used,
    reasoning: r.ai_reasoning,
    kelurahan: r.kelurahan,
    kecamatan: r.kecamatan,
    flood_urgency: r.flood_urgency,
    status: r.status,
    priority: r.priority,
    priority_detail: result.priorityDetail,
    risk_detail: result.riskDetail,
  }, 201);
});

// ─── static prototype (HTML murni) ──────────────────────────
app.get("/", async (c) => c.html(await Bun.file(`${import.meta.dir}/../public/index.html`).text()));
app.get("/app.js", async (c) => new Response(Bun.file(`${import.meta.dir}/../public/app.js`), { headers: { "content-type": "application/javascript; charset=utf-8" } }));
app.get("/style.css", async (c) => new Response(Bun.file(`${import.meta.dir}/../public/style.css`), { headers: { "content-type": "text/css; charset=utf-8" } }));

// ─── demo helper routes (operator only for presentation) ──
app.post("/api/demo/reset", requireRoles("operator"), async (c) => {
  // Truncate runtime data tables
  await sql`TRUNCATE TABLE notifications, sla_events, cases, reports, collector_inbox, audit_log CASCADE`;
  
  // Create default mock data so it is not empty on first demo
  const list = [
    { text: "Hujan lebat sedikit saja langsung banjir rob di daerah Lambung Mangkurat min, saluran air mampet tersumbat sampah plastik barataan. @sambat_bjm", category: "drainase", lat: -3.3244, lng: 114.5912, source: "x", reporterPseudo: "Ahmad Fadillah" },
    { text: "TPS di Jalan Kuripan sampahnya meluber sampai ke jalan raya. Bau busuk banar mengganggu pejalan kaki dan bikin macet. Tolong dibersihkan @sambat_bjm", category: "sampah", lat: -3.3221, lng: 114.5945, source: "x", reporterPseudo: "Siti Rahmah" },
    { text: "Jalan di Jembatan Pasar Lama banyak nang bolong ganal, membahayakan pengendara roda dua mun handak lewat malam hari. @sambat_bjm", category: "jalan", lat: -3.3182, lng: 114.5891, source: "x", reporterPseudo: "Udin Baso" },
    { text: "Lampu jalan (PJU) sepanjang Jl. Hasan Basri Kayutangi dekat kampus ULM banyak nang mati. Gelap gulita mun malam, rawan kejahatan. @sambat_bjm", category: "lampu", lat: -3.2982, lng: 114.5862, source: "x", reporterPseudo: "Rian Hidayat" },
    { text: "Banyu meluap di Siring Jl. S. Parman gara-gara parit drainase mampet total ketutup tanah dan lumpur tebal. Tolong PUPR ditengok. @sambat_bjm", category: "drainase", lat: -3.3134, lng: 114.5821, source: "x", reporterPseudo: "Lana Kalsel" },
    { text: "Jalan Pramuka dekat terminal KM 6 jalannya retak dan berlubang parah. Sering bikin macet panjang pas jam pulang kantor. @sambat_bjm", category: "jalan", lat: -3.3262, lng: 114.6111, source: "x", reporterPseudo: "Hendra Wijaya" },
    { text: "Ada tumpukan sampah liar besar di pinggir jalan dekat TPS Basirih, baunya menyengat banar sampai ke pemukiman warga terdekat @sambat_bjm", category: "sampah", lat: -3.3450, lng: 114.5850, source: "x", reporterPseudo: "Yusuf Amin" },
    { text: "Lampu PJU padam total di kawasan Jembatan Mantuil Ujung. Gelap banar mun malam hari, bahaya gasan warga nang bulik bagawi. @sambat_bjm", category: "lampu", lat: -3.3550, lng: 114.6020, source: "x", reporterPseudo: "Dewi Lestari" }
  ];

  const mockImages: Record<string, string> = {
    sampah: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?q=80&w=600",
    jalan: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?q=80&w=600",
    lampu: "https://images.unsplash.com/photo-1509099836639-18ba1795216d?q=80&w=600",
    drainase: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=600"
  };

  for (const item of list) {
    await intake({
      text: item.text,
      source: item.source,
      latitude: item.lat,
      longitude: item.lng,
      reporterPseudo: item.reporterPseudo,
      imageBefore: mockImages[item.category] || null
    }, "system-demo");
  }

  return c.json({ ok: true, message: "Database cleared and reseeded with 8 active reports" });
});

app.post("/api/demo/simulate", requireRoles("operator"), async (c) => {
  const body = await c.req.json().catch(() => null);
  const scenario = body?.scenario || "banjar";

  if (scenario === "banjar") {
    const res = await intake({
      text: "Selokan di muka rumah ulun mampet banar, mun hujan lebat banyu naik.",
      source: "x",
      latitude: -3.342,
      longitude: 114.583,
      reporterPseudo: "Ulun Banjar",
      imageBefore: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=600"
    }, "web-form");
    return c.json(res);
  }
  
  if (scenario === "duplicate") {
    const results = [];
    const reports = [
      { text: "Jalanan berlubang di Jalan Belitung Darat dekat simpang", lat: -3.315, lng: 114.578, pseudo: "Warga A" },
      { text: "ada lubang besar membahayakan di jl belitung darat", lat: -3.3155, lng: 114.5782, pseudo: "Warga B" },
      { text: "Belitung darat jalannya rusak parah tolong ditambal", lat: -3.3148, lng: 114.5778, pseudo: "Warga C" }
    ];
    for (const r of reports) {
      const res = await intake({
        text: r.text,
        source: "x",
        latitude: r.lat,
        longitude: r.lng,
        reporterPseudo: r.pseudo,
        imageBefore: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?q=80&w=600"
      }, "web-form");
      results.push(res);
    }
    return c.json({ ok: true, results });
  }

  if (scenario === "low_confidence") {
    const res = await intake({
      text: "Ada masalah lingkungan yang kurang mengenakkan di daerah ini.",
      source: "whatsapp",
      latitude: -3.332,
      longitude: 114.595,
      reporterPseudo: "Anonim",
      imageBefore: "https://images.unsplash.com/photo-1595841696660-1d965503a552?q=80&w=600"
    }, "whatsapp-bot");
    return c.json(res);
  }

  if (scenario === "sla_escalated") {
    const res = await intake({
      text: "Lampu jalan mati dekat simpang empat pramuka",
      source: "x",
      latitude: -3.328,
      longitude: 114.615,
      reporterPseudo: "Warga Pramuka",
      imageBefore: "https://images.unsplash.com/photo-1509099836639-18ba1795216d?q=80&w=600"
    }, "web-form");
    
    if (res.ok) {
      const reportId = res.report.id;
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString();
      await sql`UPDATE reports SET created_at = ${threeDaysAgo}, sla_due = ${twoDaysAgo}, status = 'diteruskan', dinas_id = 'd-dishub' WHERE id = ${reportId}`;
      await sql`INSERT INTO sla_events ${sql({ id: id("sla"), report_id: reportId, status: "diteruskan", note: "force route for SLA test", actor: "operator", created_at: threeDaysAgo })}`;
    }
    return c.json(res);
  }

  return c.json({ error: "unknown scenario" }, 400);
});


await migrate();
const server = Bun.serve({ port: Number(process.env.PORT || 3001), fetch: app.fetch });
console.log(`SAMBAT API listening on :${server.port}`);
