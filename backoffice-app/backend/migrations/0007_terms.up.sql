CREATE TABLE IF NOT EXISTS terms_versions (
  id SERIAL PRIMARY KEY,
  major INT NOT NULL DEFAULT 1,
  minor INT NOT NULL DEFAULT 0,
  version_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('draft','active','archived')),
  effective_date TIMESTAMPTZ,
  version_notes TEXT,
  content JSONB NOT NULL,
  created_by INT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS user_terms_agreements (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  terms_version_id INT NOT NULL REFERENCES terms_versions(id) ON DELETE RESTRICT,
  agreed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, terms_version_id)
);

CREATE INDEX IF NOT EXISTS idx_terms_status ON terms_versions(status);
CREATE INDEX IF NOT EXISTS idx_user_terms_agreements_user ON user_terms_agreements(user_id);
