INSERT INTO outlets (name) VALUES
  ('Booth Alpha'),
  ('Booth Beta');

INSERT INTO admin_users (email, role) VALUES
  ('admin@example.com','admin'),
  ('super@example.com','super_admin');

INSERT INTO bookings (user_name, outlet_id, status) VALUES
  ('Mahfuzul', 1, 'pending'),
  ('Wulandari', 2, 'paid');

INSERT INTO system_config (session_duration_minutes, tolerance_minutes) VALUES (30, 10);