CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS embedding vector(384);
CREATE INDEX IF NOT EXISTS idx_reports_embedding ON reports USING hnsw (embedding vector_cosine_ops);
