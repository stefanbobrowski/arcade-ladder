import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps } from '../../types';
import styles from './SnakeEscape.module.scss';

const GRID = 7;
const CELL = 50;
const PAD = 16;
const SVG_SIZE = PAD * 2 + GRID * CELL;
const GAME_DURATION = 30;

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

const ARROW: Record<Dir, string> = {
  up: '▲',
  down: '▼',
  left: '◀',
  right: '▶',
};

function getDelta(dir: Dir): [number, number] {
  return dir === 'up'
    ? [-1, 0]
    : dir === 'down'
      ? [1, 0]
      : dir === 'left'
        ? [0, -1]
        : [0, 1];
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
  for (const s of snakes) for (const [r, c] of s.cells) g[r][c] = s.id;
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
  const [exitingId, setExitingId] = useState<number | null>(null);
  const [gameEnded, setGameEnded] = useState(false);

  const scoreRef = useRef(0);
  const exitedRef = useRef(0);
  const snakeIdRef = useRef(0);
  const colorOffsetRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
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
      setExitingId(null);
      setHoverId(null);
      setSnakes(buildInitial());
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
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

  function handleSnakeClick(snakeId: number) {
    if (!isPlaying || lockedRef.current || gameEnded) return;
    const snake = snakesRef.current.find((s) => s.id === snakeId);
    if (!snake) return;

    lockedRef.current = true;
    const grid = buildGrid(snakesRef.current);
    // Clear the snake's own cells so it doesn't block itself
    for (const [r, c] of snake.cells) grid[r][c] = null;

    if (checkMove(snake, grid) === 'escape') {
      setExitingId(snakeId);
      setFlash('good');
      const pts = snake.cells.length * 10;
      scoreRef.current += pts;
      setScore(scoreRef.current);
      onScoreUpdate(scoreRef.current);

      setTimeout(() => {
        setFlash(null);
        setExitingId(null);
        exitedRef.current++;
        const remaining = snakesRef.current.filter((s) => s.id !== snakeId);
        let nextSnakes = remaining;
        // Every 3 escapes, spawn 2 fresh snakes
        if (exitedRef.current % 3 === 0) {
          const newGrid = buildGrid(remaining);
          colorOffsetRef.current += 2;
          const spawned = placeSnakes(
            2,
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

          {/* Snakes */}
          {snakes.map((snake) => {
            const isHovered = hoverId === snake.id;
            const isExiting = exitingId === snake.id;
            const head = getHead(snake);
            const glowColor =
              isHovered && hoverResult === 'escape'
                ? '#22c55e'
                : isHovered && hoverResult === 'blocked'
                  ? '#ef4444'
                  : null;

            return (
              <g
                key={snake.id}
                style={{
                  cursor: isPlaying && !gameEnded ? 'pointer' : 'default',
                  opacity: isExiting ? 0.15 : 1,
                  transition: 'opacity 0.35s',
                }}
                onClick={() => handleSnakeClick(snake.id)}
                onMouseEnter={() => setHoverId(snake.id)}
                onMouseLeave={() => setHoverId(null)}
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
                      rx={8}
                      fill={glowColor ?? snake.color}
                      opacity={isHead ? 1 : 0.72}
                      stroke={glowColor ?? 'transparent'}
                      strokeWidth={glowColor ? 2 : 0}
                    />
                  );
                })}

                {/* Connector bridges between adjacent cells */}
                {snake.cells.slice(0, -1).map(([r, c], idx) => {
                  const [nr, _nc] = snake.cells[idx + 1];
                  const isH = r === nr;
                  return isH ? (
                    // Horizontal bridge: fills gap between cell [r,c] and [r,c+1]
                    <rect
                      key={`br-${idx}`}
                      x={PAD + (c + 1) * CELL - 4}
                      y={PAD + r * CELL + 4}
                      width={8}
                      height={CELL - 8}
                      fill={glowColor ?? snake.color}
                      opacity={0.72}
                    />
                  ) : (
                    // Vertical bridge: fills gap between cell [r,c] and [r+1,c]
                    <rect
                      key={`br-${idx}`}
                      x={PAD + c * CELL + 4}
                      y={PAD + (r + 1) * CELL - 4}
                      width={CELL - 8}
                      height={8}
                      fill={glowColor ?? snake.color}
                      opacity={0.72}
                    />
                  );
                })}

                {/* Direction arrow on head */}
                <text
                  x={PAD + head[1] * CELL + CELL / 2}
                  y={PAD + head[0] * CELL + CELL / 2 + 6}
                  textAnchor='middle'
                  fontSize={16}
                  fontWeight='900'
                  fill='rgba(255,255,255,0.9)'
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {ARROW[snake.dir]}
                </text>
              </g>
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
