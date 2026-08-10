// One-off script: fetch real admin + flood + risk data from Geoportal and seed the DB.
import { sql, migrate } from "./db";
import { syncFloodFromGeoportal, syncGeoFromGeoportal } from "./geo";
import { syncRiskFromGeoportal } from "./geo-risk";

await migrate();
const flood = await syncFloodFromGeoportal();
const geo = await syncGeoFromGeoportal();
const risk = await syncRiskFromGeoportal();
console.log(JSON.stringify({ flood, geo, risk }));
await sql.close();
