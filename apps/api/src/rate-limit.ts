const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count += 1;
  return true;
}

export function rateLimitMiddleware(max: number, windowMs: number) {
  return async (c: any, next: any) => {
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || c.req.header("x-real-ip") || "unknown";
    const path = c.req.path;
    const key = `${path}:${ip}`;
    if (!rateLimit(key, max, windowMs)) {
      return c.json({ error: "rate limit exceeded" }, 429);
    }
    await next();
  };
}
