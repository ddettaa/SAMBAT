// Base URL API. Kosong = same-origin, diteruskan ke apps/api via rewrites di next.config.ts
export const API_URL = "";

// Demo API keys (bootstrap otomatis oleh apps/api saat pertama jalan)
export const KEYS = {
  collector: "test-collector-key",
  operator: "test-operator-key",
  dinas: "test-dinas-key",
};

// Pemetaan default kategori -> dinas penanggung jawab (untuk pre-select saat triage)
export const DINAS_BY_CATEGORY: Record<string, string> = {
  sampah: "d-dlh",
  drainase: "d-pupr",
  jalan: "d-pupr",
  lampu: "d-dishub",
};

export const DEFAULT_DINAS_ID = "d-pupr";
