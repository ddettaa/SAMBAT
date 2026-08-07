import { sql } from "./db";

export type Notification = {
  reportId: string;
  type: string;
  channel: string;
  to: string;
  subject: string;
  body: string;
};

export async function collectNotifications() {
  const rows = await sql`
    SELECT r.id, r.dinas_id, r.status, s.note, s.created_at
    FROM sla_events s
    JOIN reports r ON r.id = s.report_id
    WHERE s.status IN ('sla_reminder','sla_escalated')
      AND s.created_at > now() - interval '10 minutes'
    ORDER BY s.created_at DESC
  `;
  const result: Notification[] = [];
  for (const row of rows) {
    const to = row.dinas_id ?? "operator";
    result.push({
      reportId: row.id,
      type: row.status,
      channel: "dashboard",
      to,
      subject: row.status === "sla_reminder" ? "SLA mendekati tenggat" : "SLA terlewat — eskalasi",
      body: `${row.status} untuk laporan ${row.id}: ${row.note ?? ""}`,
    });
  }
  return result;
}

export async function deliver(notification: Notification) {
  const channel = notification.channel;
  if (channel === "dashboard") {
    await sql`INSERT INTO notifications ${sql({
      id: `ntf_${crypto.randomUUID()}`,
      report_id: notification.reportId,
      channel: notification.channel,
      recipient: notification.to,
      subject: notification.subject,
      body: notification.body,
      status: "pending",
    })}`;
    return true;
  }
  if (channel === "webhook") {
    const url = process.env.NOTIFY_WEBHOOK_URL;
    if (!url) return false;
    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notification),
        signal: AbortSignal.timeout(10_000),
      });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
