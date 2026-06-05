import { useEffect, useState, lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { Medal } from '@phosphor-icons/react';
import api from '../../api/client';
import type { Game, LadderEntry } from '../../types';
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
  'solution-color-sort': lazy(() => import('../../games/ColorSort')),
  'balloon-popper': lazy(() => import('../../games/BalloonPopper')),
  'match-game': lazy(() => import('../../games/MatchGame')),
  'dots-boxes': lazy(() => import('../../games/DotsBoxes')),
  'pizza-time': lazy(() => import('../../games/PizzaTime')),
  'all-in-blackjack': lazy(() => import('../../games/AllInBlackjack')),
  'city-insect': lazy(() => import('../../games/CityInsect')),
  'snake-escape': lazy(() => import('../../games/SnakeEscape')),
};

export default function Game() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();

  const [game, setGame] = useState<Game | null>(null);
  const [ladder, setLadder] = useState<LadderEntry[]>([]);
  const [_currentScore, setCurrentScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [totalPlayers, setTotalPlayers] = useState<number>(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [recentScores, setRecentScores] = useState<
    { score: number; created_at: string }[]
  >([]);

  useEffect(() => {
    if (!slug) return;
    api.get<Game>(`/games/${slug}`).then((r) => setGame(r.data));
    refreshLadder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  function refreshLadder() {
    if (!slug) return;
    api
      .get<LadderEntry[]>(`/games/${slug}/ladder`)
      .then((r) => setLadder(r.data));
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
      setTotalPlayers(data.total_players ?? 0);
      setXpEarned(data.xp_earned);
      setRecentScores(data.recent_scores ?? []);
      refreshLadder();
    }
  }

  const GameComponent = slug ? GAME_COMPONENTS[slug] : undefined;
  const myBest = user
    ? (ladder.find((e) => e.user_id === user.id)?.best_score ?? null)
    : null;

  if (!game) return <div className={styles.loading}>Loading...</div>;

  return (
    <div className={styles.layout}>
      {/* Game panel */}
      <div className={styles.gamePanel}>
        <div className={styles.gameHeader}>
          <h1 className={styles.gameTitle}>{game.title}</h1>
          <div className={styles.scoreDisplay}>
            <span className={styles.scoreLabel}>Your Best</span>
            <span className={styles.scoreValue}>
              {myBest != null ? myBest.toLocaleString() : '—'}
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
                  Sign in to play and submit your score
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
                <div className={styles.rankResult}>
                  Rank #{myRank}
                  {totalPlayers > 0 && (
                    <span className={styles.rankTotal}> of {totalPlayers}</span>
                  )}
                </div>
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

      {/* Ladder sidebar */}
      <aside className={styles.sidebar}>
        <h2 className={styles.sidebarTitle}>🏆 Top Players</h2>
        <ol className={styles.ladderList}>
          {ladder.map((entry) => (
            <li
              key={entry.user_id}
              className={`${styles.ladderRow} ${user?.id === entry.user_id ? styles.myRow : ''}`}
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
        {recentScores.length > 0 && user && (
          <div className={styles.myRecentSection}>
            <h3 className={styles.myRecentTitle}>Your Recent Scores</h3>
            <ol className={styles.recentList}>
              {recentScores.map((s, i) => (
                <li key={i} className={i === 0 ? styles.recentBest : ''}>
                  {s.score.toLocaleString()}
                </li>
              ))}
            </ol>
          </div>
        )}
      </aside>
    </div>
  );
}

const MEDAL_COLORS: Record<number, string> = {
  1: '#f59e0b',
  2: '#94a3b8',
  3: '#b45309',
};

function rankDisplay(rank: number) {
  if (rank <= 3)
    return <Medal size={18} weight='fill' color={MEDAL_COLORS[rank]} />;
  return rank;
}
