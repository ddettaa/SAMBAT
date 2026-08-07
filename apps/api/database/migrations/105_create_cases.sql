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
CREATE INDEX IF NOT EXISTS idx_cases_centroid ON cases USING GIST(centroid);
