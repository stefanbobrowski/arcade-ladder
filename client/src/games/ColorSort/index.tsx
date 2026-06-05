import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps } from '../../types';
import styles from './ColorSort.module.scss';

const GAME_DURATION = 60;
const TUBE_SIZE = 4;

const COLOR_PALETTE = [
  '#ef4444',
  '#f59e0b',
  '#22c55e',
  '#3b82f6',
  '#a855f7',
  '#ec4899',
  '#14b8a6',
  '#f97316',
];

// [numColors, emptyTubes]
const LEVEL_CONFIG: [number, number][] = [
  [3, 1],
  [4, 1],
  [4, 2],
  [5, 2],
  [6, 2],
];

type Tube = string[];

function isTubeSolved(tube: Tube): boolean {
  return tube.length === TUBE_SIZE && tube.every((c) => c === tube[0]);
}

function isPuzzleSolved(tubes: Tube[]): boolean {
  return tubes.every((t) => t.length === 0 || isTubeSolved(t));
}

function topColor(tube: Tube): string | null {
  return tube.length > 0 ? tube[tube.length - 1] : null;
}

function topColorCount(tube: Tube): number {
  if (tube.length === 0) return 0;
  const top = tube[tube.length - 1];
  let count = 0;
  for (let i = tube.length - 1; i >= 0 && tube[i] === top; i--) count++;
  return count;
}

function canPour(from: Tube, to: Tube): boolean {
  if (from.length === 0) return false;
  if (to.length === TUBE_SIZE) return false;
  if (isTubeSolved(from)) return false;
  if (to.length === 0) return true;
  return topColor(from) === topColor(to);
}

function applyPour(tubes: Tube[], fromIdx: number, toIdx: number): Tube[] {
  const next = tubes.map((t) => [...t]);
  const from = next[fromIdx];
  const to = next[toIdx];
  const color = topColor(from)!;
  const count = Math.min(topColorCount(from), TUBE_SIZE - to.length);
  for (let i = 0; i < count; i++) {
    from.pop();
    to.push(color);
  }
  return next;
}

function generatePuzzle(numColors: number, emptyTubes: number): Tube[] {
  const colors = COLOR_PALETTE.slice(0, numColors);

  for (;;) {
    // Build pool of all segments and shuffle them randomly
    const pool: string[] = colors.flatMap((c) => Array(TUBE_SIZE).fill(c));
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    // Distribute into tubes
    const tubes: Tube[] = Array.from({ length: numColors }, (_, i) =>
      pool.slice(i * TUBE_SIZE, (i + 1) * TUBE_SIZE)
    );
    for (let i = 0; i < emptyTubes; i++) tubes.push([]);

    // Retry on the rare chance the shuffle produced an already-solved layout
    if (!isPuzzleSolved(tubes)) return tubes;
  }
}

// ── Web-Audio click feedback ──────────────────────────────────────────────────
let _audioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext {
  if (!_audioCtx) _audioCtx = new AudioContext();
  return _audioCtx;
}

function playClick(ok: boolean) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(ok ? 880 : 220, ctx.currentTime);
    if (!ok)
      osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + (ok ? 0.08 : 0.18)
    );
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + (ok ? 0.08 : 0.2));
  } catch {
    // AudioContext unavailable — silently ignore
  }
}

export default function ColorSort({
  onScoreUpdate,
  onGameOver,
  isPlaying,
}: GameProps) {
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(0);
  const [tubes, setTubes] = useState<Tube[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [flash, setFlash] = useState<'good' | null>(null);
  const [levelUp, setLevelUp] = useState(false);
  const [gridKey, setGridKey] = useState(0);

  const scoreRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeLeftRef = useRef(GAME_DURATION);

  const startLevel = useCallback((lvl: number) => {
    const [numColors, emptyTubes] =
      LEVEL_CONFIG[Math.min(lvl, LEVEL_CONFIG.length - 1)];
    setTubes(generatePuzzle(numColors, emptyTubes));
    setSelected(null);
    setGridKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      scoreRef.current = 0;
      timeLeftRef.current = GAME_DURATION;
      setScore(0);
      setTimeLeft(GAME_DURATION);
      setLevel(0);
      setFlash(null);
      setLevelUp(false);
      startLevel(0);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isPlaying, startLevel]);

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

  function handleTubeClick(idx: number) {
    if (!isPlaying || levelUp) return;

    if (selected === null) {
      if (tubes[idx].length > 0 && !isTubeSolved(tubes[idx])) {
        setSelected(idx);
        playClick(true);
      }
      return;
    }

    if (selected === idx) {
      setSelected(null);
      return;
    }

    if (canPour(tubes[selected], tubes[idx])) {
      const nextTubes = applyPour(tubes, selected, idx);
      setTubes(nextTubes);
      setSelected(null);
      playClick(true);

      if (isPuzzleSolved(nextTubes)) {
        const bonus = Math.ceil(timeLeftRef.current / 3);
        const pts = 100 + bonus;
        scoreRef.current += pts;
        setScore(scoreRef.current);
        onScoreUpdate(scoreRef.current);
        setFlash('good');
        setTimeout(() => setFlash(null), 500);
        setLevelUp(true);
        setLevel((lvl) => {
          const nextLvl = lvl + 1;
          setTimeout(() => {
            setLevelUp(false);
            setLevel(nextLvl);
            startLevel(nextLvl);
          }, 1300);
          return lvl;
        });
      }
    } else {
      playClick(false);
      // Re-select the clicked tube if it has pourable content
      if (tubes[idx].length > 0 && !isTubeSolved(tubes[idx])) {
        setSelected(idx);
      } else {
        setSelected(null);
      }
    }
  }

  function handleReshuffle() {
    if (!isPlaying || levelUp) return;
    const penalty = 20;
    scoreRef.current = Math.max(0, scoreRef.current - penalty);
    setScore(scoreRef.current);
    onScoreUpdate(scoreRef.current);
    const [numColors, emptyTubes] =
      LEVEL_CONFIG[Math.min(level, LEVEL_CONFIG.length - 1)];
    setTubes(generatePuzzle(numColors, emptyTubes));
    setSelected(null);
    setGridKey((k) => k + 1);
  }

  const urgentTime = timeLeft <= 10;
  const gameClass = [styles.game, flash === 'good' ? styles.flashGood : null]
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
      <div className={styles.levelBadge}>Level {level + 1}</div>

      {levelUp && <div className={styles.levelUpBanner}>✨ Solved!</div>}

      <div key={gridKey} className={styles.tubesRow}>
        {tubes.map((tube, idx) => {
          const tubeClass = [
            styles.tube,
            selected === idx ? styles.selectedTube : null,
            isTubeSolved(tube) && tube.length > 0 ? styles.solvedTube : null,
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <div
              key={idx}
              className={tubeClass}
              onClick={() => handleTubeClick(idx)}
            >
              <div className={styles.tubeInner}>
                {Array.from({ length: TUBE_SIZE }).map((_, segIdx) => {
                  const color = tube[segIdx] ?? null;
                  return (
                    <div
                      key={segIdx}
                      className={styles.segment}
                      style={color ? { background: color } : undefined}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <p className={styles.hint}>
        Select a tube, then click a destination to pour
      </p>
      <button
        className={styles.reshuffleBtn}
        onClick={handleReshuffle}
        disabled={!isPlaying || levelUp}
      >
        ↺ Reshuffle (−20 pts)
      </button>
    </div>
  );
}
