// Verify Geoportal integration: admin boundaries + flood urgency resolve correctly.
import { sql, migrate } from "./src/db";
import { resolveAdmin, floodUrgency, inCityBounds } from "./src/geo";

await migrate();

// Official city bounds from BPS/Profil Kota.
const inCity = inCityBounds(-3.32, 114.59);
if (!inCity) throw new Error("city bounds should accept -3.32,114.59");

// Admin resolution for a point inside Kelurahan Basirih (approx center from WFS).
const admin = await resolveAdmin(-3.337, 114.56);
if (!admin.kelurahan) throw new Error("expected kelurahan resolution");
if (!admin.kecamatan) throw new Error("expected kecamatan resolution");

// Flood urgency for Basirih seeded from BPBD layer.
const flood = await floodUrgency(admin.kelurahan);
if (flood == null) throw new Error("expected flood urgency");

console.log(JSON.stringify({ inCity, admin, flood }));
await sql.close();
console.log("GEOPORTAL INTEGRATION TEST PASSED");
