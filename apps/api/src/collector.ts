import { sql, id } from "./db";
import { intake } from "./intake";

export async function runCollectorOnce() {
  const source = process.env.COLLECTOR_SOURCE || "webhook";
  const result = { ingested: 0, skipped: 0, failed: 0 };

  if (source === "webhook") {
    // Webhook inbox: pending submissions the API accepted are stored in collector_inbox.
    const pending = await sql`SELECT * FROM collector_inbox WHERE status = 'pending' ORDER BY created_at LIMIT 20`;
    for (const item of pending) {
      try {
        const res = await intake(
          {
            text: item.text,
            source: item.source,
            sourceRef: item.source_ref,
            locationText: item.location_text,
            latitude: item.latitude,
            longitude: item.longitude,
            reporterPseudo: item.reporter_pseudo,
          },
          "collector",
        );
        if (res.ok) {
          await sql`UPDATE collector_inbox SET status = 'ingested' WHERE id = ${item.id}`;
          result.ingested++;
        } else {
          await sql`UPDATE collector_inbox SET status = 'failed', error = ${res.error} WHERE id = ${item.id}`;
          result.failed++;
        }
      } catch {
        await sql`UPDATE collector_inbox SET status = 'failed', error = 'exception' WHERE id = ${item.id}`;
        result.failed++;
      }
    }
  }

  return result;
}

export async function enqueueWebhook(body: any) {
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text || text.length < 3) return { ok: false, status: 400, error: "text required" };
  const source = ["x", "instagram", "whatsapp", "web"].includes(body.source) ? body.source : "web";
  const sourceRef = body.sourceRef ? String(body.sourceRef).slice(0, 255) : null;
  if (sourceRef && !/^[A-Za-z0-9_-]+$/.test(sourceRef)) return { ok: false, status: 400, error: "sourceRef must be alphanumeric/_-" };
  const [existing] = await sql`SELECT id, status FROM collector_inbox WHERE source = ${source} AND source_ref = ${sourceRef}`;
  if (existing) return { ok: true, report: { id: existing.id, status: existing.status }, confirmationToken: "", priorityDetail: null };
  await sql`INSERT INTO collector_inbox ${sql({
    id: id("cib"), source, source_ref: sourceRef,
    text, location_text: body.locationText || null,
    latitude: Number.isFinite(Number(body.latitude)) ? Number(body.latitude) : null,
    longitude: Number.isFinite(Number(body.longitude)) ? Number(body.longitude) : null,
    reporter_pseudo: body.reporterPseudo || null,
    status: "pending",
  })}`;
  return { ok: true, report: { status: "pending" }, confirmationToken: "", priorityDetail: null };
}

export async function syncInbox() {
  const pending = await sql`SELECT count(*)::int AS c FROM collector_inbox WHERE status = 'pending'`;
  return { pending: pending[0].c };
}
