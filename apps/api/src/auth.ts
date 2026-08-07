import type { Context, Next } from "hono";
import { timingSafeEqual } from "node:crypto";

export type Role = "collector" | "operator" | "dinas";

const keys: Record<Role, string> = {
  collector: process.env.COLLECTOR_API_KEY || "",
  operator: process.env.OPERATOR_API_KEY || "",
  dinas: process.env.DINAS_API_KEY || "",
};

function equal(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function actor(c: Context): { role: Role; name: string } | null {
  const supplied = c.req.header("x-api-key") || c.req.header("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!supplied) return null;
  for (const [role, expected] of Object.entries(keys) as [Role, string][]) {
    if (expected && equal(supplied, expected)) return { role, name: role };
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
