import { Hono } from "hono";
import { cors } from "hono/cors";
import { sql, migrate, audit, id, token, tokenHash } from "./db";
import { PILOT_CONFIG, calculatePriority } from "./config";
import { requireRoles } from "./auth";

const AI_URL = process.env.AI_URL || "http://localhost:8000";
const CATEGORIES = ["sampah", "drainase", "jalan", "lampu", "lainnya"];
const DINAS_BY_CATEGORY: Record<string, string> = {
  sampah: "d-dlh", drainase: "d-pupr", jalan: "d-pupr", lampu: "d-dishub",
};
// Legal state machine — every transition below is explicit; anything else is rejected.
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

async function aiClassify(text: string) {
  try {
    const res = await fetch(`${AI_URL}/classify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null; // AI unreachable → report still stored, flagged for operator review
  }
}

function priorityFor(ai: any, reportCount: number, hoursOpen: number, hasLocation: boolean) {
  return calculatePriority({
    U: URGENCY_UTILITY[ai?.urgency] ?? (ai?.confidence >= PILOT_CONFIG.reviewConfidence ? 75 : 25),
    D: Math.min(100, reportCount * 25),
    V: (hasLocation ? 50 : 0) + (ai?.words_changed > 0 ? 50 : 0),
    T: Math.min(100, Math.floor(hoursOpen / 24) * 25),
    R: 25, // one-area default; recomputed from PostGIS once operator verifies affected area
  });
}

const PUBLIC_FIELDS = ["id", "category", "location_text", "status", "priority", "dinas_id", "sla_due", "created_at"];
const pickPublic = (row: any) => Object.fromEntries(PUBLIC_FIELDS.map((k) => [k, row[k]]));

// ─── health ──────────────────────────────────────────────────
app.get("/api/health", (c) => c.json({ ok: true, service: "api", uptime: process.uptime() }));

// ─── intake (collector/operator only) ────────────────────────
app.post("/api/reports", requireRoles("collector", "operator"), async (c) => {
  const body = await c.req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text || text.length < 3) return c.json({ error: "text required (min 3 chars)" }, 400);
  if (text.length > 5000) return c.json({ error: "text too long (max 5000)" }, 400);
  const source = ["x", "instagram", "whatsapp", "web"].includes(body.source) ? body.source : "web";
  const lat = Number(body.latitude), lng = Number(body.longitude);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

  const ai = await aiClassify(text);
  const category = CATEGORIES.includes(ai?.category) ? ai.category : "lainnya";
  const locationText = (ai?.location || body.locationText || null) as string | null;

  // Automatic dedup: fuzzy text (pg_trgm) within radius (PostGIS) and time window.
  let duplicateCount = 1;
  const similar = await sql`
    SELECT id FROM reports
    WHERE category = ${category}
      AND status NOT IN ('selesai','ditolak')
      AND created_at > now() - (${PILOT_CONFIG.dedupWindowDays} || ' days')::interval
      AND similarity(text_normalized, ${ai?.normalized || text}) > ${PILOT_CONFIG.dedupSimilarity}
      ${hasCoords ? sql`AND geom IS NOT NULL AND ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint(${lng},${lat}),4326)::geography, ${PILOT_CONFIG.dedupRadiusMeters})` : sql``}
  `;
  duplicateCount = similar.length + 1;

  const priority = priorityFor(ai, duplicateCount, 0, Boolean(locationText || hasCoords));
  const rid = id("rpt");
  const confirmation = token();

  const [row] = await sql`
    INSERT INTO reports ${sql({
      id: rid, source, source_ref: body.sourceRef || null,
      text_original: text, text_normalized: ai?.normalized || text,
      category, location_text: locationText,
      confidence: ai?.confidence ?? null, ai_model: ai?.model || null,
      ai_reasoning: ai?.reasoning || null, ai_used: Boolean(ai?.llm_used),
      status: "terdeteksi", priority: priority.score,
      priority_detail: JSON.stringify(priority),
      reporter_pseudo: body.reporterPseudo || null,
      confirmation_token_hash: tokenHash(confirmation),
    })}
    RETURNING *
  `;
  if (hasCoords) {
    await sql`UPDATE reports SET geom = ST_SetSRID(ST_MakePoint(${lng},${lat}),4326) WHERE id = ${rid}`;
  }
  await sql`INSERT INTO sla_events ${sql({ id: id("sla"), report_id: rid, status: "terdeteksi", note: "laporan diterima", actor: "ai" })}`;
  await audit("create", "report", rid, c.get("actor").name, { category, duplicateCount });

  // If similar reports exist, group them into a collective case automatically.
  if (similar.length > 0) {
    const ids = [rid, ...similar.map((s: any) => s.id)];
    const caseScore = calculatePriority({ U: 50, D: Math.min(100, ids.length * 25), V: 50, T: 0, R: 50 });
    await sql.begin(async (tx) => {
      await tx`INSERT INTO cases ${tx({
        id: id("case"), title: `Kasus ${category} — ${ids.length} laporan`,
        report_ids: JSON.stringify(ids), report_count: ids.length,
        score: caseScore.score, category, status: "terverifikasi",
      })}`;
      for (const reportId of ids) {
        await tx`UPDATE reports SET status = 'terverifikasi', updated_at = now() WHERE id = ${reportId} AND status = 'terdeteksi'`;
      }
    });
  }

  return c.json({ ...row, confirmationToken: confirmation, priority_detail: priority }, 201);
});

// ─── list / detail (operator/dinas) ──────────────────────────
app.get("/api/reports", requireRoles("operator", "dinas"), async (c) => {
  const category = c.req.query("category");
  const status = c.req.query("status");
  const limitRaw = parseInt(c.req.query("limit") || "50");
  if (!Number.isInteger(limitRaw) || limitRaw < 1 || limitRaw > 100) return c.json({ error: "limit must be 1..100" }, 400);
  const rows = await sql`
    SELECT * FROM reports
    WHERE (${category ?? null}::text IS NULL OR category = ${category ?? null})
      AND (${status ?? null}::text IS NULL OR status = ${status ?? null})
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

// ─── status transition (operator/dinas) ──────────────────────
app.post("/api/reports/:id/status", requireRoles("operator", "dinas"), async (c) => {
  const body = await c.req.json().catch(() => null);
  const next = body?.status;
  const [row] = await sql`SELECT status FROM reports WHERE id = ${c.req.param("id")}`;
  if (!row) return c.json({ error: "not found" }, 404);
  if (!TRANSITIONS[row.status]?.includes(next)) {
    return c.json({ error: `illegal transition ${row.status} → ${next}`, allowed: TRANSITIONS[row.status] }, 409);
  }
  const who = c.get("actor").name;
  await sql`UPDATE reports SET status = ${next}, updated_at = now() WHERE id = ${c.req.param("id")}`;
  await sql`INSERT INTO sla_events ${sql({ id: id("sla"), report_id: c.req.param("id"), status: next, note: body?.note || null, actor: who })}`;
  await audit("status", "report", c.req.param("id"), who, { from: row.status, to: next });
  return c.json({ id: c.req.param("id"), status: next });
});

// ─── routing (operator only, dinas must exist) ───────────────
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
  await sql`INSERT INTO sla_events ${sql({ id: id("sla"), report_id: c.req.param("id"), status: "diteruskan", note: `routed ke ${dinasId} (SLA ${slaHours}h)`, actor: c.get("actor").name })}`;
  await audit("route", "report", c.req.param("id"), c.get("actor").name, { dinasId, slaHours });
  return c.json({ id: c.req.param("id"), dinasId, slaDue, status: "diteruskan" });
});

// ─── auto-route by category (operator) — 'lainnya' stays in operator queue ─
app.post("/api/reports/:id/auto-route", requireRoles("operator"), async (c) => {
  const [report] = await sql`SELECT status, category FROM reports WHERE id = ${c.req.param("id")}`;
  if (!report) return c.json({ error: "not found" }, 404);
  const dinasId = DINAS_BY_CATEGORY[report.category];
  if (!dinasId) return c.json({ error: "kategori 'lainnya' butuh routing manual operator" }, 409);
  const slaHours = PILOT_CONFIG.slaHours[report.category as keyof typeof PILOT_CONFIG.slaHours];
  const slaDue = new Date(Date.now() + slaHours * 3600 * 1000).toISOString();
  await sql`UPDATE reports SET dinas_id = ${dinasId}, sla_due = ${slaDue}, status = 'diteruskan', updated_at = now() WHERE id = ${c.req.param("id")}`;
  await sql`INSERT INTO sla_events ${sql({ id: id("sla"), report_id: c.req.param("id"), status: "diteruskan", note: `auto-route ${report.category} → ${dinasId}`, actor: "ai" })}`;
  await audit("auto-route", "report", c.req.param("id"), c.get("actor").name, { dinasId });
  return c.json({ id: c.req.param("id"), dinasId, slaDue, status: "diteruskan" });
});

// ─── citizen confirmation (ownership token, no role key) ──────
app.post("/api/reports/:id/confirm", async (c) => {
  const body = await c.req.json().catch(() => null);
  const supplied = typeof body?.token === "string" ? body.token : "";
  const [row] = await sql`SELECT status, confirmation_token_hash FROM reports WHERE id = ${c.req.param("id")}`;
  if (!row) return c.json({ error: "not found" }, 404);
  if (!supplied || tokenHash(supplied) !== row.confirmation_token_hash) return c.json({ error: "invalid confirmation token" }, 403);
  if (row.status !== "menunggu_konfirmasi") return c.json({ error: `belum siap dikonfirmasi (status ${row.status})` }, 409);
  await sql`UPDATE reports SET status = 'selesai', updated_at = now() WHERE id = ${c.req.param("id")}`;
  await sql`INSERT INTO sla_events ${sql({ id: id("sla"), report_id: c.req.param("id"), status: "selesai", note: "dikonfirmasi warga", actor: "warga" })}`;
  await audit("confirm", "report", c.req.param("id"), "warga", {});
  return c.json({ id: c.req.param("id"), status: "selesai" });
});

// ─── cases (read-only; created automatically at intake) ──────
app.get("/api/cases", requireRoles("operator", "dinas"), async (c) => {
  return c.json(await sql`SELECT * FROM cases ORDER BY score DESC, created_at DESC`);
});

// ─── audit trail (operator) ──────────────────────────────────
app.get("/api/audit", requireRoles("operator"), async (c) => {
  return c.json(await sql`SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 200`);
});

// ─── dashboards ──────────────────────────────────────────────
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

await migrate();
const server = Bun.serve({ port: Number(process.env.PORT || 3001), fetch: app.fetch });
console.log(`SAMBAT API listening on :${server.port}`);
