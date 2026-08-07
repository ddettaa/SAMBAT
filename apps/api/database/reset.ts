import { sql } from "../src/db";
import { seed } from "./seed";

if (process.env.ALLOW_DB_RESET !== "1") throw new Error("set ALLOW_DB_RESET=1 to reset database");
await sql.unsafe(`
  DROP SCHEMA public CASCADE;
  CREATE SCHEMA public;
  GRANT ALL ON SCHEMA public TO public;
`);
await seed();
await sql.close();
console.log("database reset complete");
