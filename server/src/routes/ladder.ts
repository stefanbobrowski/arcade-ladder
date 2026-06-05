import { FastifyPluginAsync } from 'fastify';
import { cache } from '../lib/cache';

const TTL_60S = 60_000;
const TTL_30S = 30_000;

export const ladderRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /ladder/top — top 10 overall (for home page podium)
  fastify.get('/top', async () => {
    const cached = cache.get<unknown[]>('ladder:top');
    if (cached) return cached;

    const { rows } = await fastify.db.query(
      `SELECT
         RANK() OVER (ORDER BY SUM(best.best_score) DESC)::int AS rank,
         u.id AS user_id, u.username, u.avatar_url, u.chosen_avatar,
         SUM(best.best_score) AS total_score
       FROM (
         SELECT user_id, game_id, MAX(score) AS best_score
         FROM scores GROUP BY user_id, game_id
       ) best
       JOIN users u ON best.user_id = u.id
       GROUP BY u.id, u.username, u.avatar_url, u.chosen_avatar
       ORDER BY total_score DESC
       LIMIT 10`
    );
    cache.set('ladder:top', rows, TTL_60S);
    return rows;
  });

  // GET /ladder/activity — recent events for live activity feed
  fastify.get('/activity', async () => {
    const cached = cache.get<unknown[]>('ladder:activity');
    if (cached) return cached;

    const { rows } = await fastify.db.query(
      `SELECT
         u.username, u.avatar_url, u.chosen_avatar,
         g.title AS game_title, g.slug AS game_slug,
         s.score, s.created_at,
         CASE WHEN s.score = pb.best_score AND ranked.rank <= 3 THEN ranked.rank ELSE NULL END AS podium_rank
       FROM scores s
       JOIN users u ON s.user_id = u.id
       JOIN games g ON s.game_id = g.id
       LEFT JOIN (
         SELECT game_id, user_id, MAX(score) AS best_score
         FROM scores GROUP BY game_id, user_id
       ) pb ON pb.game_id = s.game_id AND pb.user_id = s.user_id
       LEFT JOIN (
         SELECT game_id, user_id,
           RANK() OVER (PARTITION BY game_id ORDER BY MAX(score) DESC)::int AS rank
         FROM scores GROUP BY game_id, user_id
       ) ranked ON ranked.game_id = s.game_id AND ranked.user_id = s.user_id
       ORDER BY s.created_at DESC
       LIMIT 50`
    );
    cache.set('ladder:activity', rows, TTL_30S);
    return rows;
  });

  // GET /ladder/stats — site-wide stat cards
  fastify.get('/stats', async () => {
    const cached = cache.get<unknown>('ladder:stats');
    if (cached) return cached;

    const { rows } = await fastify.db.query(
      `SELECT
         (SELECT COUNT(*) FROM users)::int AS total_players,
         (SELECT COUNT(*) FROM scores)::int AS total_plays,
         (SELECT COUNT(*) FROM games WHERE is_active = TRUE)::int AS games_available,
         (SELECT COUNT(DISTINCT user_id) FROM scores WHERE created_at > NOW() - INTERVAL '24 hours')::int AS active_today`
    );
    cache.set('ladder:stats', rows[0], TTL_30S);
    return rows[0];
  });
};
