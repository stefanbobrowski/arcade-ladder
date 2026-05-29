-- Fill in missing seed scores so all 3 demo users appear on every game leaderboard.
-- Safe to run multiple times (scores are append-only; duplicates just add extra rows
-- which is normal game behaviour — each run is a separate play).

INSERT INTO scores (user_id, game_id, score)
-- ── color-sort ────────────────────────────────────────────────────────────────
SELECT '00000000-0000-0000-0000-000000000001'::uuid, id, 20 FROM games WHERE slug = 'color-sort'
UNION ALL
SELECT '00000000-0000-0000-0000-000000000001'::uuid, id, 50 FROM games WHERE slug = 'color-sort'
UNION ALL
SELECT '00000000-0000-0000-0000-000000000002'::uuid, id, 80 FROM games WHERE slug = 'color-sort'
UNION ALL
SELECT '00000000-0000-0000-0000-000000000002'::uuid, id, 10 FROM games WHERE slug = 'color-sort'
UNION ALL
SELECT '00000000-0000-0000-0000-000000000003'::uuid, id, 50 FROM games WHERE slug = 'color-sort'
UNION ALL
SELECT '00000000-0000-0000-0000-000000000003'::uuid, id, 30 FROM games WHERE slug = 'color-sort'
-- ── balloon-popper ────────────────────────────────────────────────────────────
UNION ALL
SELECT '00000000-0000-0000-0000-000000000001'::uuid, id, 18 FROM games WHERE slug = 'balloon-popper'
UNION ALL
SELECT '00000000-0000-0000-0000-000000000001'::uuid, id, 22 FROM games WHERE slug = 'balloon-popper'
UNION ALL
SELECT '00000000-0000-0000-0000-000000000002'::uuid, id, 14 FROM games WHERE slug = 'balloon-popper'
UNION ALL
SELECT '00000000-0000-0000-0000-000000000002'::uuid, id, 19 FROM games WHERE slug = 'balloon-popper'
UNION ALL
SELECT '00000000-0000-0000-0000-000000000003'::uuid, id,  9 FROM games WHERE slug = 'balloon-popper'
UNION ALL
SELECT '00000000-0000-0000-0000-000000000003'::uuid, id, 12 FROM games WHERE slug = 'balloon-popper'
-- ── pattern-memory (add missing users) ───────────────────────────────────────
UNION ALL
SELECT '00000000-0000-0000-0000-000000000001'::uuid, id, 11 FROM games WHERE slug = 'pattern-memory'
UNION ALL
SELECT '00000000-0000-0000-0000-000000000002'::uuid, id,  8 FROM games WHERE slug = 'pattern-memory'
-- ── quick-math (add missing users) ───────────────────────────────────────────
UNION ALL
SELECT '00000000-0000-0000-0000-000000000001'::uuid, id, 24 FROM games WHERE slug = 'quick-math'
UNION ALL
SELECT '00000000-0000-0000-0000-000000000002'::uuid, id, 19 FROM games WHERE slug = 'quick-math'
-- ── update XP to reflect full activity ───────────────────────────────────────
;

UPDATE users SET xp = 480 WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;
UPDATE users SET xp = 310 WHERE id = '00000000-0000-0000-0000-000000000002'::uuid;
UPDATE users SET xp = 150 WHERE id = '00000000-0000-0000-0000-000000000003'::uuid;
