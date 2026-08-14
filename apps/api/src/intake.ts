import { sql, id, token, tokenHash, audit } from "./db";
import { PILOT_CONFIG, calculatePriority } from "./config";
import { inCityBounds, resolveAdmin, floodUrgency, riskScore } from "./geo";
import { createHash } from "crypto";

const CATEGORIES = ["sampah", "drainase", "jalan", "lampu", "lainnya"];

const URGENCY_UTILITY: Record<string, number> = { low: 25, medium: 50, high: 75, critical: 100 };

export function priorityFor(ai: any, reportCount: number, hoursOpen: number, hasLocation: boolean, flood: number | null, risk?: number | null) {
  return calculatePriority({
    U: URGENCY_UTILITY[ai?.urgency] ?? (ai?.confidence >= PILOT_CONFIG.reviewConfidence ? 75 : 25),
    D: Math.min(100, reportCount * 25),
    V: (hasLocation ? 50 : 0) + (ai?.words_changed > 0 ? 50 : 0),
    T: Math.min(100, Math.floor(hoursOpen / 24) * 25),
    // R prefers the category-aware risk score; flood urgency is the legacy fallback.
    R: risk != null ? risk : flood != null ? Math.min(100, flood * 10) : 25,
  });
}

export type IntakeResult =
  | { ok: true; report: any; confirmationToken: string; priorityDetail: any; riskDetail?: any }
  | { ok: false; status: number; error: string };

