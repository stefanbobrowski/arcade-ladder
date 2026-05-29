INSERT INTO games (slug, title, description, emoji) VALUES
  ('match-game',     'Match Game',     'Match pairs of items as quickly as possible.', '🧩')
ON CONFLICT (slug) DO NOTHING;