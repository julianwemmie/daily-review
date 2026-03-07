-- Backfill any existing NULL backs with empty string
UPDATE cards SET back = '' WHERE back IS NULL;

-- Make back NOT NULL with a default of empty string
ALTER TABLE cards ALTER COLUMN back SET DEFAULT '';
ALTER TABLE cards ALTER COLUMN back SET NOT NULL;
