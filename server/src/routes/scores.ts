import { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../plugins/auth';
import { cache } from '../lib/cache';

const TTL_60S = 60_000;

export const scoreRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /games/:slug/scores — submit a score
  fastify.post(
    '/:slug/scores',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { slug } = request.params as { slug: string };
      const { score } = request.body as { score: number };

      if (typeof score !== 'number' || score < 0 || !Number.isInteger(score)) {
        return reply
          .code(400)
          .send({ error: 'score must be a non-negative integer' });
      }

      const payload = request.user as { sub: string };

      const { rows: gameRows } = await fastify.db.query(
        'SELECT id FROM games WHERE slug = $1 AND is_active = TRUE',
        [slug]
      );
      if (!gameRows[0])
        return reply.code(404).send({ error: 'Game not found' });

      const gameId = gameRows[0].id as string;

      await fastify.db.query(
        'INSERT INTO scores (user_id, game_id, score) VALUES ($1, $2, $3)',
        [payload.sub, gameId, score]
      );

      // Award XP
      const xpEarned = await computeXp(fastify.db, payload.sub, gameId, score);
      if (xpEarned > 0) {
        await fastify.db.query('UPDATE users SET xp = xp + $1 WHERE id = $2', [
          xpEarned,
          payload.sub,
        ]);
      }

      // Return new rank + total players + recent personal scores (all in 2 queries)
      const [rankResult, recentResult] = await Promise.all([
        fastify.db.query(
          `SELECT rank, total_players FROM (
             SELECT user_id,
               RANK() OVER (ORDER BY MAX(score) DESC)::int AS rank,
               COUNT(*) OVER ()::int AS total_players
             FROM scores WHERE game_id = $1 GROUP BY user_id
           ) r WHERE user_id = $2`,
          [gameId, payload.sub]
        ),
        fastify.db.query(
          `SELECT score, created_at FROM scores
           WHERE game_id = $1 AND user_id = $2
           ORDER BY created_at DESC LIMIT 5`,
          [gameId, payload.sub]
        ),
      ]);

      // Bust ladder caches so next read is fresh
      cache.delete('ladder:top');
      cache.delete('ladder:activity');
      cache.delete('ladder:stats');
      cache.delete(`ladder:game:${slug}`);

      return {
        success: true,
        rank: rankResult.rows[0]?.rank ?? null,
        total_players: rankResult.rows[0]?.total_players ?? 1,
        xp_earned: xpEarned,
        recent_scores: recentResult.rows,
      };
    }
  );

  // GET /games/:slug/ladder — top 50
  fastify.get('/:slug/ladder', async (request, reply) => {
    const { slug } = request.params as { slug: string };

    const cacheKey = `ladder:game:${slug}`;
    const cached = cache.get<unknown[]>(cacheKey);
    if (cached) return cached;

    const { rows: gameRows } = await fastify.db.query(
      'SELECT id FROM games WHERE slug = $1 AND is_active = TRUE',
      [slug]
    );
    if (!gameRows[0]) return reply.code(404).send({ error: 'Game not found' });

    const { rows } = await fastify.db.query(
      `SELECT
         RANK() OVER (ORDER BY MAX(s.score) DESC)::int AS rank,
         u.id AS user_id, u.username, u.avatar_url, u.chosen_avatar,
         MAX(s.score) AS best_score,
         COUNT(s.id)::int AS play_count
       FROM scores s
       JOIN users u ON s.user_id = u.id
       WHERE s.game_id = $1
       GROUP BY u.id, u.username, u.avatar_url, u.chosen_avatar
       ORDER BY best_score DESC
       LIMIT 50`,
      [gameRows[0].id]
    );
    cache.set(cacheKey, rows, TTL_60S);
    return rows;
  });

  // GET /games/:slug/ladder/me — current user rank + neighbors
  fastify.get(
    '/:slug/ladder/me',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { slug } = request.params as { slug: string };
      const payload = request.user as { sub: string };

      const { rows: gameRows } = await fastify.db.query(
        'SELECT id FROM games WHERE slug = $1 AND is_active = TRUE',
        [slug]
      );
      if (!gameRows[0])
        return reply.code(404).send({ error: 'Game not found' });
      const gameId = gameRows[0].id as string;

      const { rows } = await fastify.db.query(
        `WITH ranked AS (
         SELECT user_id, MAX(score) AS best_score,
           RANK() OVER (ORDER BY MAX(score) DESC)::int AS rank,
           COUNT(*) OVER ()::int AS total_players
         FROM scores WHERE game_id = $1 GROUP BY user_id
       )
       SELECT r.rank, r.best_score, r.total_players,
         u.username, u.avatar_url, u.chosen_avatar
       FROM ranked r JOIN users u ON r.user_id = u.id
       WHERE r.user_id = $2`,
        [gameId, payload.sub]
      );

      if (!rows[0]) return { rank: null, best_score: null, total_players: 0 };
      return rows[0];
    }
  );
};

// ── XP helper ─────────────────────────────────────────────────────────────────

import { Pool } from 'pg';

async function computeXp(
  _db: Pool,
  _userId: string,
  _gameId: string,
  _newScore: number
): Promise<number> {
  return 10; // flat 10 XP per play
}
