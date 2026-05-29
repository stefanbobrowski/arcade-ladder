import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import type { Game } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { MedalIcon } from '@phosphor-icons/react';
import styles from './Games.module.scss';

const MEDAL_COLORS: Record<number, string> = {
  1: '#f59e0b',
  2: '#a8bccf',
  3: '#c07030',
};

interface GameWithRank extends Game {
  user_rank?: number | null;
}

export default function Games() {
  const { user } = useAuth();
  const [games, setGames] = useState<GameWithRank[]>([]);

  useEffect(() => {
    api.get<Game[]>('/games').then((r) => setGames(r.data));
  }, []);

  useEffect(() => {
    if (!user) return;
    api
      .get<Array<{ slug: string; rank: number | null }>>('/users/me/rankings')
      .then((r) => {
        const rankMap = Object.fromEntries(r.data.map((x) => [x.slug, x.rank]));
        setGames((prev) =>
          prev.map((g) => ({ ...g, user_rank: rankMap[g.slug] ?? null }))
        );
      });
  }, [user]);

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Arcade</h1>
      <p className={styles.subheading}>Pick your game and climb the ranks</p>
      <div className={styles.grid}>
        {games.map((game) => (
          <GameCard key={game.slug} game={game} />
        ))}
      </div>
    </div>
  );
}

const GAME_GRADIENTS: Record<string, [string, string]> = {
  'balloon-popper': ['#1897be', '#000000'],
  'dots-boxes': ['#278adb', '#cc2a6b'],
  'typing-speed': ['#0284c7', '#0e7490'],
  'reaction-grid': ['#6d28d9', '#4338ca'],
  'pattern-memory': ['#047857', '#0f766e'],
  'quick-math': ['#1d4ed8', '#5b21b6'],
  'solution-color-sort': ['#db114e', '#0ddd4b'],
  'match-game': ['#7c3aed', '#06b6d4'],
  'pizza-time': ['#46250f', '#d46906'],
  'snake-escape': ['#d48336', '#0e5228'],
};

function GameCard({ game }: { game: GameWithRank }) {
  const [from, to] = GAME_GRADIENTS[game.slug] ?? ['#7c3aed', '#06b6d4'];
  const icon = game.emoji ?? '🎮';
  return (
    <div className={styles.card}>
      <div
        className={styles.thumbnail}
        style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
      >
        <span className={styles.emoji}>{icon}</span>
        {game.user_rank != null && game.user_rank <= 3 && (
          <span className={styles.rankBadge}>
            <MedalIcon
              size={14}
              weight='fill'
              color={MEDAL_COLORS[game.user_rank]}
            />
            #{game.user_rank}
          </span>
        )}
      </div>
      <div className={styles.cardBody}>
        <h2 className={styles.cardTitle}>{game.title}</h2>
        <div className={styles.cardMeta}>
          <span className={styles.plays}>
            {formatPlays(game.total_plays)} plays
          </span>
          {game.user_rank != null ? (
            <span className={styles.userRank}>
              Your rank: #{game.user_rank}
            </span>
          ) : (
            <span className={styles.notPlayed}>Not played</span>
          )}
        </div>
        <Link to={`/games/${game.slug}`} className={styles.playBtn}>
          ▶ Play Now
        </Link>
      </div>
    </div>
  );
}

function formatPlays(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}
