CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS dinas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('collector','operator','dinas')),
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(role, revoked_at, expires_at);

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

CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  report_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  report_count INTEGER NOT NULL CHECK (report_count > 0),
  centroid GEOMETRY(Point,4326),
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'terverifikasi',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sla_events (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS geo_admin (
  name TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  parent TEXT,
  geom GEOMETRY(MultiPolygon,4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_geo_admin_geom ON geo_admin USING GIST(geom);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS collector_inbox (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  source_ref TEXT,
  UNIQUE (source, source_ref),
  text TEXT NOT NULL CHECK (char_length(text) BETWEEN 3 AND 5000),
  location_text TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  reporter_pseudo TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','ingested','failed')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS geo_flood (
  kelurahan TEXT PRIMARY KEY,
  flood_urgency INTEGER NOT NULL,
  potensi INTEGER,
  kerentanan INTEGER,
  keterpapar INTEGER,
  resiko_iklim INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  detail JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_geom ON reports USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_reports_trgm ON reports USING GIN(text_normalized gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(category);
CREATE INDEX IF NOT EXISTS idx_cases_centroid ON cases USING GIST(centroid);
