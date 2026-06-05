import { useState, useEffect, useRef } from 'react';
import type { GameProps } from '../../types';
import styles from './SnakeEscape.module.scss';

const GRID = 8;
const CELL = 44;
const PAD = 36;
const THICKNESS = 14; // snake body thickness in px
const SVG_SIZE = PAD * 2 + GRID * CELL;
const GAME_DURATION = 30;
const EXIT_STEP_MS = 80;

const LEVEL_CONFIG = [
  { snakeCount: 7, minLen: 2, maxLen: 3 },
  { snakeCount: 9, minLen: 2, maxLen: 4 },
  { snakeCount: 11, minLen: 2, maxLen: 5 },
  { snakeCount: 13, minLen: 2, maxLen: 6 },
  { snakeCount: 15, minLen: 2, maxLen: 7 },
] as const;

const SNAKE_COLORS = [
  '#6366f1',
  '#22c55e',
  '#f59e0b',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#a855f7',
  '#3b82f6',
  '#ef4444',
  '#84cc16',
];

type Dir = 'up' | 'down' | 'left' | 'right';

interface Snake {
  id: number;
  // cells sorted ascending: left→right for horizontal, top→bottom for vertical
  cells: [number, number][];
  dir: Dir;
  color: string;
}

function getDelta(dir: Dir): [number, number] {
  return dir === 'up'
    ? [-1, 0]
    : dir === 'down'
      ? [1, 0]
      : dir === 'left'
        ? [0, -1]
        : [0, 1];
}

// Returns eye positions and a forked-tongue SVG path string for a snake head
function getHeadDecorations(dir: Dir, cx: number, cy: number) {
  const eyeForward = 9;
  const eyeSide = 7;
  const eyeR = 3.5;
  const frontEdge = CELL / 2 - 4; // distance from cell centre to head rect edge
  const stemLen = 12;
  const forkLen = 6;
  const forkSpread = 5;

  let eye1: [number, number];
  let eye2: [number, number];
  let tongueBase: [number, number];
  let tongueMid: [number, number];
  let fork1End: [number, number];
  let fork2End: [number, number];

  if (dir === 'right') {
    eye1 = [cx + eyeForward, cy - eyeSide];
    eye2 = [cx + eyeForward, cy + eyeSide];
    tongueBase = [cx + frontEdge, cy];
    tongueMid = [cx + frontEdge + stemLen, cy];
    fork1End = [tongueMid[0] + forkLen, tongueMid[1] - forkSpread];
    fork2End = [tongueMid[0] + forkLen, tongueMid[1] + forkSpread];
  } else if (dir === 'left') {
    eye1 = [cx - eyeForward, cy - eyeSide];
    eye2 = [cx - eyeForward, cy + eyeSide];
    tongueBase = [cx - frontEdge, cy];
    tongueMid = [cx - frontEdge - stemLen, cy];
    fork1End = [tongueMid[0] - forkLen, tongueMid[1] - forkSpread];
    fork2End = [tongueMid[0] - forkLen, tongueMid[1] + forkSpread];
  } else if (dir === 'down') {
    eye1 = [cx - eyeSide, cy + eyeForward];
    eye2 = [cx + eyeSide, cy + eyeForward];
    tongueBase = [cx, cy + frontEdge];
    tongueMid = [cx, cy + frontEdge + stemLen];
    fork1End = [tongueMid[0] - forkSpread, tongueMid[1] + forkLen];
    fork2End = [tongueMid[0] + forkSpread, tongueMid[1] + forkLen];
  } else {
    eye1 = [cx - eyeSide, cy - eyeForward];
    eye2 = [cx + eyeSide, cy - eyeForward];
    tongueBase = [cx, cy - frontEdge];
    tongueMid = [cx, cy - frontEdge - stemLen];
    fork1End = [tongueMid[0] - forkSpread, tongueMid[1] - forkLen];
    fork2End = [tongueMid[0] + forkSpread, tongueMid[1] - forkLen];
  }

  const tonguePath =
    `M${tongueBase[0]},${tongueBase[1]} L${tongueMid[0]},${tongueMid[1]} ` +
    `M${tongueMid[0]},${tongueMid[1]} L${fork1End[0]},${fork1End[1]} ` +
    `M${tongueMid[0]},${tongueMid[1]} L${fork2End[0]},${fork2End[1]}`;

  return { eye1, eye2, eyeR, tonguePath };
}

// The head is the cell that leads in the movement direction
function getHead(snake: Snake): [number, number] {
  return snake.dir === 'right' || snake.dir === 'down'
    ? snake.cells[snake.cells.length - 1]
    : snake.cells[0];
}

