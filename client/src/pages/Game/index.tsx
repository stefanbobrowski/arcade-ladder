import { useEffect, useState, lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/client';
import type { Game, LeaderboardEntry } from '../../types';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../../components/ui/Avatar';
import styles from './Game.module.scss';

const GAME_COMPONENTS: Record<
  string,
  React.LazyExoticComponent<
    React.ComponentType<import('../../types').GameProps>
  >
> = {
  'typing-speed': lazy(() => import('../../games/TypingSpeed')),
  'reaction-grid': lazy(() => import('../../games/ReactionGrid')),
  'pattern-memory': lazy(() => import('../../games/PatternMemory')),
  'quick-math': lazy(() => import('../../games/QuickMath')),
  'color-sort': lazy(() => import('../../games/ColorSort')),
  'balloon-popper': lazy(() => import('../../games/BalloonPopper')),
};

export default function Game() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();

  const [game, setGame] = useState<Game | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentScore, setCurrentScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [xpEarned, setXpEarned] = useState(0);

  useEffect(() => {
    if (!slug) return;
    api.get<Game>(`/games/${slug}`).then((r) => setGame(r.data));
    refreshLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  function refreshLeaderboard() {
    if (!slug) return;
    api
      .get<LeaderboardEntry[]>(`/games/${slug}/leaderboard`)
      .then((r) => setLeaderboard(r.data));
  }

  function handleStart() {
    setCurrentScore(0);
    setGameOver(false);
    setIsPlaying(true);
  }

  async function handleGameOver(score: number) {
    setIsPlaying(false);
    setFinalScore(score);
    setGameOver(true);

    if (user && slug) {
      const { data } = await api.post(`/games/${slug}/scores`, { score });
      setMyRank(data.rank);
      setXpEarned(data.xp_earned);
      refreshLeaderboard();
    }
  }

  const GameComponent = slug ? GAME_COMPONENTS[slug] : undefined;

  if (!game) return <div className={styles.loading}>Loading...</div>;

  return (
    <div className={styles.layout}>
      {/* Game panel */}
      <div className={styles.gamePanel}>
        <div className={styles.gameHeader}>
          <h1 className={styles.gameTitle}>{game.title}</h1>
          <div className={styles.scoreDisplay}>
            <span className={styles.scoreLabel}>Score</span>
            <span className={styles.scoreValue}>
              {currentScore.toLocaleString()}
            </span>
          </div>
        </div>

        <div className={styles.gameContainer}>
          {!isPlaying && !gameOver && (
            <div className={styles.startScreen}>
              <div className={styles.gameEmoji}>{game.emoji}</div>
              <h2>{game.title}</h2>
              <p className={styles.gameDesc}>{game.description}</p>
              {user ? (
                <button className={styles.startBtn} onClick={handleStart}>
                  ▶ Play
                </button>
              ) : (
                <p className={styles.loginPrompt}>
                  Sign in to submit your score
                </p>
              )}
            </div>
          )}

          {gameOver && (
            <div className={styles.gameOverScreen}>
              <h2>Game Over</h2>
              <div className={styles.finalScore}>
                {finalScore.toLocaleString()}
              </div>
              {myRank && (
                <div className={styles.rankResult}>Rank #{myRank}</div>
              )}
              {xpEarned > 0 && (
                <div className={styles.xpResult}>+{xpEarned} XP</div>
              )}
              <button className={styles.startBtn} onClick={handleStart}>
                Play Again
              </button>
            </div>
          )}

          {isPlaying && GameComponent && (
            <Suspense
              fallback={<div className={styles.loading}>Loading game...</div>}
            >
              <GameComponent
                isPlaying={isPlaying}
                onScoreUpdate={setCurrentScore}
                onGameOver={handleGameOver}
              />
            </Suspense>
          )}
        </div>
      </div>

      {/* Leaderboard sidebar */}
      <aside className={styles.sidebar}>
        <h2 className={styles.sidebarTitle}>🏆 Top Players</h2>
        <ol className={styles.leaderboardList}>
          {leaderboard.map((entry) => (
            <li
              key={entry.user_id}
              className={`${styles.leaderboardRow} ${user?.id === entry.user_id ? styles.myRow : ''}`}
            >
              <span className={styles.entryRank}>
                {rankDisplay(entry.rank)}
              </span>
              <Avatar
                user={{
                  avatar_url: entry.avatar_url,
                  chosen_avatar: entry.chosen_avatar,
                  username: entry.username,
                }}
                size={28}
              />
              <span className={styles.entryName}>{entry.username}</span>
              <span className={styles.entryScore}>
                {entry.best_score.toLocaleString()}
              </span>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}

function rankDisplay(rank: number) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return rank;
}
