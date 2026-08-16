export interface PriorityDetail {
  U?: number;
  D?: number;
  V?: number;
  T?: number;
  R?: number;
}

export interface Report {
  id: string;
  source: string;
  source_ref?: string;
  text_original: string;
  text_normalized?: string;
  category: string;
  location_text?: string;
  latitude?: number | null;
  longitude?: number | null;
  confidence?: number | null;
  priority: number;
  priority_detail?: PriorityDetail | null;
  status: string;
  reporter_pseudo?: string;
  dinas_id?: string;
  kelurahan?: string | null;
  kecamatan?: string | null;
  sla_due?: string;
  image_before?: string;
  image_after?: string;
  created_at: string;
}

export interface TimelineEvent {
  status: string;
  note?: string;
  created_at: string;
}

export interface ReportDetail extends Report {
  timeline?: TimelineEvent[];
}

export interface Case {
  id: string;
  title: string;
  report_ids: string[] | string;
  report_count: number;
  score: number;
  category: string;
  status: string;
  centroid?: unknown;
  created_at: string;
}

export interface Dinas {
  id: string;
  name: string;
  short: string;
}
