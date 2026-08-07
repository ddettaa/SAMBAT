import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

app.use("*", cors());

app.get("/api/health", (c) => c.json({ ok: true, service: "api", uptime: process.uptime() }));

// TODO: reports, cases, dashboard, auth routes (see PRD section 5)

const server = Bun.serve({
  port: 3001,
  fetch: app.fetch,
});

console.log(`SAMBAT API listening on :${server.port}`);
