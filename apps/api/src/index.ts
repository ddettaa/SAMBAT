import { Hono } from "hono";
import { cors } from "hono/cors";
import { getDb, migrate, newId } from "./db";

const app = new Hono();
app.use("*", cors());

const AI_URL = process.env.AI_URL || "http://localhost:8000";

// ─── helpers ────────────────────────────────────────────────

async function aiClassify(text: string) {
  try {
    const res = await fetch(`${AI_URL}/classify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null; // AI down → laporan tetap masuk, kategori default 'lainnya'
  }
}

const PRIORITY = { U: 30, D: 25, V: 20, T: 15, R: 10 };

function computePriority(ai: any, reportCount: number, hoursOpen: number): { score: number; detail: Record<string, number> } {
  const detail = {
    U: ai?.confidence && ai.confidence >= 0.8 ? 30 : 15, // urgensi dari confidence
    D: reportCount > 1 ? Math.min(25, 10 + reportCount * 5) : 0,
    V: ai?.words_changed && ai.words_changed > 0 ? 20 : 10, // bukti: ada normalisasi/lokasi
    T: Math.min(15, Math.floor(hoursOpen / 24) * 5),
    R: 10, // default dampak, diisi manual oleh operator
  };
  const score = detail.U + detail.D + detail.V + detail.T + detail.R;
  return { score, detail };
}

// ─── routes ─────────────────────────────────────────────────

app.get("/api/health", (c) => c.json({ ok: true, service: "api", uptime: process.uptime() }));

// POST /api/reports — terima laporan dari collector / form
app.post("/api/reports", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body?.text) return c.json({ error: "text required" }, 400);

  const db = getDb();
  const ai = await aiClassify(body.text);

  const id = newId("rpt");
  const created = new Date().toISOString();
  const report = {
    id,
    source: body.source || "web",
    source_ref: body.sourceRef || null,
    text_original: body.text,
    text_normalized: ai?.normalized || body.text,
    category: ai?.category || "lainnya",
    location_text: ai?.location || body.locationText || null,
    confidence: ai?.confidence ?? null,
    status: "terdeteksi",
    priority: 0,
    priority_detail: null,
    reporter_pseudo: body.reporterPseudo || null,
    dinas_id: null,
    sla_due: null,
    created_at: created,
  };

  db.query(
    `INSERT INTO reports (id, source, source_ref, text_original, text_normalized, category, location_text, confidence, status, priority, priority_detail, reporter_pseudo, dinas_id, sla_due, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    report.id, report.source, report.source_ref, report.text_original, report.text_normalized,
    report.category, report.location_text, report.confidence, report.status, report.priority,
    report.priority_detail, report.reporter_pseudo, report.dinas_id, report.sla_due, report.created_at
  );

  db.query(
    `INSERT INTO sla_events (id, report_id, status, note, actor, created_at) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(newId("sla"), id, "terdeteksi", "laporan diterima, menunggu verifikasi", "ai", created);

  return c.json(report, 201);
});

// GET /api/reports — list dengan filter
app.get("/api/reports", (c) => {
  const db = getDb();
  const category = c.req.query("category");
  const status = c.req.query("status");
  const limit = Math.min(100, parseInt(c.req.query("limit") || "50"));

  let sql = "SELECT * FROM reports";
  const where: string[] = [];
  const params: string[] = [];
  if (category) { where.push("category = ?"); params.push(category); }
  if (status) { where.push("status = ?"); params.push(status); }
  if (where.length) sql += " WHERE " + where.join(" AND ");
  sql += " ORDER BY created_at DESC LIMIT ?";
  params.push(String(limit));

  const rows = db.query(sql).all(...params);
  return c.json(rows);
});

// GET /api/reports/:id — detail + timeline
app.get("/api/reports/:id", (c) => {
  const db = getDb();
  const row = db.query("SELECT * FROM reports WHERE id = ?").get(c.req.param("id"));
  if (!row) return c.json({ error: "not found" }, 404);
  const timeline = db.query("SELECT * FROM sla_events WHERE report_id = ? ORDER BY created_at").all(c.req.param("id"));
  return c.json({ ...row, timeline });
});

// POST /api/reports/:id/status — update status (operator/dinas)
app.post("/api/reports/:id/status", async (c) => {
  const db = getDb();
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const status = body?.status;
  const valid = ["terdeteksi", "terverifikasi", "diteruskan", "dikerjakan", "menunggu_konfirmasi", "selesai", "ditolak"];
  if (!valid.includes(status)) return c.json({ error: `invalid status, use one of: ${valid.join(", ")}` }, 400);

  const now = new Date().toISOString();
  db.query("UPDATE reports SET status = ? WHERE id = ?").run(status, id);
  db.query(
    `INSERT INTO sla_events (id, report_id, status, note, actor, created_at) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(newId("sla"), id, status, body?.note || null, body?.actor || "operator", now);

  return c.json({ id, status });
});

// POST /api/reports/:id/confirm — konfirmasi warga → SELESAI
app.post("/api/reports/:id/confirm", (c) => {
  const db = getDb();
  const id = c.req.param("id");
  const now = new Date().toISOString();
  db.query("UPDATE reports SET status = 'selesai' WHERE id = ?").run(id);
  db.query(
    `INSERT INTO sla_events (id, report_id, status, note, actor, created_at) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(newId("sla"), id, "selesai", "dikonfirmasi warga", "warga", now);
  return c.json({ id, status: "selesai" });
});

// GET /api/cases — kasus kolektif
app.get("/api/cases", (c) => {
  const db = getDb();
  return c.json(db.query("SELECT * FROM cases ORDER BY created_at DESC").all());
});

// POST /api/cases — buat kasus kolektif dari laporan serupa
app.post("/api/cases", async (c) => {
  const db = getDb();
  const body = await c.req.json().catch(() => null);
  if (!body?.reportIds?.length) return c.json({ error: "reportIds required" }, 400);

  const id = newId("case");
  const now = new Date().toISOString();
  const reportIds = body.reportIds;
  const count = reportIds.length;

  // Ambil kategori dari laporan pertama
  const first = db.query("SELECT category FROM reports WHERE id = ?").get(reportIds[0]);
  const category = first?.category || "lainnya";

  // Skor prioritas dari jumlah laporan
  const detail = { U: 15, D: Math.min(25, 10 + count * 5), V: 10, T: 0, R: 10 };
  const score = detail.U + detail.D + detail.V + detail.T + detail.R;

  const kasus = {
    id,
    title: body.title || `Kasus ${category} — ${count} laporan`,
    report_ids: JSON.stringify(reportIds),
    report_count: count,
    score,
    category,
    status: "terverifikasi",
    created_at: now,
  };

  db.query(
    `INSERT INTO cases (id, title, report_ids, report_count, score, category, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(kasus.id, kasus.title, kasus.report_ids, kasus.report_count, kasus.score, kasus.category, kasus.status, kasus.created_at);

  // Update semua laporan yang tergabung
  for (const rid of reportIds) {
    db.query("UPDATE reports SET status = 'terverifikasi' WHERE id = ?").run(rid);
  }

  return c.json(kasus, 201);
});

// GET /api/dashboard/public — statistik publik
app.get("/api/dashboard/public", (c) => {
  const db = getDb();
  const total = db.query("SELECT count(*) as c FROM reports").get() as any;
  const byCategory = db.query(
    "SELECT category, count(*) as c FROM reports GROUP BY category ORDER BY c DESC"
  ).all();
  const byStatus = db.query(
    "SELECT status, count(*) as c FROM reports GROUP BY status ORDER BY c DESC"
  ).all();
  const open = db.query("SELECT count(*) as c FROM reports WHERE status NOT IN ('selesai','ditolak')").get() as any;
  return c.json({
    total: total?.c || 0,
    open: open?.c || 0,
    byCategory,
    byStatus,
  });
});

// GET /api/dashboard/operator — antrian review confidence < 0.8
app.get("/api/dashboard/operator", (c) => {
  const db = getDb();
  const queue = db.query(
    "SELECT * FROM reports WHERE confidence < 0.8 OR confidence IS NULL ORDER BY created_at DESC LIMIT 50"
  ).all();
  return c.json(queue);
});

// GET /api/dinas — list dinas
app.get("/api/dinas", (c) => {
  const db = getDb();
  const rows = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='dinas'").get();
  if (!rows) {
    // seed dinas ke sqlite
    db.query("CREATE TABLE IF NOT EXISTS dinas (id TEXT PRIMARY KEY, name TEXT NOT NULL, short TEXT NOT NULL UNIQUE)").run();
    const dinas = [
      ["d-pupr", "Dinas Pekerjaan Umum dan Penataan Ruang", "PUPR"],
      ["d-dlh", "Dinas Lingkungan Hidup", "DLH"],
      ["d-dishub", "Dinas Perhubungan", "DISHUB"],
      ["d-bpbd", "Badan Penanggulangan Bencana Daerah", "BPBD"],
    ];
    for (const [id, name, short] of dinas) {
      db.query("INSERT OR IGNORE INTO dinas (id, name, short) VALUES (?, ?, ?)").run(id, name, short);
    }
  }
  return c.json(db.query("SELECT * FROM dinas").all());
});

// POST /api/reports/:id/route — routing ke dinas
app.post("/api/reports/:id/route", async (c) => {
  const db = getDb();
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const dinasId = body?.dinasId;
  if (!dinasId) return c.json({ error: "dinasId required" }, 400);

  const now = new Date().toISOString();
  const slaDue = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(); // SLA 3 hari

  db.query("UPDATE reports SET dinas_id = ?, sla_due = ?, status = 'diteruskan' WHERE id = ?").run(dinasId, slaDue, id);
  db.query(
    `INSERT INTO sla_events (id, report_id, status, note, actor, created_at) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(newId("sla"), id, "diteruskan", `dirouting ke ${dinasId}`, "operator", now);

  return c.json({ id, dinasId, slaDue, status: "diteruskan" });
});

// POST /api/reports/:id/auto-route — routing otomatis berdasarkan kategori
app.post("/api/reports/:id/auto-route", (c) => {
  const db = getDb();
  const id = c.req.param("id");
  const row = db.query("SELECT category FROM reports WHERE id = ?").get(id) as any;
  if (!row) return c.json({ error: "not found" }, 404);

  const map: Record<string, string> = {
    sampah: "d-dlh",
    drainase: "d-pupr",
    jalan: "d-pupr",
    lampu: "d-dishub",
    lainnya: "d-pupr",
  };
  const dinasId = map[row.category] || "d-pupr";

  const now = new Date().toISOString();
  const slaDue = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();
  db.query("UPDATE reports SET dinas_id = ?, sla_due = ?, status = 'diteruskan' WHERE id = ?").run(dinasId, slaDue, id);
  db.query(
    `INSERT INTO sla_events (id, report_id, status, note, actor, created_at) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(newId("sla"), id, "diteruskan", `auto-routing: ${row.category} → ${dinasId}`, "ai", now);

  return c.json({ id, dinasId, slaDue, status: "diteruskan" });
});

const server = Bun.serve({
  port: Number(process.env.PORT || 3001),
  fetch: app.fetch,
});
console.log(`SAMBAT API listening on :${server.port}`);
