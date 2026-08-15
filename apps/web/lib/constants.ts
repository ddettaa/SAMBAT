// Base URL API. Kosong = same-origin, diteruskan ke apps/api via rewrites di next.config.ts
export const API_URL = "";

// Demo API keys (bootstrap otomatis oleh apps/api saat pertama jalan)
export const KEYS = {
  collector: "1c4c3df62536624356e1e15e15acb637e5435aee2c8bb7cf",
  operator: "6e2ec681e704d16e8e05479e8721c00f2851eb8368b57eff",
  dinas: "b188d6bffe26559476d988a1e6cc5b8b96c702392ede1bcc",
};

// Pemetaan default kategori -> dinas penanggung jawab (untuk pre-select saat triage)
export const DINAS_BY_CATEGORY: Record<string, string> = {
  sampah: "d-dlh",
  drainase: "d-pupr",
  jalan: "d-pupr",
  lampu: "d-dishub",
};

export const DEFAULT_DINAS_ID = "d-pupr";
