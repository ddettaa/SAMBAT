import { sql } from "./db";
import { PILOT_CONFIG } from "./config";

export const CITY_BOUNDS = {
  minLat: -3.3814, // BPS: 3°22'54" S (southern tip)
  maxLat: -3.2788, // BPS: 3°16'46" S
  minLng: 114.5226, // BPS: 114°31'40" E
  maxLng: 114.6714, // BPS: 114°39'55" E
} as const;

export function inCityBounds(lat: number, lng: number) {
  return (
    lat >= CITY_BOUNDS.minLat && lat <= CITY_BOUNDS.maxLat &&
    lng >= CITY_BOUNDS.minLng && lng <= CITY_BOUNDS.maxLng
  );
}

export async function resolveAdmin(lat: number, lng: number) {
  const point = sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)`;
  const [kel] = await sql`
    SELECT name AS kelurahan FROM geo_admin
    WHERE kind = 'kelurahan' AND ST_Contains(geom, ${point})
    LIMIT 1
  `;
  const [kec] = await sql`
    SELECT name AS kecamatan FROM geo_admin
    WHERE kind = 'kecamatan' AND ST_Contains(geom, ${point})
    LIMIT 1
  `;
  return { kelurahan: kel?.kelurahan ?? null, kecamatan: kec?.kecamatan ?? null };
}

export async function floodUrgency(kelurahan: string | null) {
  if (!kelurahan) return null;
  const [row] = await sql`
    SELECT flood_urgency FROM geo_flood WHERE kelurahan = ${kelurahan}
  `;
  return row?.flood_urgency ?? null;
}

// ─── category-aware risk (kriteria R) ────────────────────────
// R must reflect the hazard that matches the complaint, not flood for everything.
// Each category names the indicators that actually raise its risk.
const RISK_PROFILE: Record<string, { field: keyof RiskRow; weight: number }[]> = {
  drainase: [{ field: "banjir", weight: 0.6 }, { field: "genangan", weight: 0.4 }],
  sampah:   [{ field: "kumuh", weight: 0.5 }, { field: "genangan", weight: 0.3 }, { field: "banjir", weight: 0.2 }],
  jalan:    [{ field: "macet", weight: 0.5 }, { field: "genangan", weight: 0.3 }, { field: "kumuh", weight: 0.2 }],
  lampu:    [{ field: "kebakaran", weight: 0.4 }, { field: "kumuh", weight: 0.4 }, { field: "macet", weight: 0.2 }],
  lainnya:  [{ field: "kumuh", weight: 0.4 }, { field: "banjir", weight: 0.3 }, { field: "genangan", weight: 0.3 }],
};

// Social vulnerability lifts risk everywhere: poor and disabled residents cope worst.
const SOCIAL_WEIGHT = 0.25;

export type RiskRow = {
  banjir: number | null; genangan: number | null; kumuh: number | null;
  kebakaran: number | null; macet: number | null;
  dtks_kk: number | null; disabilitas: number | null; penduduk: number | null;
};

const normalizeKey = (name: string) => name.trim().toUpperCase();

/** Scales a raw count to 0..100 against the city-wide maximum. */
const scale = (value: number | null, max: number) =>
  value == null || max <= 0 ? 0 : Math.min(100, (Number(value) / max) * 100);

export async function riskScore(kelurahan: string | null, category: string) {
  if (!kelurahan) return { score: null, detail: null };
  const [row] = await sql`SELECT * FROM geo_risk WHERE kelurahan_key = ${normalizeKey(kelurahan)}`;
  if (!row) return { score: null, detail: null };

  const [max] = await sql`
    SELECT
      max(banjir)::float AS banjir, max(genangan)::float AS genangan,
      max(kumuh)::float AS kumuh, max(kebakaran)::float AS kebakaran,
      max(macet)::float AS macet, max(dtks_kk)::float AS dtks_kk,
      max(disabilitas)::float AS disabilitas
    FROM geo_risk
  `;

  const profile = RISK_PROFILE[category] ?? RISK_PROFILE.lainnya;
  const hazard = profile.reduce(
    (sum, { field, weight }) => sum + weight * scale(row[field], max[field]),
    0,
  );
  // DTKS households and disability counts are absolute; scale both against the city max.
  const social = 0.6 * scale(row.dtks_kk, max.dtks_kk) + 0.4 * scale(row.disabilitas, max.disabilitas);
  const score = Math.round(Math.min(100, hazard * (1 - SOCIAL_WEIGHT) + social * SOCIAL_WEIGHT));

  return {
    score,
    detail: {
      kelurahan: row.kelurahan,
      category,
      hazard: Math.round(hazard),
      social: Math.round(social),
      indicators: profile.map(({ field, weight }) => ({
        name: field, weight, raw: row[field], scaled: Math.round(scale(row[field], max[field])),
      })),
      dtks_kk: row.dtks_kk,
      disabilitas: row.disabilitas,
      penduduk: row.penduduk,
      source: "Geoportal Banjarmasin (BPBD, DPRKP, DISHUB, DINSOS, DISDUKCAPIL)",
    },
  };
}

export async function syncFloodFromGeoportal() {
  const base = PILOT_CONFIG.geoportalBaseUrl;
  const url = `${base}/geoserver/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=BPBD:Urgensi_Banjir_CRIC_2023_AR100K_AR&outputFormat=json`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) return { ok: false, error: `http_${res.status}` };
  const data: any = await res.json();
  let inserted = 0;
  for (const feature of data.features ?? []) {
    const p = feature.properties ?? {};
    const name = String(p.WADMKD || p.NAMA || p.NAMOBJ || "").trim();
    if (!name) continue;
    await sql`
      INSERT INTO geo_flood (kelurahan, flood_urgency, potensi, kerentanan, keterpapar, resiko_iklim)
      VALUES (${name}, ${Number(p.URGENSI_PO) || 1}, ${Number(p.POTENSI_DA) || null}, ${Number(p.KERENTANAN) || null}, ${Number(p.KETERPAPAR) || null}, ${Number(p.RESIKO_IKL) || null})
      ON CONFLICT (kelurahan) DO UPDATE SET
        flood_urgency = EXCLUDED.flood_urgency,
        potensi = EXCLUDED.potensi,
        kerentanan = EXCLUDED.kerentanan,
        keterpapar = EXCLUDED.keterpapar,
        resiko_iklim = EXCLUDED.resiko_iklim,
        updated_at = now()
    `;
    inserted++;
  }
  return { ok: true, inserted };
}

export async function syncGeoFromGeoportal() {
  const base = PILOT_CONFIG.geoportalBaseUrl;
  // Kelurahan boundaries: fetch layer list and pull every BAGPEM kelurahan layer.
  const capUrl = `${base}/geoserver/wfs?service=WFS&version=1.0.0&request=GetCapabilities`;
  const cap = await (await fetch(capUrl, { signal: AbortSignal.timeout(20_000) })).text();
  const layers = [...cap.matchAll(/<Name>BAGPEM:(administrasi_ar_kelurahan_[^<]+)<\/Name>/g)].map((m) => m[1]);
  const unique = [...new Set(layers)];
  let kelurahanCount = 0;
  for (const layer of unique) {
    const url = `${base}/geoserver/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=BAGPEM:${encodeURIComponent(layer)}&outputFormat=json`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) continue;
      const data: any = await res.json();
      for (const feature of data.features ?? []) {
        const name = String(feature.properties?.WADMKD || feature.properties?.NAMOBJ || "").trim();
        if (!name) continue;
        const geom = JSON.stringify(feature.geometry);
        await sql`
          INSERT INTO geo_admin (name, kind, parent, geom)
          VALUES (${name}, 'kelurahan', NULL, ST_SetSRID(ST_GeomFromGeoJSON(${geom}), 4326))
          ON CONFLICT (name) DO UPDATE SET geom = EXCLUDED.geom
        `;
        kelurahanCount++;
      }
    } catch {
      continue;
    }
  }
  // Kecamatan boundaries: administrasi_ar_kota_banjarmasin contains all 5 districts.
  for (const layer of ["administrasi_ar_kota_banjarmasin"]) {
    const url = `${base}/geoserver/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=BAGPEM:${encodeURIComponent(layer)}&outputFormat=json`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) continue;
      const data: any = await res.json();
      for (const feature of data.features ?? []) {
        const name = String(feature.properties?.WADMKC || feature.properties?.NAMOBJ || "").trim();
        if (!name) continue;
        const geom = JSON.stringify(feature.geometry);
        await sql`
          INSERT INTO geo_admin (name, kind, parent, geom)
          VALUES (${name}, 'kecamatan', NULL, ST_SetSRID(ST_GeomFromGeoJSON(${geom}), 4326))
          ON CONFLICT (name) DO UPDATE SET geom = EXCLUDED.geom
        `;
      }
    } catch {
      continue;
    }
  }
  return { ok: true, kelurahanCount };
}
