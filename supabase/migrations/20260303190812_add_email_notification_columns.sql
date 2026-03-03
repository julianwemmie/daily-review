-- Add email notification preferences and activity tracking to user table
ALTER TABLE "user"
  ADD COLUMN "email_notifications_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN "last_review_at" TIMESTAMPTZ;

-- Table to track escalating email nudges per user
CREATE TABLE email_nudges_sent (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  gap_level INTEGER NOT NULL  -- 1=1day, 2=3days, 3=7days, 4=14days
);

CREATE INDEX email_nudges_sent_user_id_idx ON email_nudges_sent (user_id);

-- RLS: allow service_role full access (matches existing pattern)
ALTER TABLE email_nudges_sent ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON email_nudges_sent FOR ALL USING (true);
