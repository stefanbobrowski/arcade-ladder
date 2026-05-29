import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps } from '../../types';
import styles from './DotsBoxes.module.scss';

const ROUND_CONFIGS = [
  { dots: 7, sp: 54 }, // round 1 — 6×6 boxes
  { dots: 8, sp: 48 }, // round 2 — 7×7 boxes
  { dots: 9, sp: 42 }, // round 3 — 8×8 boxes
];
const PAD = 20;
const DOT_R = 5;
const HIT = 20; // click-zone thickness (half)
const CPU_DELAY = 420;

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
  const [round, setRound] = useState(0);
  const [hLines, setHLines] = useState(() => makeH(ROUND_CONFIGS[0].dots));
  const [vLines, setVLines] = useState(() => makeV(ROUND_CONFIGS[0].dots));
  const [boxes, setBoxes] = useState(() => makeBoxes(ROUND_CONFIGS[0].dots));
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [playerBoxes, setPlayerBoxes] = useState(0);
  const [cpuBoxes, setCpuBoxes] = useState(0);
  const [winOverlay, setWinOverlay] = useState(false);
  const [hover, setHover] = useState<{
    type: 'h' | 'v';
    r: number;
    c: number;
  } | null>(null);

  const scoreRef = useRef(0);
  const isPlayingRef = useRef(false);
  const cpuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundRef = useRef(0);

  const scheduleCpu = useCallback(
    (
      h: boolean[][],
      v: boolean[][],
      bxs: (string | null)[][],
      dots: number
    ) => {
      cpuTimerRef.current = setTimeout(() => {
        if (!isPlayingRef.current) return;
        const move = cpuChooseMove(h, v, bxs, dots);
        if (!move) {
          setIsPlayerTurn(true);
          return;
        }
        const res = applyMove(
          move.type,
          move.r,
          move.c,
          h,
          v,
          bxs,
          'cpu',
          dots
        );
        setHLines(res.h);
        setVLines(res.v);
        setBoxes(res.boxes);
        if (res.scored > 0) {
          setCpuBoxes((s) => s + res.scored);
          if (res.boxes.every((row) => row.every((b) => b !== null))) {
            // CPU wins this round — game over
            onGameOver(scoreRef.current);
            return;
          }
          scheduleCpu(res.h, res.v, res.boxes, dots); // CPU goes again
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
      roundRef.current = 0;
      if (cpuTimerRef.current) clearTimeout(cpuTimerRef.current);
      scoreRef.current = 0;
      const { dots } = ROUND_CONFIGS[0];
      setRound(0);
      setHLines(makeH(dots));
      setVLines(makeV(dots));
      setBoxes(makeBoxes(dots));
      setIsPlayerTurn(true);
      setPlayerBoxes(0);
      setCpuBoxes(0);
      setWinOverlay(false);
      setHover(null);
    } else {
      isPlayingRef.current = false;
      if (cpuTimerRef.current) clearTimeout(cpuTimerRef.current);
    }
  }, [isPlaying]);

  const { dots, sp } = ROUND_CONFIGS[Math.min(round, ROUND_CONFIGS.length - 1)];
  const svgDim = (dots - 1) * sp + PAD * 2;
  const total = (dots - 1) * (dots - 1);

  function handleLineClick(type: 'h' | 'v', r: number, c: number) {
    if (!isPlaying || !isPlayerTurn || winOverlay) return;
    const res = applyMove(type, r, c, hLines, vLines, boxes, 'player', dots);
    setHLines(res.h);
    setVLines(res.v);
    setBoxes(res.boxes);
    setHover(null);
    if (res.scored > 0) {
      const newScore = scoreRef.current + res.scored * 20;
      scoreRef.current = newScore;
      const newPlayerBoxes = playerBoxes + res.scored;
      setPlayerBoxes(newPlayerBoxes);
      onScoreUpdate(newScore);
      if (res.boxes.every((row) => row.every((b) => b !== null))) {
        // Board fully filled
        const cpuCount = res.boxes.flat().filter((b) => b === 'cpu').length;
        const playerCount = res.boxes
          .flat()
          .filter((b) => b === 'player').length;
        if (playerCount > cpuCount) {
          // Player wins this round
          const nextRound = roundRef.current + 1;
          if (nextRound >= ROUND_CONFIGS.length) {
            // All 3 rounds complete
            onGameOver(newScore);
          } else {
            setWinOverlay(true);
          }
        } else {
          onGameOver(newScore);
        }
        return;
      }
      // player scored → goes again, isPlayerTurn stays true
    } else {
      setIsPlayerTurn(false);
      scheduleCpu(res.h, res.v, res.boxes, dots);
    }
  }

  function handleNextRound() {
    if (!isPlayingRef.current) return;
    const nextRound = roundRef.current + 1;
    roundRef.current = nextRound;
    const { dots: nextDots } = ROUND_CONFIGS[nextRound];
    setRound(nextRound);
    setHLines(makeH(nextDots));
    setVLines(makeV(nextDots));
    setBoxes(makeBoxes(nextDots));
    setIsPlayerTurn(true);
    setPlayerBoxes(0);
    setCpuBoxes(0);
    setWinOverlay(false);
    setHover(null);
  }

  const hoverLine =
    hover && isPlaying && isPlayerTurn && !winOverlay ? (
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
      <div className={styles.scoreboard}>
        <div
          className={`${styles.scoreChip} ${styles.playerChip} ${isPlaying && isPlayerTurn && !winOverlay ? styles.active : ''}`}
        >
          <span className={styles.chipLabel}>You</span>
          <span className={styles.chipVal}>{playerBoxes}</span>
        </div>
        <div className={styles.scoreTotal}>
          {total - playerBoxes - cpuBoxes} left
        </div>
        <div
          className={`${styles.scoreChip} ${styles.cpuChip} ${isPlaying && !isPlayerTurn && !winOverlay ? styles.active : ''}`}
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
                    cursor:
                      isPlaying && isPlayerTurn && !winOverlay
                        ? 'pointer'
                        : 'default',
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
                    cursor:
                      isPlaying && isPlayerTurn && !winOverlay
                        ? 'pointer'
                        : 'default',
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

      {isPlaying && !winOverlay && (
        <div className={styles.turnHint}>
          {isPlayerTurn
            ? '⬆ Your turn — click a line segment'
            : '⏳ CPU thinking…'}
        </div>
      )}

      {winOverlay && (
        <div className={styles.winOverlay}>
          <div className={styles.winCard}>
            <div className={styles.winTitle}>
              🏆 Round {round + 1} Complete!
            </div>
            <div className={styles.winScore}>Score: {scoreRef.current}</div>
            <button className={styles.nextRoundBtn} onClick={handleNextRound}>
              Round {round + 2} →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
