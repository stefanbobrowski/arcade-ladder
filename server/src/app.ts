import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';

import { dbPlugin } from './plugins/db';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { gameRoutes } from './routes/games';
import { scoreRoutes } from './routes/scores';
import { ladderRoutes } from './routes/ladder';

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
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(cookie, {
    secret: process.env.COOKIE_SECRET ?? 'change-me-in-production',
  });

  await app.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'change-me-in-production',
    sign: { expiresIn: '7d' },
    cookie: {
      cookieName: 'arcade_token',
      signed: false,
    },
  });

  await app.register(dbPlugin);

  // ── Routes ─────────────────────────────────────────────────────────────────

  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(userRoutes, { prefix: '/api/v1/users' });
  await app.register(gameRoutes, { prefix: '/api/v1/games' });
  await app.register(scoreRoutes, { prefix: '/api/v1/games' });
  await app.register(ladderRoutes, { prefix: '/api/v1/ladder' });

  // ── Health check ───────────────────────────────────────────────────────────

  app.get('/health', async () => ({ status: 'ok' }));

  return app;
}
