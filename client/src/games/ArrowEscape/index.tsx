import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps } from '../../types';
import styles from './ArrowEscape.module.scss';

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

// Each snake is an ordered path (tail → head).
// headDir = direction the head wants to exit the grid.
// Body cell arrows point toward the next cell; head arrow points in headDir.
interface Snake {
  id: number;
  cells: [number, number][];
  headDir: Dir;
  color: string;
}

const ARROW_CHAR: Record<Dir, string> = {
  up: '▲',
  down: '▼',
  left: '◀',
  right: '▶',
};

const DELTAS: Record<Dir, [number, number]> = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
};

const ALL_DIRS: Dir[] = ['up', 'down', 'left', 'right'];

function dirBetween(from: [number, number], to: [number, number]): Dir {
  if (to[0] < from[0]) return 'up';
  if (to[0] > from[0]) return 'down';
  if (to[1] < from[1]) return 'left';
  return 'right';
}

function cellDir(snake: Snake, idx: number): Dir {
  if (idx < snake.cells.length - 1) {
    return dirBetween(snake.cells[idx], snake.cells[idx + 1]);
  }
  return snake.headDir;
}

function buildGrid(snakes: Snake[]): (number | null)[][] {
  const g: (number | null)[][] = Array.from({ length: GRID }, () =>
    Array(GRID).fill(null)
  );
  for (const s of snakes) for (const [r, c] of s.cells) g[r][c] = s.id;
  return g;
}

// A snake can escape if the single cell directly ahead of its head is free
// (or off-grid). Its curved body will vacate cells as it flows out.
function canEscape(snake: Snake, grid: (number | null)[][]): boolean {
  const head = snake.cells[snake.cells.length - 1];
  const [dr, dc] = DELTAS[snake.headDir];
  const nr = head[0] + dr;
  const nc = head[1] + dc;
  if (nr < 0 || nr >= GRID || nc < 0 || nc >= GRID) return true;
  return grid[nr][nc] === null;
}

// Random-walk snake placement. Snakes prefer to continue in the same direction
// (~60% chance) giving them gentle curves rather than pure random noise.
function randomWalkSnake(
  grid: (number | null)[][],
  id: number,
  color: string
): Snake | null {
  const freeCells: [number, number][] = [];
  for (let r = 0; r < GRID; r++)
    for (let c = 0; c < GRID; c++)
      if (grid[r][c] === null) freeCells.push([r, c]);
  if (freeCells.length < 3) return null;

  for (let attempt = 0; attempt < 80; attempt++) {
    const [sr, sc] = freeCells[Math.floor(Math.random() * freeCells.length)];
    const targetLen = 3 + Math.floor(Math.random() * 4); // 3–6 cells

    const cells: [number, number][] = [[sr, sc]];
    const usedSet = new Set<string>([`${sr},${sc}`]);
    let lastDir: Dir = ALL_DIRS[Math.floor(Math.random() * 4)];

    while (cells.length < targetLen) {
      const [cr, cc] = cells[cells.length - 1];

      // Prefer last direction, fall back to shuffled others
      const others = ALL_DIRS.filter((d) => d !== lastDir).sort(
        () => Math.random() - 0.5
      );
      const dirs =
        Math.random() < 0.6 ? [lastDir, ...others] : [...others, lastDir];

      let moved = false;
      for (const dir of dirs) {
        const [dr, dc] = DELTAS[dir];
        const nr = cr + dr;
        const nc = cc + dc;
        if (
          nr >= 0 &&
          nr < GRID &&
          nc >= 0 &&
          nc < GRID &&
          grid[nr][nc] === null &&
          !usedSet.has(`${nr},${nc}`)
        ) {
          cells.push([nr, nc]);
          usedSet.add(`${nr},${nc}`);
          lastDir = dir;
          moved = true;
          break;
        }
      }
      if (!moved) break;
    }

    if (cells.length >= 3) {
      return { id, cells, headDir: lastDir, color };
    }
  }
  return null;
}

