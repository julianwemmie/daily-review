ALTER TABLE cards
  ADD COLUMN user_id TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE;

CREATE INDEX cards_user_id_idx ON cards (user_id);
