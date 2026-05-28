import { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../plugins/auth';

export const userRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /users/:username — public profile
  fastify.get('/:username', async (request, reply) => {
    const { username } = request.params as { username: string };
    const { rows } = await fastify.db.query(
      `SELECT u.id, u.username, u.avatar_url, u.chosen_avatar, u.xp, u.created_at,
              COALESCE(ts.total_score, 0) AS total_score
       FROM users u
       LEFT JOIN (
         SELECT user_id, SUM(best_score) AS total_score
         FROM (
           SELECT user_id, game_id, MAX(score) AS best_score
           FROM scores GROUP BY user_id, game_id
         ) best
         GROUP BY user_id
       ) ts ON ts.user_id = u.id
       WHERE u.username = $1`,
      [username]
    );
    if (!rows[0]) return reply.code(404).send({ error: 'User not found' });
    return rows[0];
  });

  // GET /users/:username/rankings — public per-game rankings for any user
  fastify.get('/:username/rankings', async (request, reply) => {
    const { username } = request.params as { username: string };
    const { rows: userRows } = await fastify.db.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );
    if (!userRows[0]) return reply.code(404).send({ error: 'User not found' });
    const userId = userRows[0].id as string;
    const { rows } = await fastify.db.query(
      `SELECT
         g.slug, g.title, g.emoji,
         user_best.best_score,
         user_best.play_count,
         ranked.rank,
         total.total_players,
         ROUND((1 - ranked.rank::numeric / NULLIF(total.total_players, 0)) * 100) AS percentile
       FROM games g
       LEFT JOIN (
         SELECT game_id, MAX(score) AS best_score, COUNT(*) AS play_count
         FROM scores WHERE user_id = $1
         GROUP BY game_id
       ) user_best ON user_best.game_id = g.id
       LEFT JOIN (
         SELECT game_id, user_id,
           RANK() OVER (PARTITION BY game_id ORDER BY MAX(score) DESC)::int AS rank
         FROM scores GROUP BY game_id, user_id
       ) ranked ON ranked.game_id = g.id AND ranked.user_id = $1
       LEFT JOIN (
         SELECT game_id, COUNT(DISTINCT user_id) AS total_players
         FROM scores GROUP BY game_id
       ) total ON total.game_id = g.id
       WHERE g.is_active = TRUE
       ORDER BY g.title`,
      [userId]
    );
    return rows;
  });

  // PATCH /users/me — update own profile (username or chosen_avatar)
  fastify.patch('/me', { preHandler: requireAuth }, async (request, reply) => {
    const payload = request.user as { sub: string };
    const { username, chosen_avatar } = request.body as {
      username?: string;
      chosen_avatar?: string;
    };

    const fields: string[] = [];
    const values: unknown[] = [];

    if (username !== undefined) {
      fields.push(`username = $${fields.length + 1}`);
      values.push(username);
    }
    if (chosen_avatar !== undefined) {
      fields.push(`chosen_avatar = $${fields.length + 1}`);
      values.push(chosen_avatar);
    }
    if (fields.length === 0)
      return reply.code(400).send({ error: 'Nothing to update' });

    values.push(payload.sub);
    const { rows } = await fastify.db.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${values.length}
       RETURNING id, username, avatar_url, chosen_avatar, xp`,
      values
    );
    return rows[0];
  });

  // GET /users/me/rankings — current user's rank in every game
  fastify.get('/me/rankings', { preHandler: requireAuth }, async (request) => {
    const payload = request.user as { sub: string };
    const { rows } = await fastify.db.query(
      `SELECT
         g.slug, g.title, g.emoji,
         user_best.best_score,
         user_best.play_count,
         ranked.rank,
         total.total_players,
         ROUND((1 - ranked.rank::numeric / NULLIF(total.total_players, 0)) * 100) AS percentile
       FROM games g
       LEFT JOIN (
         SELECT game_id, MAX(score) AS best_score, COUNT(*) AS play_count
         FROM scores WHERE user_id = $1
         GROUP BY game_id
       ) user_best ON user_best.game_id = g.id
       LEFT JOIN (
         SELECT game_id, user_id,
           RANK() OVER (PARTITION BY game_id ORDER BY MAX(score) DESC)::int AS rank
         FROM scores GROUP BY game_id, user_id
       ) ranked ON ranked.game_id = g.id AND ranked.user_id = $1
       LEFT JOIN (
         SELECT game_id, COUNT(DISTINCT user_id) AS total_players
         FROM scores GROUP BY game_id
       ) total ON total.game_id = g.id
       WHERE g.is_active = TRUE
       ORDER BY g.title`,
      [payload.sub]
    );
    return rows;
  });
};
