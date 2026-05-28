import { FastifyPluginAsync } from 'fastify';

export const leaderboardRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /leaderboard/top — top 10 overall (for home page podium)
  fastify.get('/top', async () => {
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
    return rows;
  });

  // GET /leaderboard/activity — recent events for live activity feed
  fastify.get('/activity', async () => {
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
    return rows;
  });

  // GET /leaderboard/stats — site-wide stat cards
  fastify.get('/stats', async () => {
    const { rows } = await fastify.db.query(
      `SELECT
         (SELECT COUNT(*) FROM users) AS total_players,
         (SELECT COUNT(*) FROM scores) AS total_plays,
         (SELECT COUNT(*) FROM games WHERE is_active = TRUE) AS games_available`
    );
    return rows[0];
  });
};
