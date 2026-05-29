export interface User {
  id: string;
  username: string;
  email: string;
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
  total_plays: number;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  avatar_url: string | null;
  chosen_avatar: string | null;
  best_score: number;
  play_count: number;
}

export interface OverallEntry {
  rank: number;
  user_id: string;
  username: string;
  avatar_url: string | null;
  chosen_avatar: string | null;
  total_score: number;
}

export interface ActivityEvent {
  username: string;
  avatar_url: string | null;
  chosen_avatar: string | null;
  game_title: string;
  game_slug: string;
  score: number;
  created_at: string;
  podium_rank: 1 | 2 | 3 | null;
}

export interface SiteStats {
  total_players: number;
  total_plays: number;
  games_available: number;
  active_today: number;
}

export interface UserRanking {
  slug: string;
  title: string;
  emoji: string | null;
  best_score: number | null;
  play_count: number;
  rank: number | null;
  total_players: number;
  percentile: number | null;
}

export interface GameProps {
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isPlaying: boolean;
}
