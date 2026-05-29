INSERT INTO games (slug, title, description, emoji) VALUES
  ('dots-boxes', 'Dots & Boxes', 'Claim boxes by completing their four sides before the CPU does.', '🟦')
ON CONFLICT (slug) DO NOTHING;
