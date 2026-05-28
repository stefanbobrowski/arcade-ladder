import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { Pool } from 'pg';

declare module 'fastify' {
  interface FastifyInstance {
    db: Pool;
  }
}

const dbPlugin: FastifyPluginAsync = fp(async (fastify) => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  // Verify connection on startup
  const client = await pool.connect();
  client.release();
  fastify.log.info('Connected to PostgreSQL');

  fastify.decorate('db', pool);

  fastify.addHook('onClose', async () => {
    await pool.end();
  });
});

export { dbPlugin };
