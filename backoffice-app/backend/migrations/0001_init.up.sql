CREATE TABLE IF NOT EXISTS outlets (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin','super_admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  user_name TEXT NOT NULL,
  outlet_id INT NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending','paid','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  booking_id INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('scheduled','started','finished')),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS system_config (
  id SERIAL PRIMARY KEY,
  session_duration_minutes INT NOT NULL DEFAULT 30,
  tolerance_minutes INT NOT NULL DEFAULT 10,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);