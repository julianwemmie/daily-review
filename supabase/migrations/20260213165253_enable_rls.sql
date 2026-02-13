ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON cards FOR ALL USING (true);
CREATE POLICY "Service role full access" ON review_logs FOR ALL USING (true);
