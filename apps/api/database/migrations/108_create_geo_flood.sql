CREATE TABLE IF NOT EXISTS geo_flood (
  kelurahan TEXT PRIMARY KEY,
  flood_urgency INTEGER NOT NULL,
  potensi INTEGER,
  kerentanan INTEGER,
  keterpapar INTEGER,
  resiko_iklim INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
