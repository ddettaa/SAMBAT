import type { SQL } from "bun";
import { audit, id } from "./db";

export async function processSla(db: SQL) {
  let reminders = 0;
  let escalations = 0;
  const dueSoon = await db`
    SELECT id, dinas_id FROM reports
    WHERE status IN ('diteruskan','dikerjakan')
      AND sla_due > now() AND sla_due <= now() + interval '24 hours'
      AND NOT EXISTS (SELECT 1 FROM sla_events WHERE report_id = reports.id AND status = 'sla_reminder')
  `;
  for (const row of dueSoon) {
    await db.begin(async (tx) => {
      await tx`INSERT INTO sla_events ${tx({ id: id("sla"), report_id: row.id, status: "sla_reminder", note: "SLA jatuh tempo dalam 24 jam", actor: "worker" })}`;
      await tx`INSERT INTO audit_log ${tx({ id: id("audit"), action: "sla-reminder", entity_type: "report", entity_id: row.id, actor: "worker", detail: JSON.stringify({ dinasId: row.dinas_id }) })}`;
    });
    reminders++;
  }
  const overdue = await db`
    SELECT id, dinas_id FROM reports
    WHERE status IN ('diteruskan','dikerjakan')
      AND sla_due < now()
      AND NOT EXISTS (SELECT 1 FROM sla_events WHERE report_id = reports.id AND status = 'sla_escalated')
  `;
  for (const row of overdue) {
    await db.begin(async (tx) => {
      await tx`INSERT INTO sla_events ${tx({ id: id("sla"), report_id: row.id, status: "sla_escalated", note: "SLA terlewat; perlu eskalasi operator", actor: "worker" })}`;
      await tx`INSERT INTO audit_log ${tx({ id: id("audit"), action: "sla-escalation", entity_type: "report", entity_id: row.id, actor: "worker", detail: JSON.stringify({ dinasId: row.dinas_id }) })}`;
    });
    escalations++;
  }
  return { reminders, escalations };
}

if (import.meta.main) {
  const { sql, migrate } = await import("./db");
  await migrate();
  console.log(JSON.stringify(await processSla(sql)));
  await sql.close();
}
