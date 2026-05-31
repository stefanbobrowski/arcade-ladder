-- Sync the games table — safe to run any time against a live database.
-- Adds new games, updates titles/descriptions/emojis for existing ones.
-- Never touches users or scores.
--
-- Local:  docker exec -i arcade-pg psql -U postgres -d arcade_ladder < server/src/db/migrations/sync-games.sql
-- Cloud:  psql -h <host> -U <user> -d <db> -f sync-games.sql

INSERT INTO games (slug, title, description, emoji) VALUES
  ('typing-speed',   'Typing Speed',   'Type words as fast and accurately as you can.',                                       '⌨️'),
  ('reaction-grid',  'Reaction Grid',  'Click the highlighted tile before it moves.',                                         '⚡'),
  ('pattern-memory', 'Pattern Memory', 'Watch the sequence, then repeat it.',                                                 '🧠'),
  ('quick-math',     'Quick Math',     'Answer arithmetic questions under time pressure.',                                    '🔢'),
  ('solution-color-sort',     'Solution Color Sort',     'Mix the correct solution by sorting colors.',                                     '🧪'),
  ('balloon-popper', 'Balloon Popper', 'Pop balloons before they float away.',                                                '🎈'),
  ('match-game',     'Match Game',     'Match pairs of items as quickly as possible.',                                        '🧩'),
  ('dots-boxes',     'Dots & Boxes',   'Claim boxes by completing their four sides before the CPU.',                          '🟦'),
  ('pizza-time',     'Pizza Time',     'Serve pizzas to your hungry customers.',                                              '🍕'),
  ('all-in-blackjack',   'All-in Blackjack',   'All-in Blackjack — coming soon.',   '🃏'),
  ('snake-escape',   'Snake Escape',   'Launch snakes off the grid safely.', '🐍')
ON CONFLICT (slug) DO UPDATE
  SET title       = EXCLUDED.title,
      description = EXCLUDED.description,
      emoji       = EXCLUDED.emoji;
