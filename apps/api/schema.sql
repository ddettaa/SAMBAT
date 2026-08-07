-- SAMBAT schema — PostgreSQL 16 + PostGIS + pgvector
-- Run once: psql -U sambat -d sambat -f schema.sql

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE dinas (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  short       TEXT NOT NULL UNIQUE        -- PUPR, DLH, DISHUB, BPBD
);

CREATE TABLE users (
  id          TEXT PRIMARY KEY,
  role        TEXT NOT NULL CHECK (role IN ('warga', 'dinas', 'operator')),
  dinas_id    TEXT REFERENCES dinas(id),
  name        TEXT,
  phone       TEXT UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reports (
  id              TEXT PRIMARY KEY,
  source          TEXT NOT NULL,           -- x | instagram | whatsapp | web
  source_ref      TEXT,                    -- post id / wa message id
  text_original   TEXT NOT NULL,
  text_normalized TEXT,
  category        TEXT NOT NULL DEFAULT 'lainnya',
  location_text   TEXT,
  geom            GEOMETRY(Point, 4326),
  confidence      REAL,
  status          TEXT NOT NULL DEFAULT 'terdeteksi'
                  CHECK (status IN ('terdeteksi','terverifikasi','diteruskan','dikerjakan','menunggu_konfirmasi','selesai','ditolak')),
  priority        INTEGER NOT NULL DEFAULT 0,
  priority_detail JSONB,
  reporter_pseudo TEXT,                    -- pseudonim, bukan identitas asli
  dinas_id        TEXT REFERENCES dinas(id),
  sla_due         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cases (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  report_ids  JSONB NOT NULL DEFAULT '[]',
  report_count INTEGER NOT NULL DEFAULT 1,
  centroid    GEOMETRY(Point, 4326),
  score       INTEGER NOT NULL DEFAULT 0,
  category    TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'terverifikasi',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sla_events (
  id          TEXT PRIMARY KEY,
  report_id   TEXT NOT NULL REFERENCES reports(id),
  status      TEXT NOT NULL,
  note        TEXT,
  actor       TEXT NOT NULL,               -- ai | operator | dinas | warga
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
  id          TEXT PRIMARY KEY,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  actor       TEXT NOT NULL,
  detail      JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_geom ON reports USING GIST(geom);
CREATE INDEX idx_reports_category ON reports(category);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_trgm ON reports USING GIN (text_normalized gin_trgm_ops);
CREATE INDEX idx_cases_geom ON cases USING GIST(centroid);

INSERT INTO dinas (id, name, short) VALUES
  ('d-pupr',  'Dinas Pekerjaan Umum dan Penataan Ruang', 'PUPR'),
  ('d-dlh',   'Dinas Lingkungan Hidup',                  'DLH'),
  ('d-dishub','Dinas Perhubungan',                       'DISHUB'),
  ('d-bpbd',  'Badan Penanggulangan Bencana Daerah',     'BPBD');
