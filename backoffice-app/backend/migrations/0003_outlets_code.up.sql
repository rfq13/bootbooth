ALTER TABLE outlets ADD COLUMN IF NOT EXISTS code TEXT UNIQUE;
UPDATE outlets SET code = CONCAT('out-', id) WHERE code IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_outlets_code ON outlets(code);