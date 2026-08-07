import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";

// Fallback: sqlite lokal kalau DATABASE_URL postgres belum ada.
// Upgrade path: ganti ke @neondatabase/serverless / pg saat Postgres dipakai.
// ponytail: sqlite->postgres; add when deploy.

let db: Database | null = null;

export function getDb(): Database {
  if (!db) {
    mkdirSync("./data", { recursive: true });
    db = new Database(process.env.DB_PATH || "./data/sambat.db", { create: true });
    db.exec("PRAGMA journal_mode = DELETE");
    migrate(db);
  }
  return db;
}

export function migrate(db: Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      source_ref TEXT,
      text_original TEXT NOT NULL,
      text_normalized TEXT,
      category TEXT NOT NULL DEFAULT 'lainnya',
      location_text TEXT,
      confidence REAL,
      status TEXT NOT NULL DEFAULT 'terdeteksi',
      priority INTEGER NOT NULL DEFAULT 0,
      priority_detail TEXT,
      reporter_pseudo TEXT,
      dinas_id TEXT,
      sla_due TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      report_ids TEXT NOT NULL DEFAULT '[]',
      report_count INTEGER NOT NULL DEFAULT 1,
      score INTEGER NOT NULL DEFAULT 0,
      category TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'terverifikasi',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sla_events (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      status TEXT NOT NULL,
      note TEXT,
      actor TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      actor TEXT NOT NULL,
      detail TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
