import { SQL } from "bun";
import { createHash, randomBytes, randomUUID } from "node:crypto";

const DATABASE_URL = process.env.DATABASE_URL || "postgres://sambat:***@localhost:5432/sambat";
export const sql = new SQL(DATABASE_URL);
export const id = (prefix: string) => `${prefix}_${randomUUID()}`;
export const token = () => randomBytes(24).toString("base64url");
export const tokenHash = (value: string) => createHash("sha256").update(value).digest("hex");

export async function migrate() {
  const { main } = await import("../database/migrate");
  await main();
  for (const [role, raw] of Object.entries({
    collector: process.env.COLLECTOR_API_KEY,
    operator: process.env.OPERATOR_API_KEY,
    dinas: process.env.DINAS_API_KEY,
  })) {
    if (!raw) continue;
    await sql`
      INSERT INTO api_keys (id, role, name, key_hash, created_by)
      VALUES (${`env-${role}`}, ${role}, ${`${role}-env`}, ${tokenHash(raw)}, 'bootstrap')
      ON CONFLICT (id) DO NOTHING
    `;
  }
}

export async function audit(action: string, entityType: string, entityId: string, actor: string, detail: unknown = {}) {
  await sql`INSERT INTO audit_log ${sql({
    id: id("audit"), action, entity_type: entityType, entity_id: entityId, actor,
    detail: JSON.stringify(detail),
  })}`;
}
