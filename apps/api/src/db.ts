import { SQL } from "bun";
import { createHash, randomBytes, randomUUID } from "node:crypto";

const DATABASE_URL = process.env.DATABASE_URL || "postgres://sambat:sambat@localhost:5432/sambat";
export const sql = new SQL(DATABASE_URL);

export const id = (prefix: string) => `${prefix}_${randomUUID()}`;
export const token = () => randomBytes(24).toString("base64url");
export const tokenHash = (value: string) => createHash("sha256").update(value).digest("hex");

export async function migrate() {
  await sql.unsafe(`
    CREATE EXTENSION IF NOT EXISTS postgis;
    CREATE EXTENSION IF NOT EXISTS pg_trgm;

    CREATE TABLE IF NOT EXISTS dinas (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      short TEXT NOT NULL UNIQUE,
      active BOOLEAN NOT NULL DEFAULT TRUE
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL CHECK (source IN ('x','instagram','whatsapp','web')),
      source_ref TEXT,
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
  `);

  await sql`
    INSERT INTO dinas (id,name,short) VALUES
      ('d-pupr','Dinas Pekerjaan Umum dan Penataan Ruang','PUPR'),
      ('d-dlh','Dinas Lingkungan Hidup','DLH'),
      ('d-dishub','Dinas Perhubungan','DISHUB'),
      ('d-bpbd','Badan Penanggulangan Bencana Daerah','BPBD')
    ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, short=EXCLUDED.short
  `;
}

export async function audit(action: string, entityType: string, entityId: string, actor: string, detail: unknown = {}) {
  await sql`INSERT INTO audit_log ${sql({
    id: id("audit"), action, entity_type: entityType, entity_id: entityId, actor,
    detail: JSON.stringify(detail),
  })}`;
}
