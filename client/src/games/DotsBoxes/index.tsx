import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps } from '../../types';
import styles from './DotsBoxes.module.scss';

const SP = 42;
const PAD = 20;
const DOT_R = 5;
const HIT = 20; // click-zone thickness (half)
const CPU_DELAY = 420;
const TOTAL_DURATION = 60; // seconds per full game session
const MIN_DOTS = 3;
const MAX_DOTS = 7;

// ── Pure helpers ──────────────────────────────────────────────────────────────

function makeH(dots: number): boolean[][] {
  return Array.from({ length: dots }, () => Array(dots - 1).fill(false));
}
function makeV(dots: number): boolean[][] {
  return Array.from({ length: dots - 1 }, () => Array(dots).fill(false));
}
function makeBoxes(dots: number): (string | null)[][] {
  return Array.from({ length: dots - 1 }, () => Array(dots - 1).fill(null));
}

function boxSides(
  r: number,
  c: number,
  h: boolean[][],
  v: boolean[][]
): number {
  return +h[r][c] + +h[r + 1][c] + +v[r][c] + +v[r][c + 1];
}

function hAdjBoxes(r: number, c: number, dots: number): [number, number][] {
  const res: [number, number][] = [];
  if (r > 0) res.push([r - 1, c]);
  if (r < dots - 1) res.push([r, c]);
  return res;
}

