import type { Context, Next } from "hono";
import { timingSafeEqual } from "node:crypto";

export type Role = "collector" | "operator" | "dinas";

export type NamedIdentity = {
  role: Role;
  name: string;
};

export type KeyEntry = { name: string; hash: string };

// Keys come from environment. Production can swap this for a DB-backed identity map.
const envKeys: Record<Role, KeyEntry | null> = {
  collector: envKey(process.env.COLLECTOR_API_KEY),
  operator: envKey(process.env.OPERATOR_API_KEY),
  dinas: envKey(process.env.DINAS_API_KEY),
};

function envKey(raw: string | undefined) {
  if (!raw) return null;
  return { name: "operator", hash: raw };
}

function equal(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function actor(c: Context): NamedIdentity | null {
  const supplied = c.req.header("x-api-key") || c.req.header("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!supplied) return null;
  for (const [role, entry] of Object.entries(envKeys) as [Role, KeyEntry | null][]) {
    if (entry && equal(supplied, entry.hash)) {
      return { role, name: entry.name };
    }
  }
  return null;
}

export function requireRoles(...roles: Role[]) {
  return async (c: Context, next: Next) => {
    const identity = actor(c);
    if (!identity) return c.json({ error: "unauthorized" }, 401);
    if (!roles.includes(identity.role)) return c.json({ error: "forbidden" }, 403);
    c.set("actor", identity);
    await next();
  };
}
