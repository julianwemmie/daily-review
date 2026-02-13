-- Convert id columns from TEXT to UUID and add indexes

-- Drop the foreign key first so we can alter both tables
ALTER TABLE review_logs DROP CONSTRAINT review_logs_card_id_fkey;

-- Alter id columns to UUID
ALTER TABLE cards ALTER COLUMN id TYPE UUID USING id::uuid;
ALTER TABLE review_logs ALTER COLUMN id TYPE UUID USING id::uuid;
ALTER TABLE review_logs ALTER COLUMN card_id TYPE UUID USING card_id::uuid;

-- Re-add the foreign key
ALTER TABLE review_logs
  ADD CONSTRAINT review_logs_card_id_fkey
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE;

-- Add indexes for common query patterns
CREATE INDEX idx_cards_status_due ON cards (status, due);
CREATE INDEX idx_cards_status ON cards (status);
