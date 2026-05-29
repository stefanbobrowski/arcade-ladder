-- Master setup — rewrites the database from scratch.
-- Local:  docker exec -i arcade-pg psql -U postgres -d arcade_ladder < src/db/migrations/001_init.sql
-- Cloud:  psql -h <host> -U <user> -d <db> -f 001_init.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Drop existing tables (clean slate) ────────────────────────────────────────

DROP TABLE IF EXISTS scores CASCADE;
DROP TABLE IF EXISTS games  CASCADE;
DROP TABLE IF EXISTS users  CASCADE;

-- ── Users ─────────────────────────────────────────────────────────────────────

CREATE TABLE users (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  username            VARCHAR(32)  UNIQUE NOT NULL,
  email               VARCHAR(255) UNIQUE NOT NULL,
  oauth_provider      VARCHAR(20)  NOT NULL,
  oauth_id            VARCHAR(255) NOT NULL,
  avatar_url          TEXT,
  chosen_avatar       VARCHAR(50),
  xp                  INTEGER      NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  username_changed_at TIMESTAMPTZ,
  UNIQUE (oauth_provider, oauth_id)
);

-- ── Games ─────────────────────────────────────────────────────────────────────

CREATE TABLE games (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        VARCHAR(64)  UNIQUE NOT NULL,
  title       VARCHAR(100) NOT NULL,
  description TEXT,
  emoji       VARCHAR(10),
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Scores ────────────────────────────────────────────────────────────────────

CREATE TABLE scores (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id    UUID        NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  score      INTEGER     NOT NULL CHECK (score >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX scores_game_user_idx  ON scores (game_id, user_id);
CREATE INDEX scores_game_score_idx ON scores (game_id, score DESC);
CREATE INDEX scores_created_at_idx ON scores (created_at DESC);

-- ── Games — single source of truth for slugs, titles, and emojis ──────────────

INSERT INTO games (slug, title, description, emoji) VALUES
  ('typing-speed',   'Typing Speed',   'Type words as fast and accurately as you can.',                                       '⌨️'),
  ('reaction-grid',  'Reaction Grid',  'Click the highlighted tile before it moves.',                                         '⚡'),
  ('pattern-memory', 'Pattern Memory', 'Watch the sequence, then repeat it.',                                                 '🧠'),
  ('quick-math',     'Quick Math',     'Answer arithmetic questions under time pressure.',                                    '🔢'),
  ('solution-color-sort',     'Solution Color Sort',     'Mix the correct solution by sorting colors.',                                     '🧪'),
  ('balloon-popper', 'Balloon Popper', 'Pop balloons before they float away.',                                                '🎈'),
  ('match-game',     'Match Game',     'Match pairs of items as quickly as possible.',                                        '👣'),
  ('dots-boxes',     'Dots & Boxes',   'Claim boxes by completing their four sides before the CPU.',                          '⏹️'),
  ('pizza-time',   'Pizza Time',   'Serve pizzas to your hungry customers.',   '🍕'),
  ('snake-escape',   'Snake Escape',   'Launch snakes off the grid in the right order — one wrong move and it''s game over.', '🐍');

-- ── Seed users (dev / demo accounts) ──────────────────────────────────────────

INSERT INTO users (id, username, email, oauth_provider, oauth_id, avatar_url, xp) VALUES
  ('00000000-0000-0000-0000-000000000001', 'speedrunner99', 'test1@example.com', 'google', 'test_google_001', 'https://api.dicebear.com/9.x/bottts/svg?seed=speedrunner99', 480),
  ('00000000-0000-0000-0000-000000000002', 'pixel_knight',  'test2@example.com', 'github', 'test_github_002', 'https://api.dicebear.com/9.x/bottts/svg?seed=pixel_knight',  310),
  ('00000000-0000-0000-0000-000000000003', 'arcade_nova',   'test3@example.com', 'google', 'test_google_003', 'https://api.dicebear.com/9.x/bottts/svg?seed=arcade_nova',   150);

-- ── Seed scores ───────────────────────────────────────────────────────────────

INSERT INTO scores (user_id, game_id, score)
SELECT '00000000-0000-0000-0000-000000000001'::uuid, id, 50 FROM games WHERE slug = 'typing-speed'   UNION ALL
SELECT '00000000-0000-0000-0000-000000000002'::uuid, id, 20 FROM games WHERE slug = 'typing-speed'   UNION ALL
SELECT '00000000-0000-0000-0000-000000000003'::uuid, id,  8 FROM games WHERE slug = 'typing-speed'   UNION ALL
SELECT '00000000-0000-0000-0000-000000000001'::uuid, id, 10 FROM games WHERE slug = 'reaction-grid'  UNION ALL
SELECT '00000000-0000-0000-0000-000000000002'::uuid, id, 17 FROM games WHERE slug = 'reaction-grid'  UNION ALL
SELECT '00000000-0000-0000-0000-000000000003'::uuid, id, 13 FROM games WHERE slug = 'reaction-grid'  UNION ALL
SELECT '00000000-0000-0000-0000-000000000001'::uuid, id, 11 FROM games WHERE slug = 'pattern-memory' UNION ALL
SELECT '00000000-0000-0000-0000-000000000002'::uuid, id,  8 FROM games WHERE slug = 'pattern-memory' UNION ALL
SELECT '00000000-0000-0000-0000-000000000003'::uuid, id,  6 FROM games WHERE slug = 'pattern-memory' UNION ALL
SELECT '00000000-0000-0000-0000-000000000001'::uuid, id, 24 FROM games WHERE slug = 'quick-math'     UNION ALL
SELECT '00000000-0000-0000-0000-000000000002'::uuid, id, 19 FROM games WHERE slug = 'quick-math'     UNION ALL
SELECT '00000000-0000-0000-0000-000000000003'::uuid, id,  9 FROM games WHERE slug = 'quick-math'     UNION ALL
SELECT '00000000-0000-0000-0000-000000000001'::uuid, id, 50 FROM games WHERE slug = 'color-sort'     UNION ALL
SELECT '00000000-0000-0000-0000-000000000002'::uuid, id, 80 FROM games WHERE slug = 'color-sort'     UNION ALL
SELECT '00000000-0000-0000-0000-000000000003'::uuid, id, 30 FROM games WHERE slug = 'color-sort'     UNION ALL
SELECT '00000000-0000-0000-0000-000000000001'::uuid, id, 22 FROM games WHERE slug = 'balloon-popper' UNION ALL
SELECT '00000000-0000-0000-0000-000000000002'::uuid, id, 19 FROM games WHERE slug = 'balloon-popper' UNION ALL
SELECT '00000000-0000-0000-0000-000000000003'::uuid, id, 12 FROM games WHERE slug = 'balloon-popper';
