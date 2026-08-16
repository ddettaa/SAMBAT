-- Koordinat lokasi perbaikan (di mana dinas mengerjakan, bisa beda dari lokasi laporan)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS repair_lat DOUBLE PRECISION;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS repair_lng DOUBLE PRECISION;
