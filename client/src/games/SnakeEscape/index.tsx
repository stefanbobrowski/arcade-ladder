import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps } from '../../types';
import styles from './SnakeEscape.module.scss';

const GRID = 10;
const CELL = 30;
const PAD = 50;
const SVG_SIZE = PAD * 2 + GRID * CELL;
const GAME_DURATION = 30;
const EXIT_STEP_MS = 80;
const MIN_SNAKES = 4; // always keep at least this many on the board

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
  colorOffset: number
): Snake[] {
  const g = grid.map((row) => [...row]);
  const placed: Snake[] = [];
  let id = startId;
  let attempts = 0;
  while (placed.length < count && attempts < 500) {
    attempts++;
    const horiz = Math.random() < 0.5;
    const len = 3 + Math.floor(Math.random() * 4); // 3–6
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

// Renders body + connectors + head decorations for one snake
function SnakeShape({
  snake,
  glowFilter,
  cursor,
  opacity,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: {
  snake: Snake;
  glowFilter: string;
  cursor: string;
  opacity: number;
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
      style={{ cursor, opacity, filter: glowFilter, transition: 'filter 0.1s' }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Body cells */}
      {snake.cells.map(([r, c], idx) => {
        const isHead = r === head[0] && c === head[1];
        return (
          <rect
            key={idx}
            x={PAD + c * CELL + 4}
            y={PAD + r * CELL + 4}
            width={CELL - 8}
            height={CELL - 8}
            rx={isHead ? 12 : 8}
            fill={snake.color}
            opacity={isHead ? 1 : 0.7}
          />
        );
      })}

      {/* Connector bridges between adjacent cells */}
      {snake.cells.slice(0, -1).map(([r, c], idx) => {
        const isH = r === snake.cells[idx + 1][0];
        return isH ? (
          <rect
            key={`br-${idx}`}
            x={PAD + (c + 1) * CELL - 4}
            y={PAD + r * CELL + 4}
            width={8}
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
            height={8}
            fill={snake.color}
            opacity={0.7}
          />
        );
      })}

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
  const [hoverId, setHoverId] = useState<number | null>(null);
  const [flash, setFlash] = useState<'good' | 'bad' | null>(null);
  const [exitingSnakes, setExitingSnakes] = useState<Snake[]>([]);
  const [gameEnded, setGameEnded] = useState(false);

  const scoreRef = useRef(0);
  const exitedRef = useRef(0);
  const snakeIdRef = useRef(0);
  const colorOffsetRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const exitIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lockedRef = useRef(false);
  // Ref mirror of snakes so setTimeout callbacks read latest state
  const snakesRef = useRef<Snake[]>([]);
  snakesRef.current = snakes;

  const buildInitial = useCallback(() => {
    const emptyGrid: (number | null)[][] = Array.from({ length: GRID }, () =>
      Array(GRID).fill(null)
    );
    snakeIdRef.current = 0;
    exitedRef.current = 0;
    colorOffsetRef.current = 0;
    const initial = placeSnakes(8, emptyGrid, 0, 0);
    snakeIdRef.current = initial.length;
    return initial;
  }, []);

  useEffect(() => {
    if (isPlaying) {
      scoreRef.current = 0;
      lockedRef.current = false;
      setScore(0);
      setTimeLeft(GAME_DURATION);
      setFlash(null);
      setGameEnded(false);
      setExitingSnakes([]);
      setHoverId(null);
      setSnakes(buildInitial());
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
  }, [isPlaying, buildInitial]);

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

  // Starts sliding a snake off the grid one cell at a time
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
              // Keep animating while any cell is still near the visible area
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
    if (!isPlaying || lockedRef.current || gameEnded) return;
    const snake = snakesRef.current.find((s) => s.id === snakeId);
    if (!snake) return;

    lockedRef.current = true;
    const grid = buildGrid(snakesRef.current);
    // Clear the snake's own cells so it doesn't block itself
    for (const [r, c] of snake.cells) grid[r][c] = null;

    if (checkMove(snake, grid) === 'escape') {
      setFlash('good');
      const pts = snake.cells.length * 10;
      scoreRef.current += pts;
      setScore(scoreRef.current);
      onScoreUpdate(scoreRef.current);

      // Remove from active board immediately; animate it sliding out
      setSnakes((prev) => prev.filter((s) => s.id !== snakeId));
      startExitAnimation(snake);

      setTimeout(() => {
        setFlash(null);
        exitedRef.current++;
        // snakesRef.current reflects the board AFTER the escaped snake was removed
        const remaining = snakesRef.current;
        let nextSnakes = remaining;

        // Spawn every 3 escapes OR whenever the board drops below MIN_SNAKES
        const needsRefill = nextSnakes.length < MIN_SNAKES;
        if (exitedRef.current % 3 === 0 || needsRefill) {
          const newGrid = buildGrid(remaining);
          colorOffsetRef.current += 2;
          const spawnCount = needsRefill
            ? Math.max(2, MIN_SNAKES - nextSnakes.length + 2)
            : 2;
          const spawned = placeSnakes(
            spawnCount,
            newGrid,
            snakeIdRef.current,
            colorOffsetRef.current
          );
          snakeIdRef.current += spawned.length;
          nextSnakes = [...remaining, ...spawned];
        }
        setSnakes(nextSnakes);
        lockedRef.current = false;
      }, 400);
    } else {
      // Collision → game over
      setFlash('bad');
      setGameEnded(true);
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeout(() => onGameOver(scoreRef.current), 900);
    }
  }

  // Compute hover preview (escape = green glow, blocked = red glow)
  const hoverSnake =
    hoverId !== null ? (snakes.find((s) => s.id === hoverId) ?? null) : null;
  let hoverResult: 'escape' | 'blocked' | null = null;
  if (hoverSnake && isPlaying && !gameEnded) {
    const g = buildGrid(snakes);
    for (const [r, c] of hoverSnake.cells) g[r][c] = null;
    hoverResult = checkMove(hoverSnake, g);
  }

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

      <div className={styles.svgWrap}>
        <svg
          viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
          className={styles.svg}
          onMouseLeave={() => setHoverId(null)}
        >
          {/* Grid background dots */}
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

          {/* Snakes exiting (rendered below active snakes) */}
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
                cursor={isPlaying && !gameEnded ? 'pointer' : 'default'}
                opacity={1}
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
          : gameEnded
            ? '💥 Collision — game over!'
            : 'Click a snake to launch it — green = safe, red = collision'}
      </p>
    </div>
  );
}
