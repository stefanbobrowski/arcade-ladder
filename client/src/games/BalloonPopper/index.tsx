import { useEffect, useState, useRef, useCallback } from 'react';
import type { GameProps } from '../../types';
import styles from './BalloonPopper.module.scss';

const GAME_DURATION = 30;

function randomX() {
  // 5–80% so the balloon (centered on this point) stays within the container
  return Math.floor(Math.random() * 75) + 5;
}

export default function BalloonPopper({
  onScoreUpdate,
  onGameOver,
  isPlaying,
}: GameProps) {
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [balloonX, setBalloonX] = useState(randomX);
  const [balloonKey, setBalloonKey] = useState(0); // changing key remounts → restarts animation
  const scoreRef = useRef(0); // avoids stale closure in game-over effect

  const respawn = useCallback(() => {
    setBalloonX(randomX());
    setBalloonKey((k) => k + 1);
  }, []);

  // Reset + spawn when game starts
  useEffect(() => {
    if (isPlaying) {
      scoreRef.current = 0;
      setScore(0);
      setTimeLeft(GAME_DURATION);
      respawn();
    }
  }, [isPlaying]);

  // Countdown timer
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
    if (timeLeft === 0 && isPlaying) {
      onGameOver(scoreRef.current);
    }
  }, [timeLeft]);

  function handlePop() {
    scoreRef.current += 1;
    setScore(scoreRef.current);
    onScoreUpdate(scoreRef.current);
    respawn();
  }

  return (
    <div className={styles.game}>
      <div className={styles.timer}>{timeLeft}s</div>
      <div className={styles.score}>{score}</div>
      {isPlaying && (
        <div
          key={balloonKey}
          className={styles.balloon}
          style={{ left: `${balloonX}%` }}
          onClick={handlePop}
          onAnimationEnd={respawn}
        >
          🎈
        </div>
      )}
    </div>
  );
}