function buildSnakePack(
  count: number,
  grid: (number | null)[][],
  startId: number,
  colorOffset: number
): Snake[] {
  const g = grid.map((row) => [...row]);
  const snakes: Snake[] = [];
  for (let i = 0; i < count; i++) {
    const color = SNAKE_COLORS[(colorOffset + i) % SNAKE_COLORS.length];
    const snake = randomWalkSnake(g, startId + i, color);
    if (snake) {
      snakes.push(snake);
      for (const [r, c] of snake.cells) g[r][c] = snake.id;
    }
  }
  return snakes;
}

export default function ArrowEscape({
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
  const snakesRef = useRef<Snake[]>([]);
  snakesRef.current = snakes;

  const buildInitial = useCallback(() => {
    const emptyGrid: (number | null)[][] = Array.from({ length: GRID }, () =>
      Array(GRID).fill(null)
    );
    snakeIdRef.current = 0;
    exitedRef.current = 0;
    colorOffsetRef.current = 0;
    const initial = buildSnakePack(8, emptyGrid, 0, 0);
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
    // Clear own cells so the snake doesn't block itself
    for (const [r, c] of snake.cells) grid[r][c] = null;

    if (canEscape(snake, grid)) {
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
        if (exitedRef.current % 3 === 0) {
          const newGrid = buildGrid(remaining);
          colorOffsetRef.current += 2;
          const spawned = buildSnakePack(
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
      setFlash('bad');
      setGameEnded(true);
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeout(() => onGameOver(scoreRef.current), 900);
    }
  }

  // Hover preview
  const hoverSnake =
    hoverId !== null ? (snakes.find((s) => s.id === hoverId) ?? null) : null;
  let hoverResult: 'escape' | 'blocked' | null = null;
  if (hoverSnake && isPlaying && !gameEnded) {
    const g = buildGrid(snakes);
    for (const [r, c] of hoverSnake.cells) g[r][c] = null;
    hoverResult = canEscape(hoverSnake, g) ? 'escape' : 'blocked';
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

          {/* Snakes */}
          {snakes.map((snake) => {
            const isHovered = hoverId === snake.id;
            const isExiting = exitingId === snake.id;
            const head = snake.cells[snake.cells.length - 1];
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
                  opacity: isExiting ? 0.1 : 1,
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
                      opacity={isHead ? 1 : 0.7}
                      stroke={glowColor ?? 'transparent'}
                      strokeWidth={glowColor ? 2 : 0}
                    />
                  );
                })}

                {/* Connector bridges between adjacent cells */}
                {snake.cells.slice(0, -1).map(([r, c], idx) => {
                  const [nr, nc] = snake.cells[idx + 1];
                  const isH = r === nr; // same row → horizontal bridge
                  const minC = Math.min(c, nc);
                  const minR = Math.min(r, nr);
                  return isH ? (
                    <rect
                      key={`br-${idx}`}
                      x={PAD + (minC + 1) * CELL - 4}
                      y={PAD + r * CELL + 4}
                      width={8}
                      height={CELL - 8}
                      fill={glowColor ?? snake.color}
                      opacity={0.7}
                    />
                  ) : (
                    <rect
                      key={`br-${idx}`}
                      x={PAD + c * CELL + 4}
                      y={PAD + (minR + 1) * CELL - 4}
                      width={CELL - 8}
                      height={8}
                      fill={glowColor ?? snake.color}
                      opacity={0.7}
                    />
                  );
                })}

                {/* Per-cell direction arrows */}
                {snake.cells.map(([r, c], idx) => {
                  const dir = cellDir(snake, idx);
                  return (
                    <text
                      key={`arr-${idx}`}
                      x={PAD + c * CELL + CELL / 2}
                      y={PAD + r * CELL + CELL / 2 + 6}
                      textAnchor='middle'
                      fontSize={14}
                      fontWeight='900'
                      fill='rgba(255,255,255,0.9)'
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {ARROW_CHAR[dir]}
                    </text>
                  );
                })}
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
