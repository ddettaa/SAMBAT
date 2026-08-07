import { SQL } from "bun";
import { randomUUID } from "node:crypto";
import { processSla } from "./src/worker";

const sql = new SQL(process.env.DATABASE_URL!);
const suffix = randomUUID();
const near = `near-${suffix}`;
const late = `late-${suffix}`;
const base = {
  source: "web", text_original: "uji SLA", text_normalized: "uji SLA", category: "jalan",
  status: "diteruskan", priority: 50, priority_detail: JSON.stringify({ method: "test" }),
  confirmation_token_hash: "test",
};
await sql`INSERT INTO reports ${sql({ ...base, id: near, sla_due: new Date(Date.now() + 12 * 3600_000) })}`;
await sql`INSERT INTO reports ${sql({ ...base, id: late, sla_due: new Date(Date.now() - 3600_000) })}`;

let result = await processSla(sql);
if (result.reminders < 1 || result.escalations < 1) throw new Error(`worker did not process SLA: ${JSON.stringify(result)}`);
result = await processSla(sql);
if (result.reminders !== 0 || result.escalations !== 0) throw new Error(`worker not idempotent: ${JSON.stringify(result)}`);
const events = await sql`SELECT report_id, status FROM sla_events WHERE report_id IN (${near},${late}) ORDER BY report_id`;
if (!events.some((e: any) => e.report_id === near && e.status === "sla_reminder")) throw new Error("reminder event missing");
if (!events.some((e: any) => e.report_id === late && e.status === "sla_escalated")) throw new Error("escalation event missing");
await sql`DELETE FROM reports WHERE id IN (${near},${late})`;
await sql.close();
console.log("SLA WORKER TEST PASSED");
