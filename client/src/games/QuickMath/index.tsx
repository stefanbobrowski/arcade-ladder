import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps } from '../../types';
import styles from './QuickMath.module.scss';

const GAME_DURATION = 30;
const MAX_MULT = 3;

type Op = '+' | '−' | '×' | '÷';

interface Question {
  a: number;
  b: number;
  op: Op;
  answer: number;
  choices: number[];
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateQuestion(difficulty: number): Question {
  const scale = Math.min(difficulty + 1, 5);
  const ops: Op[] = ['+', '−'];
  if (difficulty >= 2) ops.push('×');
  if (difficulty >= 4) ops.push('÷');
  const op = ops[Math.floor(Math.random() * ops.length)];

  let a: number, b: number, answer: number;

  if (op === '+') {
    a = randInt(1, 10 * scale);
    b = randInt(1, 10 * scale);
    answer = a + b;
  } else if (op === '−') {
    a = randInt(2, 10 * scale);
    b = randInt(1, a);
    answer = a - b;
  } else if (op === '×') {
    a = randInt(2, 4 * scale);
    b = randInt(2, 9);
    answer = a * b;
  } else {
    b = randInt(2, 9);
    answer = randInt(1, 10);
    a = answer * b;
  }

  const set = new Set<number>([answer]);
  let tries = 0;
  while (set.size < 4 && tries < 60) {
    tries++;
    const spread = Math.max(3, Math.ceil(Math.abs(answer) * 0.3));
    const delta = randInt(-spread, spread);
    if (delta !== 0) set.add(answer + delta);
  }
  while (set.size < 4) set.add(answer + set.size * 3);

  return { a, b, op, answer, choices: shuffleArr([...set]) };
}

export default function QuickMath({
  onScoreUpdate,
  onGameOver,
  isPlaying,
}: GameProps) {
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [question, setQuestion] = useState<Question>(() => generateQuestion(0));
  const [flash, setFlash] = useState<'good' | 'bad' | null>(null);
  const [answered, setAnswered] = useState<number | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState<number | null>(null);

  const scoreRef = useRef(0);
  const streakRef = useRef(0);
  const difficultyRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lockedRef = useRef(false);
  const timeLeftRef = useRef(GAME_DURATION);

  const nextQuestion = useCallback(() => {
    setQuestion(generateQuestion(difficultyRef.current));
    setAnswered(null);
    setCorrectAnswer(null);
    lockedRef.current = false;
  }, []);

  useEffect(() => {
    if (isPlaying) {
      scoreRef.current = 0;
      streakRef.current = 0;
      difficultyRef.current = 0;
      lockedRef.current = false;
      timeLeftRef.current = GAME_DURATION;
      setScore(0);
      setStreak(0);
      setTimeLeft(GAME_DURATION);
      setFlash(null);
      setAnswered(null);
      setCorrectAnswer(null);
      setQuestion(generateQuestion(0));
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        const next = t <= 1 ? 0 : t - 1;
        timeLeftRef.current = next;
        if (next === 0) clearInterval(timerRef.current!);
        return next;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [isPlaying]);

  useEffect(() => {
    if (timeLeft === 0 && isPlaying) onGameOver(scoreRef.current);
  }, [timeLeft, isPlaying, onGameOver]);

  function handleAnswer(choice: number) {
    if (!isPlaying || lockedRef.current) return;
    lockedRef.current = true;
    const isCorrect = choice === question.answer;
    setAnswered(choice);
    setCorrectAnswer(question.answer);

    if (isCorrect) {
      streakRef.current += 1;
      const mult = Math.min(1 + (streakRef.current - 1) * 0.5, MAX_MULT);
      const bonus = Math.ceil(timeLeftRef.current / 10);
      const pts = Math.round((10 + bonus) * mult);
      scoreRef.current += pts;
      difficultyRef.current = Math.floor(scoreRef.current / 80);
      setScore(scoreRef.current);
      setStreak(streakRef.current);
      onScoreUpdate(scoreRef.current);
      setFlash('good');
    } else {
      streakRef.current = 0;
      scoreRef.current = Math.max(0, scoreRef.current - 2);
      setScore(scoreRef.current);
      setStreak(0);
      onScoreUpdate(scoreRef.current);
      setFlash('bad');
    }

    setTimeout(() => setFlash(null), 350);
    setTimeout(nextQuestion, 700);
  }

  const mult = Math.min(1 + Math.max(0, streak - 1) * 0.5, MAX_MULT);
  const urgentTime = timeLeft <= 10;
  const gameClass = [
    styles.game,
    flash === 'good' ? styles.flashGood : null,
    flash === 'bad' ? styles.flashBad : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={gameClass}>
      <div
        className={
          urgentTime ? `${styles.timer} ${styles.urgent}` : styles.timer
        }
      >
        {timeLeft}s
      </div>
      <div className={styles.score}>{score}</div>
      {streak >= 2 && (
        <div className={styles.streak}>🔥 ×{mult.toFixed(1)}</div>
      )}

      <div className={styles.questionArea}>
        <div className={styles.equation}>
          {question.a} {question.op} {question.b} = ?
        </div>
      </div>

      <div className={styles.choices}>
        {question.choices.map((choice) => {
          let state: 'correct' | 'wrong' | 'default' = 'default';
          if (answered !== null) {
            if (choice === correctAnswer) state = 'correct';
            else if (choice === answered) state = 'wrong';
          }
          return (
            <button
              key={choice}
              className={`${styles.choiceBtn} ${styles[state]}`}
              onClick={() => handleAnswer(choice)}
              disabled={answered !== null}
            >
              {choice}
            </button>
          );
        })}
      </div>
    </div>
  );
}