function buildGrid(snakes: Snake[]): (number | null)[][] {
  const g: (number | null)[][] = Array.from({ length: GRID }, () =>
    Array(GRID).fill(null)
  );
  for (const s of snakes) {
    for (const [r, c] of s.cells) {
      if (r >= 0 && r < GRID && c >= 0 && c < GRID) g[r][c] = s.id;
    }
  }
  return g;
}

// Check whether this snake can escape. Grid must have snake's own cells cleared.
function checkMove(
  snake: Snake,
  grid: (number | null)[][]
): 'escape' | 'blocked' {
  const [hr, hc] = getHead(snake);
  const [dr, dc] = getDelta(snake.dir);
  let r = hr + dr,
    c = hc + dc;
  while (r >= 0 && r < GRID && c >= 0 && c < GRID) {
    if (grid[r][c] !== null) return 'blocked';
    r += dr;
    c += dc;
  }
  return 'escape';
}

function placeSnakes(
  count: number,
  grid: (number | null)[][],
  startId: number,
  colorOffset: number,
  minLen = 2,
  maxLen = 4
): Snake[] {
  const g = grid.map((row) => [...row]);
  const placed: Snake[] = [];
  let id = startId;
  let attempts = 0;
  while (placed.length < count && attempts < 600) {
    attempts++;
    const horiz = Math.random() < 0.5;
    const len = minLen + Math.floor(Math.random() * (maxLen - minLen + 1));
    let cells: [number, number][];
    if (horiz) {
      const r = Math.floor(Math.random() * GRID);
      const c = Math.floor(Math.random() * (GRID - len + 1));
      cells = Array.from(
        { length: len },
        (_, i) => [r, c + i] as [number, number]
      );
    } else {
      const r = Math.floor(Math.random() * (GRID - len + 1));
      const c = Math.floor(Math.random() * GRID);
      cells = Array.from(
        { length: len },
        (_, i) => [r + i, c] as [number, number]
      );
    }
    if (cells.some(([r, c]) => g[r][c] !== null)) continue;
    const dir: Dir = horiz
      ? Math.random() < 0.5
        ? 'right'
        : 'left'
      : Math.random() < 0.5
        ? 'down'
        : 'up';
    const snake: Snake = {
      id: id++,
      cells,
      dir,
      color: SNAKE_COLORS[(colorOffset + placed.length) % SNAKE_COLORS.length],
    };
    placed.push(snake);
    for (const [r, c] of cells) g[r][c] = snake.id;
  }
  return placed;
}

// BFS solvability: can all snakes escape (in some order)?
function isSolvable(snakes: Snake[]): boolean {
  const n = snakes.length;
  if (n === 0) return true;
  const goal = (1 << n) - 1;
  const queue: number[] = [0];
  const visited = new Set<number>([0]);
  while (queue.length > 0) {
    const mask = queue.shift()!;
    if (mask === goal) return true;
    for (let i = 0; i < n; i++) {
      if ((mask >> i) & 1) continue; // already escaped
      // Grid with only the non-escaped snakes except snake i
      const active = snakes.filter((_, j) => j !== i && !((mask >> j) & 1));
      const g = buildGrid(active);
      if (checkMove(snakes[i], g) === 'escape') {
        const newMask = mask | (1 << i);
        if (!visited.has(newMask)) {
          visited.add(newMask);
          queue.push(newMask);
        }
      }
    }
  }
  return false;
}

function generatePuzzle(
  config: { snakeCount: number; minLen: number; maxLen: number },
  startId: number,
  colorOffset: number
): Snake[] {
  for (let attempt = 0; attempt < 50; attempt++) {
    const emptyGrid: (number | null)[][] = Array.from({ length: GRID }, () =>
      Array(GRID).fill(null)
    );
    const snakes = placeSnakes(
      config.snakeCount,
      emptyGrid,
      startId,
      colorOffset,
      config.minLen,
      config.maxLen
    );
    if (snakes.length >= config.snakeCount && isSolvable(snakes)) {
      return snakes;
    }
  }
  // fallback
  const emptyGrid: (number | null)[][] = Array.from({ length: GRID }, () =>
    Array(GRID).fill(null)
  );
  return placeSnakes(
    config.snakeCount,
    emptyGrid,
    startId,
    colorOffset,
    config.minLen,
    config.maxLen
  );
}

