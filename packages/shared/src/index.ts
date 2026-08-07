export const CATEGORIES = ["sampah", "drainase", "jalan", "lampu", "lainnya"] as const;
export type Category = (typeof CATEGORIES)[number];

export const REPORT_STATUS = [
  "terdeteksi",
  "terverifikasi",
  "diteruskan",
  "dikerjakan",
  "menunggu_konfirmasi",
  "selesai",
  "ditolak",
] as const;
export type ReportStatus = (typeof REPORT_STATUS)[number];

export const DINAS = {
  PUPR: "PUPR",
  DLH: "DLH",
  DISHUB: "DISHUB",
  BPBD: "BPBD",
} as const;

export interface Report {
  id: string;
  source: "x" | "instagram" | "whatsapp" | "web";
  textOriginal: string;
  textNormalized?: string;
  category: Category;
  locationText?: string;
  confidence?: number;
  status: ReportStatus;
  priority: number;
  priorityDetail?: Record<string, number>;
  dinasId?: string;
  slaDue?: string;
  createdAt: string;
}

export const PRIORITY_WEIGHTS = {
  urgency: 0.30,
  duplicateImpact: 0.25,
  evidence: 0.20,
  age: 0.15,
  affectedRadius: 0.10,
} as const;

export type PriorityInputs = {
  urgency: number;
  duplicateImpact: number;
  evidence: number;
  age: number;
  affectedRadius: number;
};

/** SMART weighted-sum score. Every input is normalized to 0..100. */
export function calculatePriority(input: PriorityInputs) {
  const normalized = Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, Math.max(0, Math.min(100, value))]),
  ) as PriorityInputs;
  const components = {
    urgency: normalized.urgency * PRIORITY_WEIGHTS.urgency,
    duplicateImpact: normalized.duplicateImpact * PRIORITY_WEIGHTS.duplicateImpact,
    evidence: normalized.evidence * PRIORITY_WEIGHTS.evidence,
    age: normalized.age * PRIORITY_WEIGHTS.age,
    affectedRadius: normalized.affectedRadius * PRIORITY_WEIGHTS.affectedRadius,
  };
  return {
    score: Math.round(Object.values(components).reduce((sum, value) => sum + value, 0)),
    inputs: normalized,
    components,
    method: "SMART (Edwards & Barron, 1994; DOI 10.1006/obhd.1994.1087)",
  };
}
