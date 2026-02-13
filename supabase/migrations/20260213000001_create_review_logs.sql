CREATE TABLE review_logs (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  rating TEXT NOT NULL,
  answer TEXT,
  llm_score DOUBLE PRECISION,
  llm_feedback TEXT,
  reviewed_at TIMESTAMPTZ NOT NULL
);