// Renders body + connectors + head decorations for one snake
function SnakeShape({
  snake,
  glowFilter,
  cursor,
  opacity,
  shaking,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: {
  snake: Snake;
  glowFilter: string;
  cursor: string;
  opacity: number;
  shaking?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const head = getHead(snake);
  const hx = PAD + head[1] * CELL + CELL / 2;
  const hy = PAD + head[0] * CELL + CELL / 2;
  const { eye1, eye2, eyeR, tonguePath } = getHeadDecorations(
    snake.dir,
    hx,
    hy
  );

  return (
    <g
      className={shaking ? styles.blocked : undefined}
      style={{ cursor, opacity, filter: glowFilter, transition: 'filter 0.1s' }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Body cells */}
      {snake.cells.map(([r, c], idx) => {
        const isHead = r === head[0] && c === head[1];
        const isH = snake.dir === 'left' || snake.dir === 'right';
        const rx_ = isHead ? 8 : 6;
        // Horizontal snake: full cell width, thin centered height
        // Vertical snake:   thin centered width, full cell height
        const x = isH
          ? PAD + c * CELL
          : PAD + c * CELL + (CELL - THICKNESS) / 2;
        const y = isH
          ? PAD + r * CELL + (CELL - THICKNESS) / 2
          : PAD + r * CELL;
        const w = isH ? CELL : THICKNESS;
        const h = isH ? THICKNESS : CELL;
        return (
          <rect
            key={idx}
            x={x}
            y={y}
            width={w}
            height={h}
            rx={rx_}
            fill={snake.color}
            opacity={isHead ? 1 : 0.75}
          />
        );
      })}

      {/* Connector bridges between adjacent cells */}
      {/* {snake.cells.slice(0, -1).map(([r, c], idx) => {
        const isH = r === snake.cells[idx + 1][0];
        return isH ? (
          <rect
            key={`br-${idx}`}
            x={PAD + (c + 1) * CELL - 4}
            y={PAD + r * CELL + 4}
            width={4}
            height={CELL - 8}
            fill={snake.color}
            opacity={0.7}
          />
        ) : (
          <rect
            key={`br-${idx}`}
            x={PAD + c * CELL + 4}
            y={PAD + (r + 1) * CELL - 4}
            width={CELL - 8}
            height={4}
            fill={snake.color}
            opacity={0.7}
          />
        );
      })} */}

      {/* Eyes */}
      <circle cx={eye1[0]} cy={eye1[1]} r={eyeR} fill='white' />
      <circle cx={eye1[0]} cy={eye1[1]} r={eyeR * 0.52} fill='#111' />
      <circle cx={eye2[0]} cy={eye2[1]} r={eyeR} fill='white' />
      <circle cx={eye2[0]} cy={eye2[1]} r={eyeR * 0.52} fill='#111' />

      {/* Forked tongue */}
      <path
        d={tonguePath}
        stroke='#f43f5e'
        strokeWidth={1.8}
        fill='none'
        strokeLinecap='round'
        style={{ pointerEvents: 'none' }}
      />
    </g>
  );
}

export default function SnakeEscape({
  onScoreUpdate,
  onGameOver,
  isPlaying,
}: GameProps) {
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(0);
  const [hoverId, setHoverId] = useState<number | null>(null);
  const [flash, setFlash] = useState<'good' | null>(null);
  const [blockedId, setBlockedId] = useState<number | null>(null);
  const [exitingSnakes, setExitingSnakes] = useState<Snake[]>([]);

  const scoreRef = useRef(0);
  const levelRef = useRef(0);
  const snakeIdRef = useRef(0);
  const colorOffsetRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const exitIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lockedRef = useRef(false);
  const snakesRef = useRef<Snake[]>([]);
  snakesRef.current = snakes;

  function loadLevel(lvl: number) {
    const config = LEVEL_CONFIG[Math.min(lvl, LEVEL_CONFIG.length - 1)];
    const puzzle = generatePuzzle(
      config,
      snakeIdRef.current,
      colorOffsetRef.current
    );
    snakeIdRef.current += puzzle.length;
    colorOffsetRef.current += puzzle.length;
    setLevel(lvl);
    levelRef.current = lvl;
    setSnakes(puzzle);
    setHoverId(null);
    lockedRef.current = false;
  }

  useEffect(() => {
    if (isPlaying) {
      scoreRef.current = 0;
      levelRef.current = 0;
      snakeIdRef.current = 0;
      colorOffsetRef.current = 0;
      lockedRef.current = false;
      setScore(0);
      setLevel(0);
      setTimeLeft(GAME_DURATION);
      setFlash(null);
      setBlockedId(null);
      setExitingSnakes([]);
      setHoverId(null);
      const config = LEVEL_CONFIG[0];
      const puzzle = generatePuzzle(config, 0, 0);
      snakeIdRef.current = puzzle.length;
      colorOffsetRef.current = puzzle.length;
      setSnakes(puzzle);
      if (exitIntervalRef.current) {
        clearInterval(exitIntervalRef.current);
        exitIntervalRef.current = null;
      }
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (exitIntervalRef.current) {
        clearInterval(exitIntervalRef.current);
        exitIntervalRef.current = null;
      }
      setExitingSnakes([]);
    }
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
    if (timeLeft === 0 && isPlaying) onGameOver(scoreRef.current);
  }, [timeLeft, isPlaying, onGameOver]);

  function startExitAnimation(snake: Snake) {
    setExitingSnakes((prev) => [...prev, snake]);
    if (exitIntervalRef.current === null) {
      exitIntervalRef.current = setInterval(() => {
        setExitingSnakes((prev) => {
          const next = prev
            .map((s) => {
              const [dr, dc] = getDelta(s.dir);
              const newCells = s.cells.map(
                ([r, c]) => [r + dr, c + dc] as [number, number]
              );
              const anyVisible = newCells.some(
                ([r, c]) => r > -2 && r < GRID + 2 && c > -2 && c < GRID + 2
              );
              return anyVisible ? { ...s, cells: newCells } : null;
            })
            .filter(Boolean) as Snake[];
          if (next.length === 0) {
            clearInterval(exitIntervalRef.current!);
            exitIntervalRef.current = null;
          }
          return next;
        });
      }, EXIT_STEP_MS);
    }
  }

  function handleSnakeClick(snakeId: number) {
    if (!isPlaying || lockedRef.current) return;
    const snake = snakesRef.current.find((s) => s.id === snakeId);
    if (!snake) return;

    const grid = buildGrid(snakesRef.current);
    for (const [r, c] of snake.cells) grid[r][c] = null;

    if (checkMove(snake, grid) === 'escape') {
      lockedRef.current = true;
      setFlash('good');
      const pts = 50 + snake.cells.length * 10;
      scoreRef.current += pts;
      setScore(scoreRef.current);
      onScoreUpdate(scoreRef.current);

      setSnakes((prev) => prev.filter((s) => s.id !== snakeId));
      startExitAnimation(snake);

      setTimeout(() => {
        setFlash(null);
        const remaining = snakesRef.current;
        if (remaining.length === 0) {
          // Level complete: award time bonus, advance level
          const timePts = Math.floor(
            (timeLeft > 0 ? timeLeft : 0) * (levelRef.current + 1) * 2
          );
          scoreRef.current += timePts;
          setScore(scoreRef.current);
          onScoreUpdate(scoreRef.current);
          loadLevel(levelRef.current + 1);
        } else {
          lockedRef.current = false;
        }
      }, 400);
    } else {
      // Blocked — shake, no game over
      setBlockedId(snakeId);
      setTimeout(() => setBlockedId(null), 500);
    }
  }

  // Hover preview
  const hoverSnake =
    hoverId !== null ? (snakes.find((s) => s.id === hoverId) ?? null) : null;
  let hoverResult: 'escape' | 'blocked' | null = null;
  if (hoverSnake && isPlaying) {
    const g = buildGrid(snakes);
    for (const [r, c] of hoverSnake.cells) g[r][c] = null;
    hoverResult = checkMove(hoverSnake, g);
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
      <div className={styles.levelBadge}>Level {level + 1}</div>
      <div className={styles.score}>{score}</div>

      <div className={styles.svgWrap}>
        <svg
          viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
          className={styles.svg}
          onMouseLeave={() => setHoverId(null)}
        >
          {/* Grid background cells */}
          {Array.from({ length: GRID }, (_, r) =>
            Array.from({ length: GRID }, (_, c) => (
              <rect
                key={`bg-${r}-${c}`}
                x={PAD + c * CELL + 2}
                y={PAD + r * CELL + 2}
                width={CELL - 4}
                height={CELL - 4}
                rx={5}
                fill='rgba(255,255,255,0.03)'
              />
            ))
          )}

          {/* Exiting snakes */}
          {exitingSnakes.map((snake) => (
            <SnakeShape
              key={`exit-${snake.id}`}
              snake={snake}
              glowFilter='none'
              cursor='default'
              opacity={0.85}
            />
          ))}

          {/* Active snakes */}
          {snakes.map((snake) => {
            const isHovered = hoverId === snake.id;
            const glowFilter =
              isHovered && hoverResult === 'escape'
                ? `drop-shadow(0 0 7px ${snake.color})`
                : isHovered && hoverResult === 'blocked'
                  ? 'drop-shadow(0 0 7px #ef4444)'
                  : 'none';
            return (
              <SnakeShape
                key={snake.id}
                snake={snake}
                glowFilter={glowFilter}
                cursor={isPlaying ? 'pointer' : 'default'}
                opacity={1}
                shaking={blockedId === snake.id}
                onClick={() => handleSnakeClick(snake.id)}
                onMouseEnter={() => setHoverId(snake.id)}
                onMouseLeave={() => setHoverId(null)}
              />
            );
          })}
        </svg>
      </div>

      <p className={styles.hint}>
        {!isPlaying
          ? ''
          : 'Click a snake to launch it — green = safe, red = blocked'}
      </p>
    </div>
  );
}
