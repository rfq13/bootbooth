CREATE TABLE IF NOT EXISTS booths (
  id SERIAL PRIMARY KEY,
  socket_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  location TEXT,
  outlet_code TEXT,
  connected BOOLEAN NOT NULL DEFAULT TRUE,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booths_connected ON booths(connected);
CREATE INDEX IF NOT EXISTS idx_booths_connected_at ON booths(connected_at);