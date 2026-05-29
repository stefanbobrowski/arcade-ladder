import { useEffect, useRef, useState, useCallback } from 'react';
import type { GameProps } from '../../types';
import styles from './PizzaTime.module.scss';

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1 — CUT THE PIZZA
// ─────────────────────────────────────────────────────────────────────────────

const P1_SIZE = 340;
const CX = P1_SIZE / 2;
const CY = P1_SIZE / 2;
const PIZZA_R = 148;
const SAUCE_R = 128;
const TOTAL_CUTS = 4;
const TARGET_ANGLES = [0, 45, 90, 135];
const CENTER_TOL = 38;
const MIN_LEN = PIZZA_R;

const PEPPERONI: { x: number; y: number }[] = [
  { x: 100, y: 95 },
  { x: 200, y: 85 },
  { x: 255, y: 165 },
  { x: 215, y: 255 },
  { x: 118, y: 268 },
  { x: 58, y: 198 },
  { x: 158, y: 138 },
  { x: 178, y: 215 },
  { x: 98, y: 168 },
];

function lineAngle(x1: number, y1: number, x2: number, y2: number): number {
  let a = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
  if (a < 0) a += 180;
  if (a >= 180) a -= 180;
  return a;
}
function angleDeviation(a: number): number {
  return Math.min(
    ...TARGET_ANGLES.map((t) => {
      const d = Math.abs(a - t);
      return d > 90 ? 180 - d : d;
    })
  );
}
function distPointToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1,
    dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

interface CutData {
  p1: [number, number];
  p2: [number, number];
  score: number;
}

function drawPizza(
  ctx: CanvasRenderingContext2D,
  cuts: CutData[],
  live?: { x1: number; y1: number; x2: number; y2: number } | null
) {
  ctx.clearRect(0, 0, P1_SIZE, P1_SIZE);
  ctx.beginPath();
  ctx.arc(CX, CY, PIZZA_R, 0, Math.PI * 2);
  ctx.fillStyle = '#d4811a';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(CX, CY, SAUCE_R, 0, Math.PI * 2);
  ctx.fillStyle = '#b83225';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(CX, CY, SAUCE_R - 6, 0, Math.PI * 2);
  ctx.fillStyle = '#f0c840';
  ctx.fill();
  for (const p of PEPPERONI) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 15, 0, Math.PI * 2);
    ctx.fillStyle = '#8b1818';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x - 4, p.y - 4, 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,120,120,0.35)';
    ctx.fill();
  }
  ctx.save();
  ctx.setLineDash([7, 5]);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1.5;
  for (const deg of TARGET_ANGLES) {
    const rad = (deg * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(CX - Math.cos(rad) * PIZZA_R, CY - Math.sin(rad) * PIZZA_R);
    ctx.lineTo(CX + Math.cos(rad) * PIZZA_R, CY + Math.sin(rad) * PIZZA_R);
    ctx.stroke();
  }
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.arc(CX, CY, PIZZA_R, 0, Math.PI * 2);
  ctx.clip();
  for (const cut of cuts) {
    const hue = Math.round((cut.score / 100) * 120);
    ctx.strokeStyle = `hsl(${hue}, 90%, 55%)`;
    ctx.lineWidth = 4;
    ctx.setLineDash([]);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(...cut.p1);
    ctx.lineTo(...cut.p2);
    ctx.stroke();
  }
  if (live) {
    ctx.strokeStyle = 'rgba(255,255,140,0.9)';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(live.x1, live.y1);
    ctx.lineTo(live.x2, live.y2);
    ctx.stroke();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(CX, CY, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#c8890a';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function grade(score: number) {
  if (score >= 90) return 'perfect';
  if (score >= 70) return 'good';
  if (score >= 45) return 'ok';
  return 'bad';
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2 — THROW THE SLICES
// ─────────────────────────────────────────────────────────────────────────────

const P2_W = 500;
const P2_H = 420;
const COUNTER_Y = 295; // y of the counter top surface
const SLICE_R = 28;
const MOUTH_R = 24;
const GRAVITY = 0.32;
const NUM_CUSTOMERS = 4;
const PHASE2_TIME = 25; // seconds

// Slice colours (triangular wedge tones)
const SLICE_COLORS = [
  '#f0c840',
  '#d4811a',
  '#b83225',
  '#8b1818',
  '#f0c840',
  '#d4811a',
  '#b83225',
  '#8b1818',
];

interface Customer {
  id: number;
  x: number; // 0–1 normalised
  bobOffset: number;
  phase: number; // radians, for bobbing
  speed: number; // bob speed
  isOpen: boolean;
  openTimer: number;
}

interface P2Slice {
  id: number;
  colorIdx: number;
  // physics
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  // dragging
  dragging: boolean;
  // state
  landed: boolean;
  scored: boolean;
}

interface FeedbackPopup {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

function buildCustomers(count: number): Customer[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: (i + 0.5) / count,
    bobOffset: 0,
    phase: (i / count) * Math.PI * 2,
    speed: 0.8 + Math.random() * 0.5,
    isOpen: false,
    openTimer: 0,
  }));
}

function buildSlices(count: number): P2Slice[] {
  const spacing = (P2_W - 120) / Math.max(1, count - 1);
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    colorIdx: i % SLICE_COLORS.length,
    x: 60 + i * spacing,
    y: COUNTER_Y - SLICE_R + 4, // resting on the counter
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2 + (i / count - 0.5) * 0.9, // slight fan
    spin: 0,
    dragging: false,
    landed: true, // starts resting — gravity only kicks in after you pick it up
    scored: false,
  }));
}

