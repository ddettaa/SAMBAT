import { join } from "node:path";
import { sql } from "../src/db";
import { main as migrate } from "./migrate";

async function seed() {
  await migrate();
  const root = import.meta.dir;
  for (const file of (await Array.fromAsync(new Bun.Glob("*.sql").scan({ cwd: join(root, "seeders"), onlyFiles: true }))).sort()) {
    await sql.unsafe(await Bun.file(join(root, "seeders", file)).text());
    console.log(`seeder ${file} applied`);
  }
}

if (import.meta.main) {
  await seed();
  await sql.close();
}

export { seed };
