-- Run this once against your Cloud SQL (PostgreSQL) database
-- psql -h <host> -U <user> -d <db> -f 001_init.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Users ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username        VARCHAR(32) UNIQUE NOT NULL,
  email           VARCHAR(255) UNIQUE NOT NULL,
  oauth_provider  VARCHAR(20) NOT NULL,
  oauth_id        VARCHAR(255) NOT NULL,
  avatar_url      TEXT,
  chosen_avatar   VARCHAR(50),
  xp              INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (oauth_provider, oauth_id)
);

-- ── Games ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS games (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        VARCHAR(64) UNIQUE NOT NULL,
  title       VARCHAR(100) NOT NULL,
  description TEXT,
  emoji       VARCHAR(10),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Scores ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS scores (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id    UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  score      INTEGER NOT NULL CHECK (score >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scores_game_user_idx ON scores (game_id, user_id);
CREATE INDEX IF NOT EXISTS scores_game_score_idx ON scores (game_id, score DESC);
CREATE INDEX IF NOT EXISTS scores_created_at_idx ON scores (created_at DESC);

-- ── Seed games ────────────────────────────────────────────────────────────────

INSERT INTO games (slug, title, description, emoji) VALUES
  ('typing-speed',   'Typing Speed',   'Type words as fast and accurately as you can.', '⌨️'),
  ('reaction-grid',  'Reaction Grid',  'Click the highlighted tile before it moves.', '⚡'),
  ('pattern-memory', 'Pattern Memory', 'Watch the sequence, then repeat it.', '🧠'),
  ('quick-math',     'Quick Math',     'Answer arithmetic questions under time pressure.', '🔢'),
  ('color-sort',     'Color Sort',     'Sort falling items into the correct color bins.', '🎨'),
  ('balloon-popper', 'Balloon Popper', 'Pop balloons before they float away.', '🎈')
ON CONFLICT (slug) DO NOTHING;

-- ── Seed users (test accounts — remove or keep for local dev) ─────────────────

INSERT INTO users (id, username, email, oauth_provider, oauth_id, avatar_url, xp) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'speedrunner99',
    'test1@example.com',
    'google',
    'test_google_001',
    'https://api.dicebear.com/9.x/bottts/svg?seed=speedrunner99',
    1850
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'pixel_knight',
    'test2@example.com',
    'github',
    'test_github_002',
    'https://api.dicebear.com/9.x/bottts/svg?seed=pixel_knight',
    1200
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'arcade_nova',
    'test3@example.com',
    'google',
    'test_google_003',
    'https://api.dicebear.com/9.x/bottts/svg?seed=arcade_nova',
    740
  )
ON CONFLICT DO NOTHING;

-- ── Seed scores (references game slugs via subquery so IDs don't need to be known) ──

INSERT INTO scores (user_id, game_id, score)
SELECT '00000000-0000-0000-0000-000000000001'::uuid, id, 1850 FROM games WHERE slug = 'typing-speed'
UNION ALL
SELECT '00000000-0000-0000-0000-000000000002'::uuid, id, 1420 FROM games WHERE slug = 'typing-speed'
UNION ALL
SELECT '00000000-0000-0000-0000-000000000003'::uuid, id,  980 FROM games WHERE slug = 'typing-speed'
UNION ALL
SELECT '00000000-0000-0000-0000-000000000001'::uuid, id, 2100 FROM games WHERE slug = 'reaction-grid'
UNION ALL
SELECT '00000000-0000-0000-0000-000000000002'::uuid, id, 1750 FROM games WHERE slug = 'reaction-grid'
UNION ALL
SELECT '00000000-0000-0000-0000-000000000003'::uuid, id, 1300 FROM games WHERE slug = 'reaction-grid'
UNION ALL
SELECT '00000000-0000-0000-0000-000000000001'::uuid, id,  850 FROM games WHERE slug = 'pattern-memory'
UNION ALL
SELECT '00000000-0000-0000-0000-000000000002'::uuid, id,  620 FROM games WHERE slug = 'pattern-memory'
UNION ALL
SELECT '00000000-0000-0000-0000-000000000003'::uuid, id,  490 FROM games WHERE slug = 'quick-math';
