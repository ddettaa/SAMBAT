CREATE TABLE IF NOT EXISTS geo_admin (
  name TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  parent TEXT,
  geom GEOMETRY(MultiPolygon,4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_geo_admin_geom ON geo_admin USING GIST(geom);
