CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('collector','operator','dinas')),
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(role, revoked_at, expires_at);
