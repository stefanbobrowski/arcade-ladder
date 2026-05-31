import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps } from '../../types';
import styles from './PatternMemory.module.scss';

// ── Simon-Says style pattern memory ──────────────────────────────────────────
const GRID_SIZE = 4; // 4×4 = 16 tiles
const TILES = GRID_SIZE * GRID_SIZE;
const SHOW_MS = 600; // how long each tile lights up
const GAP_MS = 160; // gap between flashes
const PREVIEW_DELAY = 900; // pause before showing pattern

const TILE_COLORS = [
  '#6366f1',
  '#22c55e',
  '#f59e0b',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#a855f7',
  '#3b82f6',
];

function pickPattern(len: number): number[] {
  const seq: number[] = [];
  while (seq.length < len) {
    const t = Math.floor(Math.random() * TILES);
    if (!seq.includes(t)) seq.push(t);
  }
  return seq;
}

type Phase = 'idle' | 'showing' | 'input' | 'feedback';

export default function PatternMemory({
  onScoreUpdate,
  onGameOver,
  isPlaying,
}: GameProps) {
  const [round, setRound] = useState(1);
  const [pattern, setPattern] = useState<number[]>([]);
  const [lit, setLit] = useState<number | null>(null); // tile index currently flashing
  const [selected, setSelected] = useState<number[]>([]); // player's picks
  const [phase, setPhase] = useState<Phase>('idle');
  const [correctSet, setCorrectSet] = useState<Set<number>>(new Set());
  const [wrongTile, setWrongTile] = useState<number | null>(null);
  const score = useRef(0);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearTimeouts() {
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
  }

  const startRound = useCallback((r: number) => {
    clearTimeouts();
    const patLen = 3 + r - 1; // round 1 → 3 tiles, grows each round
    const pat = pickPattern(Math.min(patLen, TILES));
    setPattern(pat);
    setSelected([]);
    setLit(null);
    setCorrectSet(new Set());
    setWrongTile(null);
    setPhase('showing');

    // Flash each tile in the pattern sequentially
    pat.forEach((tile, i) => {
      const onId = setTimeout(
        () => setLit(tile),
        PREVIEW_DELAY + i * (SHOW_MS + GAP_MS)
      );
      const offId = setTimeout(
        () => setLit(null),
        PREVIEW_DELAY + i * (SHOW_MS + GAP_MS) + SHOW_MS
      );
      timeouts.current.push(onId, offId);
    });

    // Switch to input phase after all flashes done
    const doneId = setTimeout(
      () => setPhase('input'),
      PREVIEW_DELAY + pat.length * (SHOW_MS + GAP_MS) + 200
    );
    timeouts.current.push(doneId);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      score.current = 0;
      setRound(1);
      startRound(1);
    } else {
      clearTimeouts();
      setPhase('idle');
      setLit(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  function handleTileClick(idx: number) {
    if (phase !== 'input') return;
    if (correctSet.has(idx) || selected.includes(idx)) return;

    const position = selected.length;
    if (pattern[position] === idx) {
      // Correct tile
      const newSelected = [...selected, idx];
      const newCorrect = new Set([...correctSet, idx]);
      setSelected(newSelected);
      setCorrectSet(newCorrect);

      if (newSelected.length === pattern.length) {
        // Round complete
        const pts = pattern.length * 50;
        score.current += pts;
        onScoreUpdate(score.current);
        setPhase('feedback');
        const nextRound = round + 1;
        const tid = setTimeout(() => {
          setRound(nextRound);
          startRound(nextRound);
        }, 800);
        timeouts.current.push(tid);
      }
    } else {
      // Wrong tile — game over
      setWrongTile(idx);
      setPhase('feedback');
      clearTimeouts();
      const tid = setTimeout(() => onGameOver(score.current), 900);
      timeouts.current.push(tid);
    }
  }

  return (
    <div className={styles.game}>
      <div className={styles.header}>
        <span className={styles.roundLabel}>Round {round}</span>
        <span className={styles.scoreLabel}>{score.current} pts</span>
      </div>

      <p className={styles.hint}>
        {phase === 'showing'
          ? 'Watch the pattern…'
          : phase === 'input'
            ? `Tap the tiles in order — ${pattern.length - selected.length} left`
            : phase === 'feedback' && wrongTile !== null
              ? '❌ Wrong order!'
              : '✅ Nice!'}
      </p>

      <div className={styles.grid}>
        {Array.from({ length: TILES }, (_, idx) => {
          const isLit = lit === idx;
          const isCorrect = correctSet.has(idx);
          const isWrong = wrongTile === idx;
          const isNext = phase === 'input' && pattern[selected.length] === idx;
          return (
            <button
              key={idx}
              className={[
                styles.tile,
                isLit ? styles.lit : '',
                isCorrect ? styles.correct : '',
                isWrong ? styles.wrong : '',
                isNext && !isCorrect ? styles.next : '',
              ].join(' ')}
              style={
                {
                  '--tile-color': TILE_COLORS[idx % TILE_COLORS.length],
                } as React.CSSProperties
              }
              onClick={() => handleTileClick(idx)}
              disabled={phase !== 'input' || isCorrect}
            />
          );
        })}
      </div>
    </div>
  );
}
