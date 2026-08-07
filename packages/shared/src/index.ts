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

export const PRIORITY_FORMULA = {
  U: 30, // urgensi
  D: 25, // jumlah laporan serupa
  V: 20, // bukti & lokasi
  T: 15, // lama belum ditangani
  R: 10, // dampak
} as const;
