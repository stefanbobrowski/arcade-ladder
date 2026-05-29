INSERT INTO games (slug, title, description, emoji) VALUES
  ('arrow-escape', 'Arrow Escape', 'Launch snakes off the grid in the right order — one wrong move and it''s game over.', '🏹')
ON CONFLICT (slug) DO NOTHING;
