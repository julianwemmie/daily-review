CREATE TABLE cards (
  id TEXT PRIMARY KEY,
  front TEXT NOT NULL,
  context TEXT,
  source_conversation TEXT,
  tags JSONB,
  created_at TIMESTAMPTZ NOT NULL,

  -- FSRS scheduling fields
  due TIMESTAMPTZ NOT NULL,
  stability DOUBLE PRECISION NOT NULL DEFAULT 0,
  difficulty DOUBLE PRECISION NOT NULL DEFAULT 0,
  elapsed_days DOUBLE PRECISION NOT NULL DEFAULT 0,
  scheduled_days DOUBLE PRECISION NOT NULL DEFAULT 0,
  learning_steps INTEGER NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  lapses INTEGER NOT NULL DEFAULT 0,
  state TEXT NOT NULL DEFAULT 'new',
  last_review TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'triaging'
);
