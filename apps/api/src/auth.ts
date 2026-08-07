import type { Context, Next } from "hono";
import { timingSafeEqual, createHash } from "node:crypto";
import { sql } from "./db";

export type Role = "collector" | "operator" | "dinas";
export type NamedIdentity = { role: Role; name: string; keyId: string };

export const keyHash = (value: string) => createHash("sha256").update(value).digest("hex");

function equal(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function authenticate(c: Context): Promise<NamedIdentity | null> {
  const supplied = c.req.header("x-api-key") || c.req.header("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!supplied) return null;
  const hash = keyHash(supplied);
  const rows = await sql`
    SELECT id, role, name, key_hash FROM api_keys
    WHERE key_hash = ${hash} AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > now())
    LIMIT 1
  `;
  const row = rows[0];
  if (!row || !equal(hash, row.key_hash)) return null;
  return { role: row.role as Role, name: row.name, keyId: row.id };
}

export function actor(c: Context): NamedIdentity | null {
  return c.get("actor") || null;
}

export function requireRoles(...roles: Role[]) {
  return async (c: Context, next: Next) => {
    const identity = await authenticate(c);
    if (!identity) return c.json({ error: "unauthorized" }, 401);
    if (!roles.includes(identity.role)) return c.json({ error: "forbidden" }, 403);
    c.set("actor", identity);
    await next();
  };
}
