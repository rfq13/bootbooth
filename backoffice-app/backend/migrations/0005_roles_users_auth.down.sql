DROP TABLE IF EXISTS password_resets;
DROP TABLE IF EXISTS email_verifications;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;

-- Optionally recreate legacy admin_users for rollback
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin','super_admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
