import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps } from '../../types';
import styles from './DotsBoxes.module.scss';

const DOTS = 7; // 7×7 grid → 6×6 = 36 boxes
const GAME_DURATION = 30;
const SP = 54; // SVG units between dots
const PAD = 20;
const DOT_R = 5;
const HIT = 20; // click-zone thickness (half)
const SVG_DIM = (DOTS - 1) * SP + PAD * 2; // 364
const CPU_DELAY = 420;

// ── Pure helpers ──────────────────────────────────────────────────────────────

function makeH(): boolean[][] {
  return Array.from({ length: DOTS }, () => Array(DOTS - 1).fill(false));
}
function makeV(): boolean[][] {
  return Array.from({ length: DOTS - 1 }, () => Array(DOTS).fill(false));
}
function makeBoxes(): (string | null)[][] {
  return Array.from({ length: DOTS - 1 }, () => Array(DOTS - 1).fill(null));
}

function boxSides(
  r: number,
  c: number,
  h: boolean[][],
  v: boolean[][]
): number {
  return +h[r][c] + +h[r + 1][c] + +v[r][c] + +v[r][c + 1];
}

function hAdjBoxes(r: number, c: number): [number, number][] {
  const res: [number, number][] = [];
  if (r > 0) res.push([r - 1, c]);
  if (r < DOTS - 1) res.push([r, c]);
  return res;
}

function vAdjBoxes(r: number, c: number): [number, number][] {
  const res: [number, number][] = [];
  if (c > 0) res.push([r, c - 1]);
  if (c < DOTS - 1) res.push([r, c]);
  return res;
}

interface MoveResult {
  h: boolean[][];
  v: boolean[][];
  boxes: (string | null)[][];
  scored: number;
}

function applyMove(
  type: 'h' | 'v',
  r: number,
  c: number,
  h: boolean[][],
  v: boolean[][],
  boxes: (string | null)[][],
  owner: string
): MoveResult {
  const nh = h.map((row) => [...row]);
  const nv = v.map((row) => [...row]);
  const nb = boxes.map((row) => [...row]);
  if (type === 'h') nh[r][c] = true;
  else nv[r][c] = true;
  const adj = type === 'h' ? hAdjBoxes(r, c) : vAdjBoxes(r, c);
  let scored = 0;
  for (const [br, bc] of adj) {
    if (br < 0 || br >= DOTS - 1 || bc < 0 || bc >= DOTS - 1) continue;
    if (nb[br][bc]) continue;
    if (nh[br][bc] && nh[br + 1][bc] && nv[br][bc] && nv[br][bc + 1]) {
      nb[br][bc] = owner;
      scored++;
    }
  }
  return { h: nh, v: nv, boxes: nb, scored };
}

function allAvailable(
  h: boolean[][],
  v: boolean[][]
): { type: 'h' | 'v'; r: number; c: number }[] {
  const moves: { type: 'h' | 'v'; r: number; c: number }[] = [];
  for (let r = 0; r < DOTS; r++)
    for (let c = 0; c < DOTS - 1; c++)
      if (!h[r][c]) moves.push({ type: 'h', r, c });
  for (let r = 0; r < DOTS - 1; r++)
    for (let c = 0; c < DOTS; c++)
      if (!v[r][c]) moves.push({ type: 'v', r, c });
  return moves;
}

function exposesBox(
  type: 'h' | 'v',
  r: number,
  c: number,
  h: boolean[][],
  v: boolean[][]
): boolean {
  const nh = h.map((row) => [...row]);
  const nv = v.map((row) => [...row]);
  if (type === 'h') nh[r][c] = true;
  else nv[r][c] = true;
  const adj = type === 'h' ? hAdjBoxes(r, c) : vAdjBoxes(r, c);
  return adj.some(([br, bc]) => {
    if (br < 0 || br >= DOTS - 1 || bc < 0 || bc >= DOTS - 1) return false;
    return boxSides(br, bc, nh, nv) === 3;
  });
}

