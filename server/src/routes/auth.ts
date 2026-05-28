import { FastifyPluginAsync } from 'fastify';

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // ── Google OAuth ───────────────────────────────────────────────────────────

  fastify.get('/google', async (request, reply) => {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: `${process.env.API_BASE_URL}/api/v1/auth/google/callback`,
      response_type: 'code',
      scope: 'openid email profile',
    });
    reply.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  });

  fastify.get('/google/callback', async (request, reply) => {
    const { code } = request.query as { code: string };
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.API_BASE_URL}/api/v1/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });
    const tokens = (await tokenRes.json()) as { access_token: string };
    const profileRes = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
    );
    const profile = (await profileRes.json()) as {
      sub: string;
      email: string;
      name: string;
      picture: string;
    };
    const user = await upsertUser(fastify.db, {
      oauthProvider: 'google',
      oauthId: profile.sub,
      email: profile.email,
      username: await generateUsername(fastify.db, profile.name),
      avatarUrl: profile.picture,
    });
    const token = fastify.jwt.sign({ sub: user.id, username: user.username });
    reply.redirect(`${process.env.CLIENT_ORIGIN}?token=${token}`);
  });

  // ── GitHub OAuth ───────────────────────────────────────────────────────────

  fastify.get('/github', async (request, reply) => {
    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID!,
      redirect_uri: `${process.env.API_BASE_URL}/api/v1/auth/github/callback`,
      scope: 'read:user user:email',
    });
    reply.redirect(`https://github.com/login/oauth/authorize?${params}`);
  });

  fastify.get('/github/callback', async (request, reply) => {
    const { code } = request.query as { code: string };
    const tokenRes = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID!,
          client_secret: process.env.GITHUB_CLIENT_SECRET!,
          code,
        }),
      }
    );
    const tokens = (await tokenRes.json()) as { access_token: string };
    const profileRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'User-Agent': 'arcade-ladder',
      },
    });
    const emailRes = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'User-Agent': 'arcade-ladder',
      },
    });
    const profile = (await profileRes.json()) as {
      id: number;
      login: string;
      name: string;
      avatar_url: string;
    };
    const emails = (await emailRes.json()) as Array<{
      email: string;
      primary: boolean;
    }>;
    const primaryEmail = emails.find((e) => e.primary)?.email ?? '';
    const user = await upsertUser(fastify.db, {
      oauthProvider: 'github',
      oauthId: String(profile.id),
      email: primaryEmail,
      username: await generateUsername(fastify.db, profile.login),
      avatarUrl: profile.avatar_url,
    });
    const token = fastify.jwt.sign({ sub: user.id, username: user.username });
    reply.redirect(`${process.env.CLIENT_ORIGIN}?token=${token}`);
  });

  // ── Session ────────────────────────────────────────────────────────────────

  fastify.get(
    '/me',
    {
      preHandler: async (request, reply) => {
        try {
          await request.jwtVerify();
        } catch {
          reply.code(401).send({ error: 'Unauthorized' });
        }
      },
    },
    async (request) => {
      const payload = request.user as { sub: string };
      const { rows } = await fastify.db.query(
        'SELECT id, username, email, avatar_url, chosen_avatar, xp, created_at FROM users WHERE id = $1',
        [payload.sub]
      );
      return rows[0] ?? null;
    }
  );

  fastify.post('/logout', async (_request, reply) => {
    // JWT is stateless — client just drops the token
    reply.send({ success: true });
  });
};

// ── Helpers ──────────────────────────────────────────────────────────────────

import { Pool } from 'pg';

async function upsertUser(
  db: Pool,
  data: {
    oauthProvider: string;
    oauthId: string;
    email: string;
    username: string;
    avatarUrl: string;
  }
) {
  const { rows } = await db.query<{ id: string; username: string }>(
    `INSERT INTO users (oauth_provider, oauth_id, email, username, avatar_url)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (oauth_provider, oauth_id)
     DO UPDATE SET avatar_url = EXCLUDED.avatar_url
     RETURNING id, username`,
    [
      data.oauthProvider,
      data.oauthId,
      data.email,
      data.username,
      data.avatarUrl,
    ]
  );
  return rows[0];
}

async function generateUsername(
  db: Pool,
  displayName: string
): Promise<string> {
  const base = displayName.replace(/\s+/g, '').slice(0, 20);
  const { rows } = await db.query(
    'SELECT username FROM users WHERE username = $1',
    [base]
  );
  if (rows.length === 0) return base;
  // Append random suffix if taken
  return `${base}${Math.floor(Math.random() * 9000) + 1000}`;
}
