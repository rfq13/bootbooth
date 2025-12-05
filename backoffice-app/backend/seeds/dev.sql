INSERT INTO outlets (name) VALUES
  ('Booth Alpha'),
  ('Booth Beta');

-- roles are created by migrations

INSERT INTO bookings (user_name, outlet_id, status) VALUES
  ('Mahfuzul', 1, 'pending'),
  ('Wulandari', 2, 'paid');

INSERT INTO system_config (session_duration_minutes, tolerance_minutes) VALUES (30, 10);

-- admin user (password: Admin1234, salt: devsalt)
INSERT INTO users (email, password_hash, password_salt, role_id, is_verified)
VALUES (
  'admin@example.com',
  '9d7915ab22b536af67c7f1d99c1f09ba4b80627909fc9df44d5dfe8f2fa79d9a',
  'devsalt',
  (SELECT id FROM roles WHERE code='admin'),
  true
);
