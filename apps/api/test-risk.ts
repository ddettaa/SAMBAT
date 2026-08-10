// Category-aware risk (kriteria R): the same kelurahan must score differently
// per complaint category, and social vulnerability must lift the score.
import { sql } from "./src/db";
import { riskScore } from "./src/geo";

const KEL = "risk-test-kelurahan";
const OTHER = "risk-test-other";

await sql`
  INSERT INTO geo_risk (kelurahan_key, kelurahan, banjir, genangan, kumuh, kebakaran, macet, dtks_kk, disabilitas, penduduk)
  VALUES (${KEL.toUpperCase()}, ${KEL}, 10, 20, 5, 0, 0, 1000, 50, 20000),
         (${OTHER.toUpperCase()}, ${OTHER}, 1, 2, 10, 4, 3, 100, 5, 5000)
  ON CONFLICT (kelurahan_key) DO UPDATE SET
    banjir = EXCLUDED.banjir, genangan = EXCLUDED.genangan, kumuh = EXCLUDED.kumuh,
    kebakaran = EXCLUDED.kebakaran, macet = EXCLUDED.macet, dtks_kk = EXCLUDED.dtks_kk,
    disabilitas = EXCLUDED.disabilitas, penduduk = EXCLUDED.penduduk
`;

const assert = (condition: any, message: string) => { if (!condition) throw new Error(message); };

const drainase = await riskScore(KEL, "drainase");
const lampu = await riskScore(KEL, "lampu");
assert(drainase.score != null && lampu.score != null, "risk score must resolve for a seeded kelurahan");
assert(drainase.score! > lampu.score!, `flood-heavy kelurahan must rank drainase (${drainase.score}) above lampu (${lampu.score})`);

// Category profile must actually select different indicators.
const drainaseFields = drainase.detail!.indicators.map((i: any) => i.name).sort().join(",");
const lampuFields = lampu.detail!.indicators.map((i: any) => i.name).sort().join(",");
assert(drainaseFields !== lampuFields, "each category must use its own indicator profile");

// Fire-prone, congested kelurahan must beat the flood-heavy one on lampu.
const otherLampu = await riskScore(OTHER, "lampu");
assert(otherLampu.score! > lampu.score!, `fire/congestion kelurahan must rank lampu higher (${otherLampu.score} vs ${lampu.score})`);

// Unknown kelurahan yields null, never a fabricated score.
const unknown = await riskScore("kelurahan-yang-tidak-ada", "drainase");
assert(unknown.score === null && unknown.detail === null, "unknown kelurahan must return null risk");
assert((await riskScore(null, "drainase")).score === null, "null kelurahan must return null risk");

// Unknown category falls back to the 'lainnya' profile instead of throwing.
const weird = await riskScore(KEL, "kategori-aneh");
assert(weird.score != null, "unknown category must fall back to the default profile");

await sql`DELETE FROM geo_risk WHERE kelurahan_key IN (${KEL.toUpperCase()}, ${OTHER.toUpperCase()})`;
await sql.close();
console.log(`CATEGORY-AWARE RISK TEST PASSED drainase=${drainase.score} lampu=${lampu.score} other_lampu=${otherLampu.score}`);
