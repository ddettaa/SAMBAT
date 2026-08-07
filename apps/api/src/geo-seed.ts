// One-off script: fetch real admin + flood data from Geoportal and seed the DB.
import { sql, migrate } from "./db";
import { syncFloodFromGeoportal, syncGeoFromGeoportal } from "./geo";

await migrate();
const flood = await syncFloodFromGeoportal();
const geo = await syncGeoFromGeoportal();
console.log(JSON.stringify({ flood, geo }));
await sql.close();