function drawSlice(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  colorIdx: number,
  alpha = 1
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(angle);
  const sweep = (Math.PI * 2) / 8;
  // Crust arc
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, SLICE_R, -sweep / 2, sweep / 2);
  ctx.closePath();
  ctx.fillStyle = SLICE_COLORS[colorIdx];
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Crust edge darker
  ctx.beginPath();
  ctx.arc(0, 0, SLICE_R - 2, -sweep / 2, sweep / 2);
  ctx.strokeStyle = '#8b1818';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

function drawCustomer(
  ctx: CanvasRenderingContext2D,
  c: Customer,
  bobY: number,
  _canvasH: number
) {
  const x = c.x * P2_W;
  const headY = 72 + bobY; // head centre near top of canvas

  // Body / torso (seated behind counter, only upper body visible)
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x - 22, headY + 18, 44, 55, 8);
  } else {
    ctx.rect(x - 22, headY + 18, 44, 55);
  }
  ctx.fillStyle = c.isOpen ? '#b45309' : '#1d4ed8';
  ctx.fill();

  // Head
  ctx.beginPath();
  ctx.arc(x, headY, 22, 0, Math.PI * 2);
  ctx.fillStyle = '#fde68a';
  ctx.fill();
  ctx.strokeStyle = '#92400e';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Eyes
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(x - 7, headY - 6, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 7, headY - 6, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Mouth
  if (c.isOpen) {
    // Big open mouth — wide oval so slices can land in it
    ctx.beginPath();
    ctx.ellipse(
      x,
      headY + 9,
      MOUTH_R * 0.75,
      MOUTH_R * 0.55,
      0,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = '#7f1d1d';
    ctx.fill();
    ctx.strokeStyle = '#450a0a';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Teeth
    ctx.fillStyle = '#fff';
    ctx.fillRect(x - 13, headY + 4, 10, 7);
    ctx.fillRect(x + 3, headY + 4, 10, 7);
    // Tongue
    ctx.beginPath();
    ctx.arc(x, headY + 14, 8, 0, Math.PI);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    // Arms reaching out excitedly
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 22, headY + 28);
    ctx.lineTo(x - 40, headY + 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 22, headY + 28);
    ctx.lineTo(x + 40, headY + 10);
    ctx.stroke();
  } else {
    // Waiting — slight frown / neutral
    ctx.beginPath();
    ctx.arc(x, headY + 10, 8, 0.2, Math.PI - 0.2);
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Arms relaxed
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 22, headY + 30);
    ctx.lineTo(x - 34, headY + 46);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 22, headY + 30);
    ctx.lineTo(x + 34, headY + 46);
    ctx.stroke();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function PizzaTime({
  isPlaying,
  onScoreUpdate,
  onGameOver,
}: GameProps) {
  // ── Phase 1 state ──
  const p1CanvasRef = useRef<HTMLCanvasElement>(null);
  const p1DrawingRef = useRef(false);
  const p1StartRef = useRef<[number, number]>([0, 0]);

  const [cuts, setCuts] = useState<CutData[]>([]);
  const cutsRef = useRef<CutData[]>([]);
  cutsRef.current = cuts;

  const [phase, setPhase] = useState<'idle' | 'cutting' | 'throwing' | 'done'>(
    'idle'
  );
  const phaseRef = useRef<'idle' | 'cutting' | 'throwing' | 'done'>('idle');
  phaseRef.current = phase;

  // ── Phase 2 state ──
  const p2CanvasRef = useRef<HTMLCanvasElement>(null);
  const p2StateRef = useRef<{
    slices: P2Slice[];
    customers: Customer[];
    dragId: number | null;
    dragOffX: number;
    dragOffY: number;
    pickupX: number;
    pickupY: number;
    throwStart: { x: number; y: number; t: number } | null;
    pointerHistory: Array<{ x: number; y: number; t: number }>;
    timeLeft: number;
    totalScore: number;
    popups: FeedbackPopup[];
    popupId: number;
    openTimers: number[];
    rafId: number | null;
  } | null>(null);

  const p2ScoreRef = useRef(0);
  const endedRef = useRef(false);
  const [p2TimeLeft, setP2TimeLeft] = useState(PHASE2_TIME);
  const [p2Score, setP2Score] = useState(0);
  const [phase1Score, setPhase1Score] = useState(0);

  // ── Reset everything ──
  const resetGame = useCallback(() => {
    setCuts([]);
    setPhase('cutting');
    p2ScoreRef.current = 0;
    setP2Score(0);
    setPhase1Score(0);
    setP2TimeLeft(PHASE2_TIME);
    endedRef.current = false;
    const ctx = p1CanvasRef.current?.getContext('2d');
    if (ctx) drawPizza(ctx, []);
  }, []);

  useEffect(() => {
    if (isPlaying) resetGame();
    else {
      setPhase('idle');
      stopP2();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  // ── Phase 1 redraw ──
  useEffect(() => {
    const ctx = p1CanvasRef.current?.getContext('2d');
    if (ctx) drawPizza(ctx, cuts);
  }, [cuts]);

  // ── Phase 1 pointer handlers ──
  function p1Pos(e: React.PointerEvent<HTMLCanvasElement>): [number, number] {
    const rect = p1CanvasRef.current!.getBoundingClientRect();
    return [
      ((e.clientX - rect.left) / rect.width) * P1_SIZE,
      ((e.clientY - rect.top) / rect.height) * P1_SIZE,
    ];
  }

  function onP1Down(e: React.PointerEvent<HTMLCanvasElement>) {
    if (phase !== 'cutting') return;
    p1DrawingRef.current = true;
    p1StartRef.current = p1Pos(e);
    p1CanvasRef.current?.setPointerCapture(e.pointerId);
  }
  function onP1Move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!p1DrawingRef.current) return;
    const [x2, y2] = p1Pos(e);
    const [x1, y1] = p1StartRef.current;
    const ctx = p1CanvasRef.current?.getContext('2d');
    if (ctx) drawPizza(ctx, cutsRef.current, { x1, y1, x2, y2 });
  }
  function onP1Up(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!p1DrawingRef.current) return;
    p1DrawingRef.current = false;
    const [x2, y2] = p1Pos(e);
    const [x1, y1] = p1StartRef.current;
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (
      len < MIN_LEN ||
      distPointToSegment(CX, CY, x1, y1, x2, y2) > CENTER_TOL
    ) {
      const ctx = p1CanvasRef.current?.getContext('2d');
      if (ctx) drawPizza(ctx, cutsRef.current);
      return;
    }
    const angle = lineAngle(x1, y1, x2, y2);
    const deviation = angleDeviation(angle);
    const score = Math.max(0, Math.round(100 - deviation * 3.5));
    const newCut: CutData = { p1: [x1, y1], p2: [x2, y2], score };
    const newCuts = [...cutsRef.current, newCut];
    setCuts(newCuts);
    const total = newCuts.reduce((s, c) => s + c.score, 0);
    onScoreUpdate(total);
    if (newCuts.length >= TOTAL_CUTS) {
      setPhase1Score(total);
      setTimeout(() => startPhase2(total), 600);
    }
  }

  // ── Phase 2 launch ──
  function startPhase2(p1Total: number) {
    setPhase('throwing');
    const slices = buildSlices(8);
    // buildSlices positions them evenly along the counter
    const customers = buildCustomers(NUM_CUSTOMERS);
    p2StateRef.current = {
      slices,
      customers,
      dragId: null,
      dragOffX: 0,
      dragOffY: 0,
      pickupX: 0,
      pickupY: 0,
      throwStart: null,
      pointerHistory: [],
      timeLeft: PHASE2_TIME,
      totalScore: p1Total,
      popups: [],
      popupId: 0,
      openTimers: [],
      rafId: null,
    };
    p2ScoreRef.current = 0;
    setP2TimeLeft(PHASE2_TIME);
    setP2Score(0);
    scheduleCustomerOpens();
    runP2Loop();
  }

  function stopP2() {
    const s = p2StateRef.current;
    if (!s) return;
    if (s.rafId) cancelAnimationFrame(s.rafId);
    s.openTimers.forEach(clearTimeout);
    p2StateRef.current = null;
  }

  // Randomly schedule customers opening their mouths
  function scheduleCustomerOpens() {
    const s = p2StateRef.current;
    if (!s) return;
    // Start alternating customers open immediately
    s.customers[0].isOpen = true;
    s.customers[2].isOpen = true;
    const ids: number[] = [];
    function scheduleOne(cIdx: number, delay: number) {
      const id = window.setTimeout(() => {
        const st = p2StateRef.current;
        if (!st) return;
        st.customers[cIdx].isOpen = true;
        st.customers[cIdx].openTimer = window.setTimeout(
          () => {
            const st2 = p2StateRef.current;
            if (!st2) return;
            st2.customers[cIdx].isOpen = false;
            // Closed for 0.8-1.8s, then open again
            scheduleOne(cIdx, 800 + Math.random() * 1000);
          },
          // Stay open 2.5-4 seconds
          2500 + Math.random() * 1500
        );
      }, delay);
      ids.push(id);
    }
    // Stagger initial open so not all close at same time
    for (let i = 0; i < NUM_CUSTOMERS; i++)
      scheduleOne(
        i,
        i % 2 === 0
          ? 2500 + Math.random() * 500
          : 400 + i * 200 + Math.random() * 300
      );
    s.openTimers = ids;
  }

  let lastTimestamp = 0;

  function runP2Loop() {
    const s = p2StateRef.current;
    if (!s) return;

    const step = (ts: number) => {
      const st = p2StateRef.current;
      if (!st) return;
      const dt = lastTimestamp ? Math.min((ts - lastTimestamp) / 16.67, 3) : 1;
      lastTimestamp = ts;

      // Countdown
      st.timeLeft -= dt * (1 / 60);
      const tl = Math.max(0, Math.ceil(st.timeLeft));
      setP2TimeLeft(tl);

      // Bob customers
      for (const c of st.customers) {
        c.phase += 0.025 * c.speed * dt;
        c.bobOffset = Math.sin(c.phase) * 5;
      }

      // Physics for in-flight slices
      for (const sl of st.slices) {
        if (sl.dragging || sl.landed) continue;
        sl.vy += GRAVITY * dt;
        sl.x += sl.vx * dt;
        sl.y += sl.vy * dt;
        sl.angle += sl.spin * dt;

        // Check mouth hits
        if (!sl.scored) {
          for (const c of st.customers) {
            if (!c.isOpen) continue;
            const mouthX = c.x * P2_W;
            const mouthY = 72 + c.bobOffset + 9; // mouth centre (top-of-canvas customers)
            const dist = Math.hypot(sl.x - mouthX, sl.y - mouthY);
            if (dist < MOUTH_R + SLICE_R * 0.5) {
              sl.scored = true;
              sl.landed = true;
              sl.vx = 0;
              sl.vy = 0;
              sl.x = mouthX;
              sl.y = mouthY;
              c.isOpen = false;
              // Score based on aim accuracy (dist from mouth center)
              const pts = Math.max(10, Math.round(100 - dist * 2));
              st.totalScore += pts;
              p2ScoreRef.current += pts;
              setP2Score((v) => v + pts);
              onScoreUpdate(st.totalScore);
              // Popup
              st.popups.push({
                id: st.popupId++,
                x: mouthX,
                y: mouthY - 30,
                text: `+${pts}`,
                color:
                  pts >= 80 ? '#22c55e' : pts >= 50 ? '#f59e0b' : '#ef4444',
                life: 1,
              });
            }
          }
        }

        // Fell off screen
        if (
          sl.y > P2_H + SLICE_R ||
          sl.x < -SLICE_R * 2 ||
          sl.x > P2_W + SLICE_R * 2
        ) {
          sl.landed = true;
        }
      }

      // Age popups
      st.popups = st.popups.filter((p) => {
        p.life -= 0.04 * dt;
        return p.life > 0;
      });

      drawP2(st);

      if (st.timeLeft <= 0 && !endedRef.current) {
        endedRef.current = true;
        setPhase('done');
        onGameOver(st.totalScore);
        stopP2();
        return;
      }

      st.rafId = requestAnimationFrame(step);
    };

    s.rafId = requestAnimationFrame(step);
  }

  function drawP2(s: NonNullable<typeof p2StateRef.current>) {
    const canvas = p2CanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, P2_W, P2_H);

    // ── Background: restaurant customer side (top) ──
    const wallGrad = ctx.createLinearGradient(0, 0, 0, COUNTER_Y - 16);
    wallGrad.addColorStop(0, '#1e1b4b');
    wallGrad.addColorStop(1, '#312e81');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, P2_W, COUNTER_Y - 16);

    // Subtle wall pattern
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let wx = 0; wx < P2_W; wx += 60) {
      ctx.beginPath();
      ctx.moveTo(wx, 0);
      ctx.lineTo(wx, COUNTER_Y - 16);
      ctx.stroke();
    }

    // ── Counter surface ──
    const ctrGrad = ctx.createLinearGradient(
      0,
      COUNTER_Y - 16,
      0,
      COUNTER_Y + 24
    );
    ctrGrad.addColorStop(0, '#d97706');
    ctrGrad.addColorStop(0.45, '#b45309');
    ctrGrad.addColorStop(1, '#78350f');
    ctx.fillStyle = ctrGrad;
    ctx.fillRect(0, COUNTER_Y - 16, P2_W, 40);
    // Highlight strip on top edge
    ctx.fillStyle = 'rgba(255,210,120,0.3)';
    ctx.fillRect(0, COUNTER_Y - 16, P2_W, 4);
    // Shadow under counter
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, COUNTER_Y + 24, P2_W, 10);

    // ── Background: kitchen / server side (bottom) ──
    const kitchenGrad = ctx.createLinearGradient(0, COUNTER_Y + 34, 0, P2_H);
    kitchenGrad.addColorStop(0, '#292524');
    kitchenGrad.addColorStop(1, '#1c1917');
    ctx.fillStyle = kitchenGrad;
    ctx.fillRect(0, COUNTER_Y + 34, P2_W, P2_H - COUNTER_Y - 34);

    // ── Customers (behind counter at the top) ──
    for (const c of s.customers) drawCustomer(ctx, c, c.bobOffset, P2_H);

    // ── Slices (on counter or in flight) ──
    for (const sl of s.slices) {
      if (sl.scored) continue;
      drawSlice(ctx, sl.x, sl.y, sl.angle, sl.colorIdx, sl.dragging ? 0.7 : 1);
    }

    // ── Trajectory arc preview while dragging ──
    if (s.dragId !== null) {
      const sl = s.slices.find((x) => x.id === s.dragId);
      if (sl) {
        // Estimate throw velocity from recent history
        let pvx = 0,
          pvy = 0;
        const hist = s.pointerHistory;
        if (hist.length >= 2) {
          const oldest = hist[0];
          const newest = hist[hist.length - 1];
          const dtMs = Math.max(8, newest.t - oldest.t);
          pvx = ((newest.x - oldest.x) / dtMs) * (1000 / 60);
          pvy = ((newest.y - oldest.y) / dtMs) * (1000 / 60);
        } else if (s.pickupX !== undefined) {
          const dx = sl.x - s.pickupX;
          const dy = sl.y - s.pickupY;
          const d = Math.hypot(dx, dy);
          if (d > 15) {
            pvx = (dx / d) * 12;
            pvy = (dy / d) * 12;
          }
        }
        // Clamp
        const ps = Math.hypot(pvx, pvy);
        if (ps > 22) {
          pvx = (pvx / ps) * 22;
          pvy = (pvy / ps) * 22;
        }
        // Draw dotted arc in direction of throw
        if (ps > 2) {
          ctx.save();
          for (let t = 3; t <= 28; t += 3) {
            const tx = sl.x + pvx * t;
            const ty = sl.y + pvy * t + 0.5 * GRAVITY * t * t;
            if (ty < -10 || tx < -20 || tx > P2_W + 20) break;
            ctx.globalAlpha = (1 - t / 32) * 0.85;
            ctx.fillStyle = '#fff9c4';
            ctx.beginPath();
            ctx.arc(tx, ty, 3.5 - t * 0.08, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }
    }

    // ── Score popups ──
    for (const p of s.popups) {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.font = 'bold 24px system-ui';
      ctx.fillStyle = p.color;
      ctx.textAlign = 'center';
      ctx.fillText(p.text, p.x, p.y - (1 - p.life) * 40);
      ctx.restore();
    }
  }

  // ── Phase 2 pointer handlers ──
  function p2Pos(e: React.PointerEvent<HTMLCanvasElement>): {
    x: number;
    y: number;
  } {
    const rect = p2CanvasRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * P2_W,
      y: ((e.clientY - rect.top) / rect.height) * P2_H,
    };
  }

  function onP2Down(e: React.PointerEvent<HTMLCanvasElement>) {
    const s = p2StateRef.current;
    if (!s || phaseRef.current !== 'throwing') return;
    const { x, y } = p2Pos(e);
    for (const sl of s.slices) {
      if (sl.scored || sl.dragging) continue;
      if (Math.hypot(sl.x - x, sl.y - y) < SLICE_R + 14) {
        sl.dragging = true;
        sl.vx = 0;
        sl.vy = 0;
        sl.landed = false; // lift off the counter
        s.dragId = sl.id;
        s.dragOffX = sl.x - x;
        s.dragOffY = sl.y - y;
        s.pickupX = sl.x;
        s.pickupY = sl.y;
        s.throwStart = { x, y, t: e.timeStamp };
        s.pointerHistory = [{ x, y, t: e.timeStamp }];
        p2CanvasRef.current?.setPointerCapture(e.pointerId);
        break;
      }
    }
  }

  function onP2Move(e: React.PointerEvent<HTMLCanvasElement>) {
    const s = p2StateRef.current;
    if (!s || s.dragId === null) return;
    const { x, y } = p2Pos(e);
    const sl = s.slices.find((x2) => x2.id === s.dragId);
    if (!sl) return;
    sl.x = x + s.dragOffX;
    sl.y = y + s.dragOffY;
    // Track recent pointer positions for flick velocity
    const now = e.timeStamp;
    s.pointerHistory.push({ x, y, t: now });
    // Keep only last 100ms
    while (s.pointerHistory.length > 0 && now - s.pointerHistory[0].t > 100) {
      s.pointerHistory.shift();
    }
  }

  function onP2Up(e: React.PointerEvent<HTMLCanvasElement>) {
    const s = p2StateRef.current;
    if (!s || s.dragId === null) return;
    // Update pointer history with the final position
    const { x: _rx, y: _ry } = p2Pos(e);
    void _rx;
    void _ry;
    const sl = s.slices.find((x2) => x2.id === s.dragId);
    if (sl) {
      sl.dragging = false;

      // ── Flick velocity from recent pointer movement ──
      // Use the last 100ms of pointer history to measure actual hand speed
      const hist = s.pointerHistory;
      let velX = 0,
        velY = 0;

      if (hist.length >= 2) {
        const oldest = hist[0];
        const newest = hist[hist.length - 1];
        const dtMs = Math.max(8, newest.t - oldest.t);
        // Convert: pixels-per-ms → pixels-per-frame at 60fps
        const msPerFrame = 1000 / 60;
        velX = ((newest.x - oldest.x) / dtMs) * msPerFrame;
        velY = ((newest.y - oldest.y) / dtMs) * msPerFrame;
      } else {
        // Single point or no history — use total displacement from pickup
        const dx = sl.x - s.pickupX;
        const dy = sl.y - s.pickupY;
        const d = Math.hypot(dx, dy);
        if (d > 15) {
          const baseSpeed = 12;
          velX = (dx / d) * baseSpeed;
          velY = (dy / d) * baseSpeed;
        }
      }

      // Clamp max speed
      const speed = Math.hypot(velX, velY);
      const MAX_SPEED = 22;
      if (speed > MAX_SPEED) {
        velX = (velX / speed) * MAX_SPEED;
        velY = (velY / speed) * MAX_SPEED;
      }

      // If nearly stationary release and barely moved from pickup → snap back
      if (Math.hypot(velX, velY) < 1.5) {
        const moved = Math.hypot(sl.x - s.pickupX, sl.y - s.pickupY);
        if (moved < 15) {
          sl.x = s.pickupX;
          sl.y = s.pickupY;
          sl.dragging = false;
          s.dragId = null;
          s.throwStart = null;
          s.pointerHistory = [];
          return;
        }
        // They dragged far but released slow — use drag direction at low speed
        const dx = sl.x - s.pickupX;
        const dy = sl.y - s.pickupY;
        const d = Math.hypot(dx, dy);
        velX = (dx / d) * 8;
        velY = (dy / d) * 8;
      }

      sl.vx = velX;
      sl.vy = velY;
      sl.spin = velX * 0.04;
    }
    s.dragId = null;
    s.throwStart = null;
    s.pointerHistory = [];
  }

  // ── JSX ──
  return (
    <div className={styles.game}>
      {phase === 'idle' && (
        <div className={styles.info}>
          <p className={styles.instruction}>Press Play to start!</p>
        </div>
      )}

      {(phase === 'cutting' || phase === 'throwing') && (
        <div className={styles.scores}>
          {cuts.map((c, i) => (
            <span key={i} className={styles.badge} data-grade={grade(c.score)}>
              Cut {i + 1}: {c.score}
            </span>
          ))}
        </div>
      )}

      {phase === 'cutting' && (
        <>
          <p className={styles.instruction}>
            Draw {TOTAL_CUTS} straight cuts through the centre
          </p>
          <canvas
            ref={p1CanvasRef}
            width={P1_SIZE}
            height={P1_SIZE}
            className={styles.canvas}
            onPointerDown={onP1Down}
            onPointerMove={onP1Move}
            onPointerUp={onP1Up}
          />
        </>
      )}

      {phase === 'throwing' && (
        <>
          <div className={styles.p2Header}>
            <span className={styles.p2Score}>🍕 {p2Score} pts</span>
            <span className={styles.timer}>⏱ {p2TimeLeft}s</span>
          </div>
          <p className={styles.instruction}>
            Drag &amp; throw slices into open mouths!
          </p>
          <canvas
            ref={p2CanvasRef}
            width={P2_W}
            height={P2_H}
            className={styles.p2Canvas}
            onPointerDown={onP2Down}
            onPointerMove={onP2Move}
            onPointerUp={onP2Up}
          />
        </>
      )}

      {phase === 'done' && (
        <div className={styles.info}>
          <p className={styles.instruction}>
            🎉 Done! Final score: {phase1Score + p2Score}
          </p>
        </div>
      )}
    </div>
  );
}
