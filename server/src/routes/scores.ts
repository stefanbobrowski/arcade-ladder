import { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../plugins/auth';

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

      // Return new rank
      const { rows: rankRows } = await fastify.db.query(
        `SELECT rank FROM (
         SELECT user_id, RANK() OVER (ORDER BY MAX(score) DESC)::int AS rank
         FROM scores WHERE game_id = $1 GROUP BY user_id
       ) r WHERE user_id = $2`,
        [gameId, payload.sub]
      );

      return {
        success: true,
        rank: rankRows[0]?.rank ?? null,
        xp_earned: xpEarned,
      };
    }
  );

  // GET /games/:slug/leaderboard — top 50
  fastify.get('/:slug/leaderboard', async (request, reply) => {
    const { slug } = request.params as { slug: string };
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
    return rows;
  });

  // GET /games/:slug/leaderboard/me — current user rank + neighbors
  fastify.get(
    '/:slug/leaderboard/me',
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
