import { useEffect, useRef, useState } from 'react';
import type { GameProps } from '../../types';
import styles from './TypingSpeed.module.scss';

const WORDS = [
  'arcade',
  'ladder',
  'typing',
  'speed',
  'rank',
  'score',
  'climb',
  'react',
  'pixel',
  'cyber',
  'glitch',
  'neon',
  'mountain',
  'success',
  'parrot',
  'revolution',
  'umbrella',
  'galaxy',
  'dinosaur',
  'volcano',
  'pirate',
  'ninja',
  'robot',
  'zombie',
  'code',
  'wizard',
  'computer',
  'nerd',
  'keyboard',
  'mouse',
  'tornado',
  'rain',
  'dialogue',
  'experience',
  'level',
  'electricity',
  'internet',
  'website',
  'database',
];

const GAME_DURATION = 30; // seconds

function randomWords(n: number) {
  return Array.from(
    { length: n },
    () => WORDS[Math.floor(Math.random() * WORDS.length)]
  );
}

export default function TypingSpeed({
  onScoreUpdate,
  onGameOver,
  isPlaying,
}: GameProps) {
  const [words] = useState(() => randomWords(80));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState('');
  const [correct, setCorrect] = useState(0);
  const [errors, setErrors] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isPlaying) return;
    inputRef.current?.focus();
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

  useEffect(() => {
    if (timeLeft === 0 && isPlaying) {
      const wpm = Math.round((correct / GAME_DURATION) * 60);
      const accuracy =
        correct + errors > 0
          ? Math.round((correct / (correct + errors)) * 100)
          : 100;
      const score = Math.round(wpm * (accuracy / 100));
      onGameOver(score);
    }
  }, [timeLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const elapsed = Math.max(1, GAME_DURATION - timeLeft);
    const wpm = Math.round((correct / elapsed) * 60);
    const accuracy =
      correct + errors > 0
        ? Math.round((correct / (correct + errors)) * 100)
        : 100;
    onScoreUpdate(Math.round(wpm * (accuracy / 100)));
  }, [correct, errors, timeLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (val.endsWith(' ')) {
      const typed = val.trim();
      if (typed === words[currentIndex]) {
        setCorrect((c) => c + 1);
      } else {
        setErrors((e) => e + 1);
      }
      setCurrentIndex((i) => i + 1);
      setInput('');
    } else {
      setInput(val);
    }
  }

  const elapsed = Math.max(1, GAME_DURATION - timeLeft);
  const wpm = Math.round((correct / elapsed) * 60);
  const accuracy =
    correct + errors > 0
      ? Math.round((correct / (correct + errors)) * 100)
      : 100;
  const liveScore = Math.round(wpm * (accuracy / 100));
  const progress = ((GAME_DURATION - timeLeft) / GAME_DURATION) * 100;

  return (
    <div className={styles.game}>
      <div className={styles.timer}>{timeLeft}s</div>
      <div className={styles.scoreLive}>
        <span className={styles.wpm}>
          {wpm} <small>WPM</small>
        </span>
        <span className={styles.accuracy}>
          {accuracy}
          <small>%</small>
        </span>
        <span className={styles.scoreVal}>
          {liveScore} <small>pts</small>
        </span>
      </div>
      <div className={styles.wordDisplay}>
        {words
          .slice(Math.max(0, currentIndex - 2), currentIndex + 12)
          .map((word, i) => {
            const actualIndex = Math.max(0, currentIndex - 2) + i;
            return (
              <span
                key={actualIndex}
                className={`${styles.word} ${actualIndex === currentIndex ? styles.current : ''} ${actualIndex < currentIndex ? styles.done : ''}`}
              >
                {word}
              </span>
            );
          })}
      </div>
      <input
        ref={inputRef}
        className={styles.input}
        value={input}
        onChange={handleInput}
        placeholder='Type here...'
        disabled={!isPlaying || timeLeft === 0}
        autoComplete='off'
        autoCorrect='off'
        autoCapitalize='off'
        spellCheck={false}
      />
      <span className={styles.hint}>Press Spacebar to submit</span>
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
