import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { sql } from "../src/db";

const root = new URL(".", import.meta.url).pathname;

async function files(dir: string) {
  return (await readdir(dir)).filter((name) => /^\d+_.*\.sql$/.test(name)).sort();
}

async function main() {
  await sql.unsafe(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  for (const file of await files(join(root, "migrations"))) {
    const version = file.split("_", 1)[0];
    const [seen] = await sql`SELECT version FROM schema_migrations WHERE version = ${version}`;
    if (seen) continue;
    await sql.begin(async (tx) => {
      await tx.unsafe(await Bun.file(join(root, "migrations", file)).text());
      await tx`INSERT INTO schema_migrations (version) VALUES (${version})`;
    });
    console.log(`migration ${version} applied`);
  }
}

if (import.meta.main) {
  await main();
  await sql.close();
}

export { main };
