import { useEffect, useState, useRef } from 'react';
import type { GameProps } from '../../types';
import styles from './BalloonPopper.module.scss';

const GAME_DURATION = 30;
const BALLOON_COUNT = 10;

const EMOJI_POOL = ['🎈', '🎈', '🎈', '🎈', '🎈', '🎈', '⚫', '⚫', '🎁'];

const BALLOON_POINTS: Record<string, number> = {
  '🎈': 10,
  '⚫': -10,
  '🎁': 40,
};

function randomEmoji() {
  return EMOJI_POOL[Math.floor(Math.random() * EMOJI_POOL.length)];
}

function randomX() {
  return Math.floor(Math.random() * 75) + 5;
}

function randomBalloonVars() {
  const drift = (Math.random() * 120 - 60).toFixed(1);
  const midDrift = (Math.random() * 80 - 40).toFixed(1);
  const endRot = (Math.random() * 40 - 20).toFixed(1);
  const midRot = (Math.random() * 20 - 10).toFixed(1);
  const duration = (Math.random() * 2 + 2.5).toFixed(2);
  return {
    '--drift': `${drift}px`,
    '--mid-drift': `${midDrift}px`,
    '--end-rot': `${endRot}deg`,
    '--mid-rot': `${midRot}deg`,
    '--duration': `${duration}s`,
  } as React.CSSProperties;
}

interface Balloon {
  id: number;
  key: number;
  x: number;
  vars: React.CSSProperties;
  emoji: string;
  delay: number; // seconds, only for initial stagger
}

function makeBalloon(id: number, delay = 0): Balloon {
  return {
    id,
    key: 0,
    x: randomX(),
    vars: randomBalloonVars(),
    emoji: randomEmoji(),
    delay,
  };
}

function initialBalloons(): Balloon[] {
  return Array.from({ length: BALLOON_COUNT }, (_, i) =>
    makeBalloon(i, parseFloat((i * 0.4).toFixed(1)))
  );
}

export default function BalloonPopper({
  onScoreUpdate,
  onGameOver,
  isPlaying,
}: GameProps) {
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [balloons, setBalloons] = useState<Balloon[]>(initialBalloons);
  const scoreRef = useRef(0);

  // Reset when game starts
  useEffect(() => {
    if (isPlaying) {
      scoreRef.current = 0;
      setScore(0);
      setTimeLeft(GAME_DURATION);
      setBalloons(initialBalloons());
    }
  }, [isPlaying]);

  // Countdown
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Game over
  useEffect(() => {
    if (timeLeft === 0 && isPlaying) onGameOver(scoreRef.current);
  }, [timeLeft]);

  function respawn(id: number) {
    setBalloons((prev) =>
      prev.map((b) =>
        b.id === id
          ? {
              ...b,
              key: b.key + 1,
              x: randomX(),
              vars: randomBalloonVars(),
              emoji: randomEmoji(),
              delay: 0,
            }
          : b
      )
    );
  }

  function handlePop(id: number, emoji: string) {
    const pts = BALLOON_POINTS[emoji] ?? 10;
    scoreRef.current = Math.max(0, scoreRef.current + pts);
    setScore(scoreRef.current);
    onScoreUpdate(scoreRef.current);
    respawn(id);
  }

  return (
    <div className={styles.game}>
      <div className={styles.timer}>{timeLeft}s</div>
      <div className={styles.score}>{score}</div>
      {isPlaying &&
        balloons.map((b) => (
          <div
            key={`${b.id}-${b.key}`}
            className={styles.balloon}
            style={{
              left: `${b.x}%`,
              animationDelay: b.delay > 0 ? `${b.delay}s` : undefined,
              ...b.vars,
            }}
            onClick={() => handlePop(b.id, b.emoji)}
            onAnimationEnd={() => respawn(b.id)}
          >
            {b.emoji}
          </div>
        ))}
    </div>
  );
}