export async function intake(body: any, actorName: string): Promise<IntakeResult> {
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text || text.length < 3) return { ok: false, status: 400, error: "text required (min 3 chars)" };
  if (text.length > 5000) return { ok: false, status: 400, error: "text too long (max 5000)" };

  const source = ["x", "instagram", "whatsapp", "web"].includes(body.source) ? body.source : "web";
  const sourceRef = body.sourceRef ? String(body.sourceRef).slice(0, 255) : null;
  if (sourceRef && !/^[A-Za-z0-9_-]+$/.test(sourceRef)) return { ok: false, status: 400, error: "sourceRef must be alphanumeric/_-" };

  // Idempotency: same source + source_ref returns the original, never duplicates.
  if (sourceRef) {
    const [existing] = await sql`SELECT * FROM reports WHERE source = ${source} AND source_ref = ${sourceRef}`;
    if (existing) return { ok: true, report: existing, confirmationToken: "", priorityDetail: null };
  }

  const rawLat = Number(body.latitude);
  const rawLng = Number(body.longitude);
  const hasCoords = Number.isFinite(rawLat) && Number.isFinite(rawLng);
  const lat = hasCoords ? rawLat : null;
  const lng = hasCoords ? rawLng : null;
  if (hasCoords && (lat! < -90 || lat! > 90 || lng! < -180 || lng! > 180)) {
    return { ok: false, status: 400, error: "coordinates out of range" };
  }
  let inCity = false;
  if (hasCoords) {
    inCity = inCityBounds(lat!, lng!);
  }

  const ai = await aiClassify(text);
  const category = CATEGORIES.includes(ai?.category) ? ai.category : "lainnya";
  const locationText = (ai?.location || body.locationText || null) as string | null;

  // Resolve administrative area + flood urgency from official geoportal data.
  let kelurahan: string | null = null;
  let kecamatan: string | null = null;
  let flood: number | null = null;
  if (hasCoords && inCity) {
    const admin = await resolveAdmin(lat!, lng!);
    kelurahan = admin.kelurahan;
    kecamatan = admin.kecamatan;
    flood = await floodUrgency(kelurahan);
  }
  // Category-aware risk (kriteria R) — hazard profile matched to the complaint type.
  const risk = await riskScore(kelurahan, category);

  const normText = ai?.normalized || text;
  const embedding = (await aiEmbed(normText)) || getFallbackEmbedding(normText);
  const embeddingStr = `[${embedding.join(",")}]`;

  const similar = await sql`
    SELECT id, ST_Y(geom)::float as lat, ST_X(geom)::float as lng FROM reports
    WHERE category = ${category}
      AND status NOT IN ('selesai','ditolak')
      AND created_at > now() - (${PILOT_CONFIG.dedupWindowDays} || ' days')::interval
      AND (
        similarity(text_normalized, ${normText}) > ${PILOT_CONFIG.dedupSimilarity}
        OR (embedding IS NOT NULL AND 1 - (embedding <=> ${embeddingStr}::vector) > ${PILOT_CONFIG.dedupSimilarity})
      )
      ${hasCoords ? sql`AND geom IS NOT NULL AND ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint(${lng},${lat}),4326)::geography, ${PILOT_CONFIG.dedupRadiusMeters})` : sql``}
  `;
  const duplicateCount = similar.length + 1;

  const priority = priorityFor(ai, duplicateCount, 0, Boolean(locationText || hasCoords), flood, risk.score);
  const rid = id("rpt");
  const confirmation = token();
  const confirmationExpires = new Date(Date.now() + PILOT_CONFIG.confirmationTtlHours * 3600 * 1000).toISOString();

  // Everything in one transaction: report + geom + sla event + audit + case.
  try {
    await sql.begin(async (tx) => {
      await tx`INSERT INTO reports ${tx({
        id: rid, source, source_ref: sourceRef,
        text_original: text, text_normalized: ai?.normalized || text,
        category, location_text: locationText,
        confidence: ai?.confidence ?? null, ai_model: ai?.model || null,
        ai_reasoning: ai?.reasoning || null, ai_used: Boolean(ai?.llm_used),
        ai_failure_reason: ai?.failure_reason ?? null,
        status: "terdeteksi", priority: priority.score,
        priority_detail: JSON.stringify(priority),
        reporter_pseudo: body.reporterPseudo || null,
        confirmation_token_hash: tokenHash(confirmation),
        confirmation_expires_at: confirmationExpires,
        kelurahan, kecamatan, flood_urgency: flood,
        image_before: body.imageBefore || null,
        embedding: embeddingStr,
      })}`;

      if (hasCoords) {
        await tx`UPDATE reports SET geom = ST_SetSRID(ST_MakePoint(${lng},${lat}),4326) WHERE id = ${rid}`;
      }

      await tx`INSERT INTO sla_events ${tx({ id: id("sla"), report_id: rid, status: "terdeteksi", note: "laporan diterima", actor: "ai" })}`;
      await tx`INSERT INTO audit_log ${tx({ id: id("audit"), action: "create", entity_type: "report", entity_id: rid, actor: actorName, detail: JSON.stringify({ category, duplicateCount }) })}`;

      // Group similar reports into ONE collective case — never a new case per report.
      if (similar.length > 0) {
        const similarIds = similar.map((s: any) => s.id);
        // Bun's SQL driver mangles JS arrays in ANY() — fetch candidates and filter in JS (pilot scale).
        const candidates = await tx`SELECT id, report_ids FROM cases WHERE category = ${category} AND status = 'terverifikasi'`;
        const existingCase = candidates.find((c: any) => {
          const ids = typeof c.report_ids === "string" ? JSON.parse(c.report_ids) : c.report_ids;
          return ids.some((rid: string) => similarIds.includes(rid));
        });
        const allIds = [rid, ...similarIds];
        const caseScore = calculatePriority({
          U: 50,
          D: Math.min(100, allIds.length * 25),
          V: 50,
          T: 0,
          // Keep case ranking aligned with the category-aware report score.
          R: risk.score != null ? risk.score : flood != null ? Math.min(100, flood * 10) : 25,
        });

        // Calculate average centroid coordinates
        const coords = [];
        if (hasCoords) coords.push({ lat, lng });
        for (const s of similar) {
          if (s.lat && s.lng) coords.push({ lat: Number(s.lat), lng: Number(s.lng) });
        }
        const hasCentroid = coords.length > 0;
        const avgLat = hasCentroid ? coords.reduce((sum, c) => sum + c.lat!, 0) / coords.length : null;
        const avgLng = hasCentroid ? coords.reduce((sum, c) => sum + c.lng!, 0) / coords.length : null;

        if (existingCase) {
          const merged = [...new Set([...existingCase.report_ids, ...allIds])];
          await tx`UPDATE cases SET report_ids = ${JSON.stringify(merged)}, report_count = ${merged.length}, score = ${caseScore.score}, updated_at = now() WHERE id = ${existingCase.id}`;
          if (hasCentroid) {
            await tx`UPDATE cases SET centroid = ST_SetSRID(ST_MakePoint(${avgLng}, ${avgLat}), 4326) WHERE id = ${existingCase.id}`;
          }
          await tx`UPDATE reports SET status = 'terverifikasi', updated_at = now() WHERE id = ${rid} AND status = 'terdeteksi'`;
        } else {
          const newCaseId = id("case");
          await tx`INSERT INTO cases (id, title, report_ids, report_count, score, category, status) VALUES (${newCaseId}, ${`Kasus ${category} — ${allIds.length} laporan`}, ${JSON.stringify(allIds)}, ${allIds.length}, ${caseScore.score}, ${category}, 'terverifikasi')`;
          if (hasCentroid) {
            await tx`UPDATE cases SET centroid = ST_SetSRID(ST_MakePoint(${avgLng}, ${avgLat}), 4326) WHERE id = ${newCaseId}`;
          }
          for (const reportId of allIds) {
            await tx`UPDATE reports SET status = 'terverifikasi', updated_at = now() WHERE id = ${reportId} AND status = 'terdeteksi'`;
          }
        }
      }
    });
  } catch (error: any) {
    if (String(error?.message || "").includes("duplicate key")) {
      const [existing] = await sql`SELECT * FROM reports WHERE source = ${source} AND source_ref = ${sourceRef}`;
      if (existing) return { ok: true, report: existing, confirmationToken: "", priorityDetail: null };
    }
    throw error;
  }

  const [report] = await sql`SELECT * FROM reports WHERE id = ${rid}`;
  return { ok: true, report, confirmationToken: confirmation, priorityDetail: priority, riskDetail: risk.detail };
}

async function aiClassify(text: string) {
  try {
    const res = await fetch(`${process.env.AI_URL || "http://localhost:8000"}/classify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) return { failure_reason: `ai_http_${res.status}` };
    const data = await res.json();
    return { ...data, failure_reason: null };
  } catch (error: any) {
    return { failure_reason: String(error?.name || "ai_unreachable") };
  }
}

async function aiEmbed(text: string): Promise<number[] | null> {
  try {
    const res = await fetch(`${process.env.AI_URL || "http://localhost:8000"}/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.embedding || null;
  } catch (error) {
    return null;
  }
}

function getFallbackEmbedding(text: string): number[] {
  const vec = new Array(384).fill(0);
  const words = text.toLowerCase().split(/\s+/);
  if (words.length === 0 || words[0] === "") {
    vec[0] = 1.0;
    return vec;
  }
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const hash = createHash("sha256").update(word, "utf-8").digest();
    for (let j = 0; j < hash.length; j++) {
      const dim = (i * 31 + j) % 384;
      const val = (hash[j] - 127.5) / 127.5;
      vec[dim] += val;
    }
  }
  let sqSum = 0;
  for (const val of vec) {
    sqSum += val * val;
  }
  if (sqSum > 0) {
    const norm = Math.sqrt(sqSum);
    for (let i = 0; i < vec.length; i++) {
      vec[i] /= norm;
    }
  }
  return vec;
}
