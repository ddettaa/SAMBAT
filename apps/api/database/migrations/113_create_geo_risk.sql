-- Per-kelurahan risk and vulnerability indicators from Geoportal Banjarmasin.
-- Keyed by uppercased kelurahan name because source OPD layers disagree on casing.
CREATE TABLE IF NOT EXISTS geo_risk (
  kelurahan_key TEXT PRIMARY KEY,
  kelurahan TEXT NOT NULL,
  banjir INTEGER,          -- BPBD Urgensi_Banjir_CRIC_2023 (0..10)
  genangan INTEGER,        -- BPBD Data_Genangan 2025, jumlah titik
  kumuh INTEGER,           -- DPRKP kawasan kumuh, jumlah poligon
  kebakaran INTEGER,       -- BPBD rawan kebakaran, jumlah zona
  macet INTEGER,           -- DISHUB titik kemacetan
  dtks_kk INTEGER,         -- DINSOS jumlah KK dalam DTKS
  disabilitas INTEGER,     -- DINSOS jumlah penyandang disabilitas
  penduduk INTEGER,        -- DISDUKCAPIL jumlah penduduk 2022
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
