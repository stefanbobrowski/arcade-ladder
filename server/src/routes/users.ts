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
         GREATEST(1, ROUND(ranked.rank::numeric / NULLIF(total.total_players, 0) * 100)) AS percentile
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
      chosen_avatar?: string | null;
    };

    const setClauses: string[] = [];
    const values: unknown[] = [];

    if (username !== undefined) {
      // Format validation
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        return reply.code(400).send({
          error:
            'Username must be 3–20 characters: letters, numbers, and underscores only.',
        });
      }
      if (/^_|_$|_{2,}/.test(username)) {
        return reply.code(400).send({
          error:
            'Username cannot start or end with an underscore, or have consecutive underscores.',
        });
      }

      // Duplicate check (case-insensitive)
      const { rows: dup } = await fastify.db.query(
        'SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id != $2',
        [username, payload.sub]
      );
      if (dup.length > 0) {
        return reply
          .code(409)
          .send({ error: 'That username is already taken.' });
      }

      // Rate limit: once every 30 days
      const { rows: cur } = await fastify.db.query(
        'SELECT username_changed_at FROM users WHERE id = $1',
        [payload.sub]
      );
      const changedAt: string | null = cur[0]?.username_changed_at ?? null;
      if (changedAt) {
        const daysSince =
          (Date.now() - new Date(changedAt).getTime()) / 86_400_000;
        if (daysSince < 30) {
          const daysLeft = Math.ceil(30 - daysSince);
          return reply.code(429).send({
            error: `You can change your username again in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`,
          });
        }
      }

      setClauses.push(`username = $${values.length + 1}`);
      values.push(username);
      setClauses.push('username_changed_at = NOW()');
    }

    if (chosen_avatar !== undefined) {
      setClauses.push(`chosen_avatar = $${values.length + 1}`);
      values.push(chosen_avatar);
    }

    if (setClauses.length === 0)
      return reply.code(400).send({ error: 'Nothing to update' });

    values.push(payload.sub);
    const { rows } = await fastify.db.query(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${values.length}
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
         GREATEST(1, ROUND(ranked.rank::numeric / NULLIF(total.total_players, 0) * 100)) AS percentile
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
