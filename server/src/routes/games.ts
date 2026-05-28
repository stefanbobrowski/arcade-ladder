import { FastifyPluginAsync } from 'fastify';

export const gameRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /games — list all active games
  fastify.get('/', async () => {
    const { rows } = await fastify.db.query(
      `SELECT id, slug, title, description, emoji,
         (SELECT COUNT(*) FROM scores s WHERE s.game_id = games.id) AS total_plays
       FROM games WHERE is_active = TRUE ORDER BY title`
    );
    return rows;
  });

  // GET /games/:slug — single game details
  fastify.get('/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const { rows } = await fastify.db.query(
      `SELECT id, slug, title, description, emoji,
         (SELECT COUNT(*) FROM scores s WHERE s.game_id = games.id) AS total_plays
       FROM games WHERE slug = $1 AND is_active = TRUE`,
      [slug]
    );
    if (!rows[0]) return reply.code(404).send({ error: 'Game not found' });
    return rows[0];
  });
};
