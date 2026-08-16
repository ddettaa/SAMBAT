export const PILOT_CONFIG = {
  reviewConfidence: Number(process.env.REVIEW_CONFIDENCE || 0.8),
  dedupSimilarity: Number(process.env.DEDUP_SIMILARITY || 0.45),
  dedupRadiusMeters: Number(process.env.DEDUP_RADIUS_METERS || 500),
  dedupWindowDays: Number(process.env.DEDUP_WINDOW_DAYS || 7),
  confirmationTtlHours: Number(process.env.CONFIRMATION_TTL_HOURS || 168),
  confirmationMaxAttempts: Number(process.env.CONFIRMATION_MAX_ATTEMPTS || 5),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 60),
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  geoportalBaseUrl: process.env.GEOPORTAL_BASE_URL || "https://geoportal.banjarmasinkota.go.id",
  slaHours: {
    sampah: Number(process.env.SLA_SAMPAH_HOURS || 72),
    drainase: Number(process.env.SLA_DRAINASE_HOURS || 24),
    jalan: Number(process.env.SLA_JALAN_HOURS || 168),
    lampu: Number(process.env.SLA_LAMPU_HOURS || 72),
    lainnya: Number(process.env.SLA_LAINNYA_HOURS || 72),
  },
} as const;

export const PRIORITY_WEIGHTS = { U: 0.30, D: 0.25, V: 0.20, T: 0.15, R: 0.10 } as const;

// Pemetaan kategori -> dinas penanggung jawab (dipakai auto-route & routing manual)
export const DINAS_BY_CATEGORY: Record<string, string> = {
  sampah: "d-dlh",
  drainase: "d-pupr",
  jalan: "d-pupr",
  lampu: "d-dishub",
};

const finite = (value: unknown, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value: unknown) => Math.max(0, Math.min(100, finite(value)));

export function calculatePriority(input: { U: unknown; D: unknown; V: unknown; T: unknown; R: unknown }) {
  const inputs = { U: clamp(input.U), D: clamp(input.D), V: clamp(input.V), T: clamp(input.T), R: clamp(input.R) };
  const components = {
    U: inputs.U * PRIORITY_WEIGHTS.U,
    D: inputs.D * PRIORITY_WEIGHTS.D,
    V: inputs.V * PRIORITY_WEIGHTS.V,
    T: inputs.T * PRIORITY_WEIGHTS.T,
    R: inputs.R * PRIORITY_WEIGHTS.R,
  };
  return {
    score: Math.round(Object.values(components).reduce((sum, value) => sum + value, 0)),
    inputs,
    components,
    method: "SMART (Edwards & Barron, 1994; DOI 10.1006/obhd.1994.1087)",
    calibration: "pilot defaults; validate with Banjarmasin service owners and labeled pilot data",
  };
}
