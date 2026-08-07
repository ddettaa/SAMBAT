CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('x','instagram','whatsapp','web')),
  source_ref TEXT,
  UNIQUE (source, source_ref),
  text_original TEXT NOT NULL CHECK (char_length(text_original) BETWEEN 3 AND 5000),
  text_normalized TEXT,
  category TEXT NOT NULL CHECK (category IN ('sampah','drainase','jalan','lampu','lainnya')),
  location_text TEXT,
  geom GEOMETRY(Point,4326),
  confidence REAL CHECK (confidence BETWEEN 0 AND 1),
  ai_model TEXT,
  ai_reasoning TEXT,
  ai_used BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'terdeteksi' CHECK (status IN ('terdeteksi','terverifikasi','diteruskan','dikerjakan','menunggu_konfirmasi','selesai','ditolak')),
  priority INTEGER NOT NULL CHECK (priority BETWEEN 0 AND 100),
  priority_detail JSONB NOT NULL,
  reporter_pseudo TEXT,
  confirmation_token_hash TEXT NOT NULL,
  confirmation_expires_at TIMESTAMPTZ,
  confirmation_attempts INTEGER NOT NULL DEFAULT 0,
  ai_failure_reason TEXT,
  kelurahan TEXT,
  kecamatan TEXT,
  flood_urgency INTEGER,
  dinas_id TEXT REFERENCES dinas(id),
  sla_due TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(category);
CREATE INDEX IF NOT EXISTS idx_reports_geom ON reports USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_reports_trgm ON reports USING GIN(text_normalized gin_trgm_ops);
