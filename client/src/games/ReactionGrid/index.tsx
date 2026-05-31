import { useState, useEffect, useRef } from 'react';
import type { GameProps } from '../../types';
import styles from './ReactionGrid.module.scss';

const GRID = 5; // 5×5 tiles
const TILES = GRID * GRID;
const GAME_DURATION = 30;

// Window shrinks each level: starts at 1200ms, min 300ms
function windowMs(level: number) {
  return Math.max(300, 1200 - (level - 1) * 60);
}

export default function ReactionGrid({
  onScoreUpdate,
  onGameOver,
  isPlaying,
}: GameProps) {
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [active, setActive] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [missed, setMissed] = useState<number | null>(null);

  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  const streakRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function nextTile() {
    const idx = Math.floor(Math.random() * TILES);
    setActive(idx);
    setMissed(null);
    tileTimerRef.current = setTimeout(() => {
      // Missed – penalty
      setMissed(idx);
      streakRef.current = 0;
      setStreak(0);
      setActive(null);
      tileTimerRef.current = setTimeout(nextTile, 400);
    }, windowMs(levelRef.current));
  }

  useEffect(() => {
    if (isPlaying) {
      scoreRef.current = 0;
      levelRef.current = 1;
      streakRef.current = 0;
      setScore(0);
      setLevel(1);
      setStreak(0);
      setTimeLeft(GAME_DURATION);
      setActive(null);
      setMissed(null);

      // small delay so game is ready before first tile
      tileTimerRef.current = setTimeout(nextTile, 600);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (tileTimerRef.current) clearTimeout(tileTimerRef.current);
      setActive(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        const next = t <= 1 ? 0 : t - 1;
        if (next === 0) clearInterval(timerRef.current!);
        return next;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [isPlaying]);

  useEffect(() => {
    if (timeLeft === 0 && isPlaying) {
      if (tileTimerRef.current) clearTimeout(tileTimerRef.current);
      onGameOver(scoreRef.current);
    }
  }, [timeLeft, isPlaying, onGameOver]);

  function handleTileClick(idx: number) {
    if (!isPlaying || active !== idx) return;
    if (tileTimerRef.current) clearTimeout(tileTimerRef.current);

    const newStreak = streakRef.current + 1;
    streakRef.current = newStreak;
    setStreak(newStreak);

    const newLevel = Math.floor(newStreak / 5) + 1;
    levelRef.current = newLevel;
    setLevel(newLevel);

    const pts = 10 + newStreak * 5;
    scoreRef.current += pts;
    setScore(scoreRef.current);
    onScoreUpdate(scoreRef.current);

    setActive(null);
    tileTimerRef.current = setTimeout(nextTile, 150);
  }

  const urgentTime = timeLeft <= 10;

  return (
    <div className={styles.game}>
      <div
        className={
          urgentTime ? `${styles.timer} ${styles.urgent}` : styles.timer
        }
      >
        {timeLeft}s
      </div>
      <div className={styles.stats}>
        <span className={styles.score}>{score}</span>
        <span className={styles.levelBadge}>Lv {level}</span>
        {streak >= 3 && <span className={styles.streak}>🔥 {streak}</span>}
      </div>

      <div className={styles.grid}>
        {Array.from({ length: TILES }, (_, idx) => (
          <button
            key={idx}
            className={[
              styles.tile,
              active === idx ? styles.active : '',
              missed === idx ? styles.missed : '',
            ].join(' ')}
            onClick={() => handleTileClick(idx)}
          />
        ))}
      </div>

      <p className={styles.hint}>{isPlaying ? 'Tap the glowing tile!' : ''}</p>
    </div>
  );
}