function vAdjBoxes(r: number, c: number, dots: number): [number, number][] {
  const res: [number, number][] = [];
  if (c > 0) res.push([r, c - 1]);
  if (c < dots - 1) res.push([r, c]);
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
  owner: string,
  dots: number
): MoveResult {
  const nh = h.map((row) => [...row]);
  const nv = v.map((row) => [...row]);
  const nb = boxes.map((row) => [...row]);
  if (type === 'h') nh[r][c] = true;
  else nv[r][c] = true;
  const adj = type === 'h' ? hAdjBoxes(r, c, dots) : vAdjBoxes(r, c, dots);
  let scored = 0;
  for (const [br, bc] of adj) {
    if (br < 0 || br >= dots - 1 || bc < 0 || bc >= dots - 1) continue;
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
  v: boolean[][],
  dots: number
): { type: 'h' | 'v'; r: number; c: number }[] {
  const moves: { type: 'h' | 'v'; r: number; c: number }[] = [];
  for (let r = 0; r < dots; r++)
    for (let c = 0; c < dots - 1; c++)
      if (!h[r][c]) moves.push({ type: 'h', r, c });
  for (let r = 0; r < dots - 1; r++)
    for (let c = 0; c < dots; c++)
      if (!v[r][c]) moves.push({ type: 'v', r, c });
  return moves;
}

function exposesBox(
  type: 'h' | 'v',
  r: number,
  c: number,
  h: boolean[][],
  v: boolean[][],
  dots: number
): boolean {
  const nh = h.map((row) => [...row]);
  const nv = v.map((row) => [...row]);
  if (type === 'h') nh[r][c] = true;
  else nv[r][c] = true;
  const adj = type === 'h' ? hAdjBoxes(r, c, dots) : vAdjBoxes(r, c, dots);
  return adj.some(([br, bc]) => {
    if (br < 0 || br >= dots - 1 || bc < 0 || bc >= dots - 1) return false;
    return boxSides(br, bc, nh, nv) === 3;
  });
}

function cpuChooseMove(
  h: boolean[][],
  v: boolean[][],
  boxes: (string | null)[][],
  dots: number
): { type: 'h' | 'v'; r: number; c: number } | null {
  const moves = allAvailable(h, v, dots);
  if (!moves.length) return null;

  // 1. Complete a box immediately
  const completing = moves.filter((m) => {
    const adj =
      m.type === 'h' ? hAdjBoxes(m.r, m.c, dots) : vAdjBoxes(m.r, m.c, dots);
    return adj.some(([br, bc]) => {
      if (br < 0 || br >= dots - 1 || bc < 0 || bc >= dots - 1 || boxes[br][bc])
        return false;
      return boxSides(br, bc, h, v) === 3;
    });
  });
  if (completing.length) return completing[0];

  // 2. Safe move: doesn't gift a 3-sided box
  const safe = moves.filter((m) => !exposesBox(m.type, m.r, m.c, h, v, dots));
  if (safe.length) return safe[Math.floor(Math.random() * safe.length)];

  // 3. Sacrifice: pick the move that exposes the fewest 3-sided boxes
  let best = moves[0];
  let bestCount = Infinity;
  for (const m of moves) {
    const nh = h.map((row) => [...row]);
    const nv = v.map((row) => [...row]);
    if (m.type === 'h') nh[m.r][m.c] = true;
    else nv[m.r][m.c] = true;
    const adj =
      m.type === 'h' ? hAdjBoxes(m.r, m.c, dots) : vAdjBoxes(m.r, m.c, dots);
    const count = adj.filter(([br, bc]) => {
      if (br < 0 || br >= dots - 1 || bc < 0 || bc >= dots - 1) return false;
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
  const [dots, setDots] = useState(MIN_DOTS);
  const [hLines, setHLines] = useState(() => makeH(MIN_DOTS));
  const [vLines, setVLines] = useState(() => makeV(MIN_DOTS));
  const [boxes, setBoxes] = useState(() => makeBoxes(MIN_DOTS));
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [playerBoxes, setPlayerBoxes] = useState(0);
  const [cpuBoxes, setCpuBoxes] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TOTAL_DURATION);
  const [levelUpFlash, setLevelUpFlash] = useState(false);
  const [hover, setHover] = useState<{
    type: 'h' | 'v';
    r: number;
    c: number;
  } | null>(null);

  const scoreRef = useRef(0);
  const cpuBoxesRef = useRef(0);
  const playerBoxesRef = useRef(0);
  const timeLeftRef = useRef(TOTAL_DURATION);
  const isPlayingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cpuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;

  // Advance to the next board (level up) — always fresh from current state
  const advanceLevelRef = useRef<(currentDots: number) => void>(() => {});
  advanceLevelRef.current = (currentDots: number) => {
    const nextDots = Math.min(currentDots + 1, MAX_DOTS);
    setDots(nextDots);
    setHLines(makeH(nextDots));
    setVLines(makeV(nextDots));
    setBoxes(makeBoxes(nextDots));
    setPlayerBoxes(0);
    setCpuBoxes(0);
    cpuBoxesRef.current = 0;
    playerBoxesRef.current = 0;
    setIsPlayerTurn(true);
    setLevelUpFlash(true);
    setTimeout(() => setLevelUpFlash(false), 900);
  };

  const scheduleCpu = useCallback(
    (h: boolean[][], v: boolean[][], bxs: (string | null)[][], d: number) => {
      cpuTimerRef.current = setTimeout(() => {
        if (!isPlayingRef.current) return;
        const move = cpuChooseMove(h, v, bxs, d);
        if (!move) {
          setIsPlayerTurn(true);
          return;
        }
        const res = applyMove(move.type, move.r, move.c, h, v, bxs, 'cpu', d);
        setHLines(res.h);
        setVLines(res.v);
        setBoxes(res.boxes);
        if (res.scored > 0) {
          const newCpuBoxes = cpuBoxesRef.current + res.scored;
          cpuBoxesRef.current = newCpuBoxes;
          setCpuBoxes(newCpuBoxes);
          if (res.boxes.every((row) => row.every((b) => b !== null))) {
            // CPU wins this board → end game; tie → level up
            if (newCpuBoxes > playerBoxesRef.current) {
              onGameOverRef.current(scoreRef.current);
            } else {
              advanceLevelRef.current(d);
            }
            return;
          }
          scheduleCpu(res.h, res.v, res.boxes, d); // CPU goes again
        } else {
          setIsPlayerTurn(true);
        }
      }, CPU_DELAY);
    },
    []
  );

  useEffect(() => {
    if (isPlaying) {
      isPlayingRef.current = true;
      if (cpuTimerRef.current) clearTimeout(cpuTimerRef.current);
      scoreRef.current = 0;
      cpuBoxesRef.current = 0;
      playerBoxesRef.current = 0;
      timeLeftRef.current = TOTAL_DURATION;
      const startDots = MIN_DOTS;
      setDots(startDots);
      setHLines(makeH(startDots));
      setVLines(makeV(startDots));
      setBoxes(makeBoxes(startDots));
      setIsPlayerTurn(true);
      setPlayerBoxes(0);
      setCpuBoxes(0);
      setTimeLeft(TOTAL_DURATION);
      setLevelUpFlash(false);
      setHover(null);
    } else {
      isPlayingRef.current = false;
      if (cpuTimerRef.current) clearTimeout(cpuTimerRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isPlaying]);

  // Timer
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

  function handleLineClick(type: 'h' | 'v', r: number, c: number) {
    if (!isPlaying || !isPlayerTurn) return;
    const res = applyMove(type, r, c, hLines, vLines, boxes, 'player', dots);
    setHLines(res.h);
    setVLines(res.v);
    setBoxes(res.boxes);
    setHover(null);
    if (res.scored > 0) {
      // Time-weighted scoring: more time left = higher pts per box
      const factor = 1 + timeLeftRef.current / TOTAL_DURATION;
      const gained = Math.round(res.scored * 20 * factor);
      scoreRef.current += gained;
      onScoreUpdate(scoreRef.current);
      const newPlayerBoxes = playerBoxes + res.scored;
      playerBoxesRef.current = newPlayerBoxes;
      setPlayerBoxes(newPlayerBoxes);
      if (res.boxes.every((row) => row.every((b) => b !== null))) {
        // CPU wins this board → end game; tie or player winning → level up
        if (cpuBoxesRef.current > newPlayerBoxes) {
          onGameOver(scoreRef.current);
        } else {
          advanceLevelRef.current(dots);
        }
        return;
      }
      // player scored → goes again
    } else {
      setIsPlayerTurn(false);
      scheduleCpu(res.h, res.v, res.boxes, dots);
    }
  }

  const sp = SP;
  const svgDim = (dots - 1) * sp + PAD * 2;
  const total = (dots - 1) * (dots - 1);

  const hoverLine =
    hover && isPlaying && isPlayerTurn ? (
      <line
        x1={PAD + hover.c * sp}
        y1={PAD + hover.r * sp}
        x2={hover.type === 'h' ? PAD + (hover.c + 1) * sp : PAD + hover.c * sp}
        y2={hover.type === 'h' ? PAD + hover.r * sp : PAD + (hover.r + 1) * sp}
        stroke='rgba(99,102,241,0.75)'
        strokeWidth={3}
        strokeLinecap='round'
        strokeDasharray='6 4'
      />
    ) : null;

  return (
    <div className={styles.game}>
      <div className={`${styles.timer} ${timeLeft <= 10 ? styles.urgent : ''}`}>
        {isPlaying ? `${timeLeft}s` : ''}
      </div>
      <div className={styles.scoreDisplay}>
        {scoreRef.current.toLocaleString()}
      </div>
      {levelUpFlash && (
        <div className={styles.levelUpBanner}>Level {dots - MIN_DOTS + 1}!</div>
      )}
      <div className={styles.levelBadge}>
        Grid {dots}×{dots}
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
          viewBox={`0 0 ${svgDim} ${svgDim}`}
          className={styles.svg}
          onMouseLeave={() => setHover(null)}
        >
          {/* Box fills */}
          {boxes.map((row, r) =>
            row.map((owner, c) =>
              owner ? (
                <rect
                  key={`bf-${r}-${c}`}
                  x={PAD + c * sp + 2}
                  y={PAD + r * sp + 2}
                  width={sp - 4}
                  height={sp - 4}
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
                  x1={PAD + c * sp}
                  y1={PAD + r * sp}
                  x2={PAD + (c + 1) * sp}
                  y2={PAD + r * sp}
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
                  x1={PAD + c * sp}
                  y1={PAD + r * sp}
                  x2={PAD + c * sp}
                  y2={PAD + (r + 1) * sp}
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
                  x={PAD + c * sp}
                  y={PAD + r * sp - HIT / 2}
                  width={sp}
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
                  x={PAD + c * sp - HIT / 2}
                  y={PAD + r * sp}
                  width={HIT}
                  height={sp}
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
                  x={PAD + c * sp + sp / 2}
                  y={PAD + r * sp + sp / 2 + 6}
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
          {Array.from({ length: dots }, (_, r) =>
            Array.from({ length: dots }, (_, c) => (
              <circle
                key={`d-${r}-${c}`}
                cx={PAD + c * sp}
                cy={PAD + r * sp}
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
