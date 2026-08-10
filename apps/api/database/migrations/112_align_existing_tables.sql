-- Align pre-existing tables with the current schema.
-- CREATE TABLE IF NOT EXISTS never alters an existing table, so databases created
-- before the per-table migrations were split still miss these columns.

ALTER TABLE reports ADD COLUMN IF NOT EXISTS ai_model TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS ai_reasoning TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS ai_used BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS ai_failure_reason TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS confirmation_token_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS confirmation_expires_at TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS confirmation_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS kelurahan TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS kecamatan TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS flood_urgency INTEGER;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE cases ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE dinas ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reports_source_source_ref_key' AND conrelid = 'reports'::regclass
  ) THEN
    ALTER TABLE reports ADD CONSTRAINT reports_source_source_ref_key UNIQUE (source, source_ref);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(category);
CREATE INDEX IF NOT EXISTS idx_reports_geom ON reports USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_reports_trgm ON reports USING GIN(text_normalized gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cases_centroid ON cases USING GIST(centroid);
