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
