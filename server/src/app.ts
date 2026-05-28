import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';

import { dbPlugin } from './plugins/db';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { gameRoutes } from './routes/games';
import { scoreRoutes } from './routes/scores';
import { leaderboardRoutes } from './routes/leaderboard';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
  });

  // ── Plugins ────────────────────────────────────────────────────────────────

  await app.register(cors, {
    origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  });

  await app.register(cookie, {
    secret: process.env.COOKIE_SECRET ?? 'change-me-in-production',
  });

  await app.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'change-me-in-production',
    sign: { expiresIn: '1h' },
  });

  await app.register(dbPlugin);

  // ── Routes ─────────────────────────────────────────────────────────────────

  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(userRoutes, { prefix: '/api/v1/users' });
  await app.register(gameRoutes, { prefix: '/api/v1/games' });
  await app.register(scoreRoutes, { prefix: '/api/v1/games' });
  await app.register(leaderboardRoutes, { prefix: '/api/v1/leaderboard' });

  // ── Health check ───────────────────────────────────────────────────────────

  app.get('/health', async () => ({ status: 'ok' }));

  return app;
}