function cpuChooseMove(
  h: boolean[][],
  v: boolean[][],
  boxes: (string | null)[][]
): { type: 'h' | 'v'; r: number; c: number } | null {
  const moves = allAvailable(h, v);
  if (!moves.length) return null;

  // 1. Complete a box immediately
  const completing = moves.filter((m) => {
    const adj = m.type === 'h' ? hAdjBoxes(m.r, m.c) : vAdjBoxes(m.r, m.c);
    return adj.some(([br, bc]) => {
      if (br < 0 || br >= DOTS - 1 || bc < 0 || bc >= DOTS - 1 || boxes[br][bc])
        return false;
      return boxSides(br, bc, h, v) === 3;
    });
  });
  if (completing.length) return completing[0];

  // 2. Safe move: doesn't gift a 3-sided box
  const safe = moves.filter((m) => !exposesBox(m.type, m.r, m.c, h, v));
  if (safe.length) return safe[Math.floor(Math.random() * safe.length)];

  // 3. Sacrifice: pick the move that exposes the fewest 3-sided boxes
  let best = moves[0];
  let bestCount = Infinity;
  for (const m of moves) {
    const nh = h.map((row) => [...row]);
    const nv = v.map((row) => [...row]);
    if (m.type === 'h') nh[m.r][m.c] = true;
    else nv[m.r][m.c] = true;
    const adj = m.type === 'h' ? hAdjBoxes(m.r, m.c) : vAdjBoxes(m.r, m.c);
    const count = adj.filter(([br, bc]) => {
      if (br < 0 || br >= DOTS - 1 || bc < 0 || bc >= DOTS - 1) return false;
      return boxSides(br, bc, nh, nv) === 3;
    }).length;
    if (count < bestCount) {
      bestCount = count;
      best = m;
    }
  }
  return best;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DotsBoxes({
  onScoreUpdate,
  onGameOver,
  isPlaying,
}: GameProps) {
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [hLines, setHLines] = useState(makeH);
  const [vLines, setVLines] = useState(makeV);
  const [boxes, setBoxes] = useState(makeBoxes);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [playerBoxes, setPlayerBoxes] = useState(0);
  const [cpuBoxes, setCpuBoxes] = useState(0);
  const [hover, setHover] = useState<{
    type: 'h' | 'v';
    r: number;
    c: number;
  } | null>(null);

  const scoreRef = useRef(0);
  const isPlayingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cpuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleCpu = useCallback(
    (h: boolean[][], v: boolean[][], bxs: (string | null)[][]) => {
      cpuTimerRef.current = setTimeout(() => {
        if (!isPlayingRef.current) return;
        const move = cpuChooseMove(h, v, bxs);
        if (!move) {
          setIsPlayerTurn(true);
          return;
        }
        const res = applyMove(move.type, move.r, move.c, h, v, bxs, 'cpu');
        setHLines(res.h);
        setVLines(res.v);
        setBoxes(res.boxes);
        if (res.scored > 0) {
          setCpuBoxes((s) => s + res.scored);
          if (res.boxes.every((row) => row.every((b) => b !== null))) {
            onGameOver(scoreRef.current);
            return;
          }
          scheduleCpu(res.h, res.v, res.boxes); // CPU goes again
        } else {
          setIsPlayerTurn(true);
        }
      }, CPU_DELAY);
    },
    [onGameOver]
  );

  useEffect(() => {
    if (isPlaying) {
      isPlayingRef.current = true;
      if (cpuTimerRef.current) clearTimeout(cpuTimerRef.current);
      scoreRef.current = 0;
      setHLines(makeH());
      setVLines(makeV());
      setBoxes(makeBoxes());
      setIsPlayerTurn(true);
      setPlayerBoxes(0);
      setCpuBoxes(0);
      setTimeLeft(GAME_DURATION);
      setHover(null);
    } else {
      isPlayingRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (cpuTimerRef.current) clearTimeout(cpuTimerRef.current);
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

  function handleLineClick(type: 'h' | 'v', r: number, c: number) {
    if (!isPlaying || !isPlayerTurn) return;
    const res = applyMove(type, r, c, hLines, vLines, boxes, 'player');
    setHLines(res.h);
    setVLines(res.v);
    setBoxes(res.boxes);
    setHover(null);
    if (res.scored > 0) {
      const newScore = scoreRef.current + res.scored * 20;
      scoreRef.current = newScore;
      setPlayerBoxes((p) => p + res.scored);
      onScoreUpdate(newScore);
      if (res.boxes.every((row) => row.every((b) => b !== null))) {
        onGameOver(newScore);
        return;
      }
      // player scored → goes again, isPlayerTurn stays true
    } else {
      setIsPlayerTurn(false);
      scheduleCpu(res.h, res.v, res.boxes);
    }
  }

  const total = (DOTS - 1) * (DOTS - 1);
  const urgentTime = timeLeft <= 10;

  const hoverLine =
    hover && isPlaying && isPlayerTurn ? (
      <line
        x1={PAD + hover.c * SP}
        y1={PAD + hover.r * SP}
        x2={hover.type === 'h' ? PAD + (hover.c + 1) * SP : PAD + hover.c * SP}
        y2={hover.type === 'h' ? PAD + hover.r * SP : PAD + (hover.r + 1) * SP}
        stroke='rgba(99,102,241,0.75)'
        strokeWidth={3}
        strokeLinecap='round'
        strokeDasharray='6 4'
      />
    ) : null;

  return (
    <div className={styles.game}>
      <div
        className={
          urgentTime ? `${styles.timer} ${styles.urgent}` : styles.timer
        }
      >
        {timeLeft}s
      </div>

      <div className={styles.scoreboard}>
        <div
          className={`${styles.scoreChip} ${styles.playerChip} ${isPlaying && isPlayerTurn ? styles.active : ''}`}
        >
          <span className={styles.chipLabel}>You</span>
          <span className={styles.chipVal}>{playerBoxes}</span>
        </div>
        <div className={styles.scoreTotal}>
          {total - playerBoxes - cpuBoxes} left
        </div>
        <div
          className={`${styles.scoreChip} ${styles.cpuChip} ${isPlaying && !isPlayerTurn ? styles.active : ''}`}
        >
          <span className={styles.chipLabel}>CPU</span>
          <span className={styles.chipVal}>{cpuBoxes}</span>
        </div>
      </div>

      <div className={styles.svgWrap}>
        <svg
          viewBox={`0 0 ${SVG_DIM} ${SVG_DIM}`}
          className={styles.svg}
          onMouseLeave={() => setHover(null)}
        >
          {/* Box fills */}
          {boxes.map((row, r) =>
            row.map((owner, c) =>
              owner ? (
                <rect
                  key={`bf-${r}-${c}`}
                  x={PAD + c * SP + 2}
                  y={PAD + r * SP + 2}
                  width={SP - 4}
                  height={SP - 4}
                  rx={3}
                  fill={
                    owner === 'player'
                      ? 'rgba(99,102,241,0.35)'
                      : 'rgba(239,68,68,0.25)'
                  }
                />
              ) : null
            )
          )}

          {/* Drawn horizontal lines */}
          {hLines.map((row, r) =>
            row.map((drawn, c) =>
              drawn ? (
                <line
                  key={`hl-${r}-${c}`}
                  x1={PAD + c * SP}
                  y1={PAD + r * SP}
                  x2={PAD + (c + 1) * SP}
                  y2={PAD + r * SP}
                  stroke='rgba(255,255,255,0.9)'
                  strokeWidth={3}
                  strokeLinecap='round'
                />
              ) : null
            )
          )}

          {/* Drawn vertical lines */}
          {vLines.map((row, r) =>
            row.map((drawn, c) =>
              drawn ? (
                <line
                  key={`vl-${r}-${c}`}
                  x1={PAD + c * SP}
                  y1={PAD + r * SP}
                  x2={PAD + c * SP}
                  y2={PAD + (r + 1) * SP}
                  stroke='rgba(255,255,255,0.9)'
                  strokeWidth={3}
                  strokeLinecap='round'
                />
              ) : null
            )
          )}

          {hoverLine}

          {/* Clickable hit zones — horizontal */}
          {hLines.map((row, r) =>
            row.map((drawn, c) =>
              !drawn ? (
                <rect
                  key={`hh-${r}-${c}`}
                  x={PAD + c * SP}
                  y={PAD + r * SP - HIT / 2}
                  width={SP}
                  height={HIT}
                  fill='transparent'
                  style={{
                    cursor: isPlaying && isPlayerTurn ? 'pointer' : 'default',
                  }}
                  onMouseEnter={() => setHover({ type: 'h', r, c })}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => handleLineClick('h', r, c)}
                />
              ) : null
            )
          )}

          {/* Clickable hit zones — vertical */}
          {vLines.map((row, r) =>
            row.map((drawn, c) =>
              !drawn ? (
                <rect
                  key={`vh-${r}-${c}`}
                  x={PAD + c * SP - HIT / 2}
                  y={PAD + r * SP}
                  width={HIT}
                  height={SP}
                  fill='transparent'
                  style={{
                    cursor: isPlaying && isPlayerTurn ? 'pointer' : 'default',
                  }}
                  onMouseEnter={() => setHover({ type: 'v', r, c })}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => handleLineClick('v', r, c)}
                />
              ) : null
            )
          )}

          {/* Box owner labels */}
          {boxes.map((row, r) =>
            row.map((owner, c) =>
              owner ? (
                <text
                  key={`bt-${r}-${c}`}
                  x={PAD + c * SP + SP / 2}
                  y={PAD + r * SP + SP / 2 + 6}
                  textAnchor='middle'
                  fontSize={15}
                  fontWeight='800'
                  fill={owner === 'player' ? '#818cf8' : '#fca5a5'}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {owner === 'player' ? 'P' : 'C'}
                </text>
              ) : null
            )
          )}

          {/* Dots */}
          {Array.from({ length: DOTS }, (_, r) =>
            Array.from({ length: DOTS }, (_, c) => (
              <circle
                key={`d-${r}-${c}`}
                cx={PAD + c * SP}
                cy={PAD + r * SP}
                r={DOT_R}
                fill='white'
                style={{ pointerEvents: 'none' }}
              />
            ))
          )}
        </svg>
      </div>

      {isPlaying && (
        <div className={styles.turnHint}>
          {isPlayerTurn
            ? '⬆ Your turn — click a line segment'
            : '⏳ CPU thinking…'}
        </div>
      )}
    </div>
  );
}
