export interface User {
  id: string;
  username: string;
  email: string;
  oauth_provider: 'google' | 'github';
  oauth_id: string;
  avatar_url: string | null;
  chosen_avatar: string | null;
  xp: number;
  created_at: string;
}

export interface Game {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  emoji: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Score {
  id: string;
  user_id: string;
  game_id: string;
  score: number;
  created_at: string;
}

export interface LadderEntry {
  rank: number;
  user_id: string;
  username: string;
  avatar_url: string | null;
  chosen_avatar: string | null;
  best_score: number;
}

export interface OverallLadderEntry {
  rank: number;
  user_id: string;
  username: string;
  avatar_url: string | null;
  chosen_avatar: string | null;
  total_score: number;
}

// JWT payload shape
export interface JwtPayload {
  sub: string;
  username: string;
}

// Tell @fastify/jwt what shape our decoded token has
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}
