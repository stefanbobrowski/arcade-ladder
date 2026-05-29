import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps } from '../../types';
import styles from './MatchGame.module.scss';

const GAME_DURATION = 60;
const FLIP_BACK_DELAY = 900;

const EMOJI_LIBRARY_RAW = [
  // Animals
  '🦁',
  '🐯',
  '🦊',
  '🦝',
  '🦋',
  '🦅',
  '🐉',
  '🦕',
  '🦈',
  '🦑',
  // Food
  '🍕',
  '🍔',
  '🌮',
  '🍜',
  '🍣',
  '🍦',
  '🎂',
  '🍩',
  '🍓',
  '🍋',
  // Objects
  '🔑',
  '🔮',
  '🧲',
  '💣',
  '🔭',
  '🧬',
  '🧪',
  '🎩',
  '🪄',
  '🛡️',
  // Sports & music
  '⚽',
  '🏀',
  '🎾',
  '🏆',
  '🎯',
  '🎸',
  '🎺',
  '🎻',
  '🪗',
  '🎮',
  // Vehicles
  '🚀',
  '✈️',
  '🚂',
  '🏎️',
  '🛸',
  '⛵',
  '🚁',
  '🚜',
  '🏍️',
  '🛻',
  // Nature
  '🌍',
  '🌈',
  '☄️',
  '🌊',
  '🌋',
  '🌸',
  '🍄',
  '🌵',
  '🌴',
  '🪸',
  // Symbols & misc
  '💎',
  '⚡',
  '🔥',
  '💧',
  '🌙',
  '☀️',
  '🗿',
  '🧸',
  '🎪',
  '🎠',
];

// Shuffle once at module load so every session gets a random mix across levels
const EMOJI_LIBRARY = [...EMOJI_LIBRARY_RAW];
for (let i = EMOJI_LIBRARY.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [EMOJI_LIBRARY[i], EMOJI_LIBRARY[j]] = [EMOJI_LIBRARY[j], EMOJI_LIBRARY[i]];
}

const LEVELS: [number, number][] = [
  [3, 2],
  [4, 3],
  [4, 4],
  [6, 4],
  [6, 5],
  [6, 6],
];

interface Card {
  id: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
}

function buildGrid(cols: number, rows: number, emojiOffset: number): Card[] {
  const pairCount = (cols * rows) / 2;
  const pool: string[] = [];
  for (let i = 0; i < pairCount; i++) {
    pool.push(EMOJI_LIBRARY[(emojiOffset + i) % EMOJI_LIBRARY.length]);
  }
  const doubled = [...pool, ...pool];
  for (let i = doubled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [doubled[i], doubled[j]] = [doubled[j], doubled[i]];
  }
  return doubled.map((emoji, id) => ({
    id,
    emoji,
    flipped: false,
    matched: false,
  }));
}

export default function MatchGame({
  onScoreUpdate,
  onGameOver,
  isPlaying,
}: GameProps) {
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(0);
  const [cards, setCards] = useState<Card[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);
  const [levelUp, setLevelUp] = useState(false);
  const [badCards, setBadCards] = useState<number[]>([]);
  const [goodCards, setGoodCards] = useState<number[]>([]);

  const scoreRef = useRef(0);
  const emojiOffset = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [gridKey, setGridKey] = useState(0);

  const startLevel = useCallback((lvl: number) => {
    const [cols, rows] = LEVELS[Math.min(lvl, LEVELS.length - 1)];
    setCards(buildGrid(cols, rows, emojiOffset.current));
    emojiOffset.current += (cols * rows) / 2;
    setSelected([]);
    setLocked(false);
    setGridKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      scoreRef.current = 0;
      emojiOffset.current = 0;
      setScore(0);
      setTimeLeft(GAME_DURATION);
      setLevel(0);
      setLevelUp(false);
      setBadCards([]);
      setGoodCards([]);
      startLevel(0);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isPlaying, startLevel]);

  useEffect(() => {
    if (!isPlaying) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [isPlaying]);

  useEffect(() => {
    if (timeLeft === 0 && isPlaying) onGameOver(scoreRef.current);
  }, [timeLeft, isPlaying, onGameOver]);

  function handleClick(cardId: number) {
    if (!isPlaying || locked) return;
    const card = cards.find((c) => c.id === cardId);
    if (!card || card.flipped || card.matched) return;
    if (selected.includes(cardId)) return;

    const newSelected = [...selected, cardId];

    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, flipped: true } : c))
    );

    if (newSelected.length < 2) {
      setSelected(newSelected);
      return;
    }

    setSelected([]);
    setLocked(true);

    const [aId, bId] = newSelected;
    const aEmoji = cards.find((c) => c.id === aId)!.emoji;
    const bEmoji = cards.find((c) => c.id === bId)!.emoji;

    if (aEmoji === bEmoji) {
      const bonus = Math.max(1, Math.ceil(timeLeft / 5));
      const pts = 10 + bonus;
      scoreRef.current += pts;
      setScore(scoreRef.current);
      onScoreUpdate(scoreRef.current);
      setGoodCards([aId, bId]);
      setTimeout(() => setGoodCards([]), 500);

      setCards((prev) => {
        const next = prev.map((c) =>
          c.id === aId || c.id === bId
            ? { ...c, matched: true, flipped: true }
            : c
        );
        if (next.every((c) => c.matched)) {
          setLevel((lvl) => {
            const nextLevel = lvl + 1;
            setLevelUp(true);
            setTimeout(() => {
              setLevelUp(false);
              setLevel(nextLevel);
              startLevel(nextLevel);
            }, 1200);
            return lvl; // keep current level until timeout
          });
        } else {
          setLocked(false);
        }
        return next;
      });
    } else {
      setBadCards([aId, bId]);
      setTimeout(() => {
        setCards((prev) =>
          prev.map((c) =>
            c.id === aId || c.id === bId ? { ...c, flipped: false } : c
          )
        );
        setBadCards([]);
        setLocked(false);
      }, FLIP_BACK_DELAY);
    }
  }

  const [cols] = LEVELS[Math.min(level, LEVELS.length - 1)];
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
      <div className={styles.score}>{score}</div>
      <div className={styles.levelBadge}>Level {level + 1}</div>

      {levelUp && (
        <div className={styles.levelUpBanner}>✨ Level {level + 2}!</div>
      )}

      <div
        key={gridKey}
        className={styles.grid}
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {cards.map((card) => {
          const cardClass = [
            styles.cardScene,
            card.flipped || card.matched ? styles.flipped : null,
            card.matched ? styles.matched : null,
            badCards.includes(card.id) ? styles.badCard : null,
            goodCards.includes(card.id) ? styles.goodCard : null,
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <div
              key={card.id}
              className={cardClass}
              onClick={() => handleClick(card.id)}
            >
              <div className={styles.cardInner}>
                <div className={styles.cardBack} />
                <div className={styles.cardFront}>{card.emoji}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
