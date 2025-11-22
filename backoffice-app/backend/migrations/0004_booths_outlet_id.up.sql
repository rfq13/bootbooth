ALTER TABLE booths ADD COLUMN IF NOT EXISTS outlet_id INT REFERENCES outlets(id);
CREATE INDEX IF NOT EXISTS idx_booths_outlet_id ON booths(outlet_id);