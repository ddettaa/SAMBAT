INSERT INTO dinas (id, name, short) VALUES
  ('d-pupr', 'Dinas Pekerjaan Umum dan Penataan Ruang', 'PUPR'),
  ('d-dlh', 'Dinas Lingkungan Hidup', 'DLH'),
  ('d-dishub', 'Dinas Perhubungan', 'DISHUB'),
  ('d-bpbd', 'Badan Penanggulangan Bencana Daerah', 'BPBD')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, short = EXCLUDED.short;

INSERT INTO geo_flood (kelurahan, flood_urgency, potensi, kerentanan, keterpapar, resiko_iklim) VALUES
  ('Basirih', 7, 7, 7, 5, 6),
  ('Belitung Selatan', 4, 4, 5, 3, 4),
  ('Mantuil', 3, 2, 6, 1, 3)
ON CONFLICT (kelurahan) DO NOTHING;
