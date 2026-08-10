/**
 * Aggregates per-kelurahan risk indicators from Geoportal Banjarmasin into geo_risk.
 *
 * Point/area layers are counted per kelurahan; where a layer carries no kelurahan
 * attribute the feature is joined spatially against geo_admin.
 */
import { sql } from "./db";
import { PILOT_CONFIG } from "./config";

type Feature = { properties?: Record<string, any>; geometry?: any };

const WFS = (typeName: string) =>
  `${PILOT_CONFIG.geoportalBaseUrl}/geoserver/wfs?service=WFS&version=2.0.0&request=GetFeature` +
  `&outputFormat=application/json&srsName=EPSG:4326&typeName=${encodeURIComponent(typeName)}`;

async function features(typeName: string): Promise<Feature[]> {
  const res = await fetch(WFS(typeName), { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`${typeName}: http_${res.status}`);
  const data: any = await res.json();
  return data.features ?? [];
}

const key = (name: unknown) => String(name ?? "").trim().toUpperCase();

/** Reads the kelurahan name from whichever attribute the source OPD used. */
function kelurahanOf(p: Record<string, any> = {}) {
  return key(p.WADMKD || p.KELURAHAN || p.NAMA_KELUR || p.KELURAHA_1 || p.NAMA || "");
}

/** Counts features per kelurahan, falling back to a spatial join when unnamed. */
async function countByKelurahan(typeName: string, spatialFallback: boolean) {
  const counts = new Map<string, number>();
  const unnamed: any[] = [];
  for (const f of await features(typeName)) {
    const name = kelurahanOf(f.properties);
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
    else if (spatialFallback && f.geometry) unnamed.push(f.geometry);
  }
  for (const geometry of unnamed) {
    try {
      const [hit] = await sql`
        SELECT name FROM geo_admin
        WHERE kind = 'kelurahan'
          AND ST_Intersects(geom, ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(geometry)}), 4326))
        LIMIT 1
      `;
      if (hit?.name) counts.set(key(hit.name), (counts.get(key(hit.name)) ?? 0) + 1);
    } catch {
      continue;
    }
  }
  return counts;
}

/** Reads a numeric attribute per kelurahan (population, DTKS, disability). */
async function valueByKelurahan(typeName: string, field: string) {
  const values = new Map<string, number>();
  for (const f of await features(typeName)) {
    const name = kelurahanOf(f.properties);
    const value = Number(f.properties?.[field]);
    if (name && Number.isFinite(value)) values.set(name, value);
  }
  return values;
}

export async function syncRiskFromGeoportal() {
  const errors: string[] = [];
  const safe = async <T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> => {
    try { return await fn(); } catch (e: any) { errors.push(`${label}: ${e?.message || e}`); return fallback; }
  };

  const [genangan, kumuh, kebakaran, macet, dtks, disabilitas, penduduk] = await Promise.all([
    safe("genangan", () => countByKelurahan("BPBD:Data_Genangan_Kota_Banjarmasin_2025_10K_AR", true), new Map()),
    safe("kumuh", () => countByKelurahan("DPRKP:PERMUKIMAN_KUMUH_KOTA_BANJARMASIN_AR_50K", true), new Map()),
    safe("kebakaran", () => countByKelurahan("BPBD:RAWAN_KEBAKARAN_AR", true), new Map()),
    safe("macet", () => countByKelurahan("DISHUB:TITIK_KEMACETAN_25K_PT", true), new Map()),
    safe("dtks", () => valueByKelurahan("DINSOS:DTKS_Kota_Banjarmasin_AR_25k_AR", "DTKS__KK_"), new Map()),
    safe("disabilitas", () => valueByKelurahan("DINSOS:Jumlah_Disabilitas_Per_Kelurahan_AR_25k_AR", "JUMLAH_DIS"), new Map()),
    safe("penduduk", () => valueByKelurahan("DISDUKCAPIL:Peta_Kependudukan_Banjarmasin_2022_AR_100Kt_AR", "JUMLAH_PEN"), new Map()),
  ]);

  // Flood urgency already lives in geo_flood; reuse it as the banjir indicator.
  const banjir = new Map<string, number>();
  for (const row of await sql`SELECT kelurahan, flood_urgency FROM geo_flood`) {
    banjir.set(key(row.kelurahan), Number(row.flood_urgency));
  }

  const names = new Set<string>([
    ...banjir.keys(), ...genangan.keys(), ...kumuh.keys(), ...kebakaran.keys(),
    ...macet.keys(), ...dtks.keys(), ...disabilitas.keys(), ...penduduk.keys(),
  ]);

  let upserted = 0;
  for (const name of names) {
    if (!name) continue;
    await sql`
      INSERT INTO geo_risk (kelurahan_key, kelurahan, banjir, genangan, kumuh, kebakaran, macet, dtks_kk, disabilitas, penduduk)
      VALUES (${name}, ${name}, ${banjir.get(name) ?? null}, ${genangan.get(name) ?? 0}, ${kumuh.get(name) ?? 0},
              ${kebakaran.get(name) ?? 0}, ${macet.get(name) ?? 0}, ${dtks.get(name) ?? null},
              ${disabilitas.get(name) ?? null}, ${penduduk.get(name) ?? null})
      ON CONFLICT (kelurahan_key) DO UPDATE SET
        banjir = EXCLUDED.banjir, genangan = EXCLUDED.genangan, kumuh = EXCLUDED.kumuh,
        kebakaran = EXCLUDED.kebakaran, macet = EXCLUDED.macet, dtks_kk = EXCLUDED.dtks_kk,
        disabilitas = EXCLUDED.disabilitas, penduduk = EXCLUDED.penduduk, updated_at = now()
    `;
    upserted++;
  }

  return { ok: errors.length === 0, upserted, errors };
}
