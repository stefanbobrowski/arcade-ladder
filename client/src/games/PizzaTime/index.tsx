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
// PHASE 2 — DRAG & DROP THE SLICES
// ─────────────────────────────────────────────────────────────────────────────

const P2_W = 500;
const P2_H = 420;
const COUNTER_Y = 295;
const SLICE_R = 28;
const MOUTH_R = 24;
const NUM_CUSTOMERS = 8;

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
  x: number;
  bobOffset: number;
  phase: number;
  speed: number;
  isOpen: boolean;
  fed: boolean; // has eaten — will exit scene
  exitX: number; // x drift for exit animation (pixels per frame)
}

interface P2Slice {
  id: number;
  colorIdx: number;
  x: number;
  y: number;
  angle: number;
  dragging: boolean;
  done: boolean; // scored OR fell to floor
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
    fed: false,
    exitX: 0,
  }));
}

function buildSlices(count: number): P2Slice[] {
  const spacing = (P2_W - 120) / Math.max(1, count - 1);
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    colorIdx: i % SLICE_COLORS.length,
    x: 60 + i * spacing,
    y: COUNTER_Y - SLICE_R + 4,
    angle: -Math.PI / 2 + (i / count - 0.5) * 0.9,
    dragging: false,
    done: false,
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
  if (c.fed && Math.abs(c.exitX) > P2_W) return; // fully off screen
  const x = c.x * P2_W + c.exitX;
  const headY = 72 + bobY;

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
    totalScore: number;
    popups: FeedbackPopup[];
    popupId: number;
    openTimers: number[];
    rafId: number | null;
  } | null>(null);

  const p2ScoreRef = useRef(0);
  const endedRef = useRef(false);
  const [p2Score, setP2Score] = useState(0);
  const [phase1Score, setPhase1Score] = useState(0);

  // ── Reset everything ──
  const resetGame = useCallback(() => {
    setCuts([]);
    setPhase('cutting');
    p2ScoreRef.current = 0;
    setP2Score(0);
    setPhase1Score(0);
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
    const slices = buildSlices(NUM_CUSTOMERS);
    const customers = buildCustomers(NUM_CUSTOMERS);
    p2StateRef.current = {
      slices,
      customers,
      dragId: null,
      dragOffX: 0,
      dragOffY: 0,
      totalScore: p1Total,
      popups: [],
      popupId: 0,
      openTimers: [],
      rafId: null,
    };
    p2ScoreRef.current = 0;
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

  function scheduleCustomerOpens() {
    const s = p2StateRef.current;
    if (!s) return;
    const ids: number[] = [];

    function scheduleOne(cIdx: number, delay: number) {
      const id = window.setTimeout(() => {
        const st = p2StateRef.current;
        if (!st || st.customers[cIdx].fed) return;
        st.customers[cIdx].isOpen = true;
        window.setTimeout(
          () => {
            const st2 = p2StateRef.current;
            if (!st2 || st2.customers[cIdx].fed) return;
            st2.customers[cIdx].isOpen = false;
            scheduleOne(cIdx, 800 + Math.random() * 1000);
          },
          2500 + Math.random() * 1500
        );
      }, delay);
      ids.push(id);
    }

    for (let i = 0; i < NUM_CUSTOMERS; i++) {
      scheduleOne(i, i * 180 + Math.random() * 250);
    }
    s.openTimers = ids;
  }

  function runP2Loop() {
    const s = p2StateRef.current;
    if (!s) return;

    const step = () => {
      const st = p2StateRef.current;
      if (!st) return;

      // Bob customers, advance exit animations
      for (const c of st.customers) {
        c.phase += 0.025 * c.speed;
        c.bobOffset = Math.sin(c.phase) * 5;
        if (c.fed) {
          // exitX is set to +/-0.001 as direction sentinel, then accumulates
          const dir = c.exitX >= 0 ? 1 : -1;
          c.exitX += dir * 8;
        }
      }

      // Age popups
      st.popups = st.popups.filter((p) => {
        p.life -= 0.04;
        return p.life > 0;
      });

      drawP2(st);

      // End when all slices are done
      if (!endedRef.current && st.slices.every((sl) => sl.done)) {
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

    // Background: customer side
    const wallGrad = ctx.createLinearGradient(0, 0, 0, COUNTER_Y - 16);
    wallGrad.addColorStop(0, '#1e1b4b');
    wallGrad.addColorStop(1, '#312e81');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, P2_W, COUNTER_Y - 16);
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let wx = 0; wx < P2_W; wx += 60) {
      ctx.beginPath();
      ctx.moveTo(wx, 0);
      ctx.lineTo(wx, COUNTER_Y - 16);
      ctx.stroke();
    }

    // Counter surface
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
    ctx.fillStyle = 'rgba(255,210,120,0.3)';
    ctx.fillRect(0, COUNTER_Y - 16, P2_W, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, COUNTER_Y + 24, P2_W, 10);

    // Kitchen background
    const kitchenGrad = ctx.createLinearGradient(0, COUNTER_Y + 34, 0, P2_H);
    kitchenGrad.addColorStop(0, '#292524');
    kitchenGrad.addColorStop(1, '#1c1917');
    ctx.fillStyle = kitchenGrad;
    ctx.fillRect(0, COUNTER_Y + 34, P2_W, P2_H - COUNTER_Y - 34);

    // Customers
    for (const c of s.customers) drawCustomer(ctx, c, c.bobOffset, P2_H);

    // Slices on counter (not done, not dragging)
    for (const sl of s.slices) {
      if (sl.done || sl.dragging) continue;
      drawSlice(ctx, sl.x, sl.y, sl.angle, sl.colorIdx, 1);
    }

    // Dragged slice on top
    if (s.dragId !== null) {
      const sl = s.slices.find((x) => x.id === s.dragId);
      if (sl) drawSlice(ctx, sl.x, sl.y, sl.angle, sl.colorIdx, 0.85);
    }

    // Popups
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

  // ── Phase 2 pointer handlers (drag & drop) ──
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
      if (sl.done || sl.dragging) continue;
      if (Math.hypot(sl.x - x, sl.y - y) < SLICE_R + 14) {
        sl.dragging = true;
        s.dragId = sl.id;
        s.dragOffX = sl.x - x;
        s.dragOffY = sl.y - y;
        p2CanvasRef.current?.setPointerCapture(e.pointerId);
        break;
      }
    }
  }

  function onP2Move(e: React.PointerEvent<HTMLCanvasElement>) {
    const s = p2StateRef.current;
    if (!s || s.dragId === null) return;
    const { x, y } = p2Pos(e);
    const sl = s.slices.find((s2) => s2.id === s.dragId);
    if (!sl) return;
    sl.x = x + s.dragOffX;
    sl.y = y + s.dragOffY;
  }

  function onP2Up(_e: React.PointerEvent<HTMLCanvasElement>) {
    const s = p2StateRef.current;
    if (!s || s.dragId === null) return;
    const sl = s.slices.find((s2) => s2.id === s.dragId);
    if (sl) {
      sl.dragging = false;
      // Check if dropped into an open mouth
      let fed = false;
      for (const c of s.customers) {
        if (!c.isOpen || c.fed) continue;
        const mouthX = c.x * P2_W + c.exitX;
        const mouthY = 72 + c.bobOffset + 9;
        const dist = Math.hypot(sl.x - mouthX, sl.y - mouthY);
        if (dist < MOUTH_R + SLICE_R) {
          // Success!
          sl.done = true;
          sl.scored = true;
          c.fed = true;
          c.isOpen = false;
          // Exit direction: left half exits left, right half exits right
          c.exitX = c.x < 0.5 ? 0 : 0; // will accumulate in RAF loop
          // pick exit direction based on position
          const exitDir = c.x * P2_W < P2_W / 2 ? -1 : 1;
          // store as a tiny hack: set exitX to a sentinel
          c.exitX = exitDir * 0.001; // RAF loop checks sign

          const pts = Math.max(20, Math.round(120 - dist * 2));
          s.totalScore += pts;
          p2ScoreRef.current += pts;
          setP2Score((v) => v + pts);
          onScoreUpdate(s.totalScore);
          s.popups.push({
            id: s.popupId++,
            x: mouthX,
            y: mouthY - 30,
            text: `+${pts} 😋`,
            color: '#22c55e',
            life: 1,
          });
          fed = true;
          break;
        }
      }
      if (!fed) {
        // Slice dropped on floor — count it as done
        sl.done = true;
        s.popups.push({
          id: s.popupId++,
          x: sl.x,
          y: sl.y - 20,
          text: '💨 floor',
          color: '#ef4444',
          life: 1,
        });
      }
    }
    s.dragId = null;
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
            <span className={styles.slicesLeft}>
              {p2StateRef.current
                ? `${p2StateRef.current.slices.filter((s) => !s.done).length} slices left`
                : ''}
            </span>
          </div>
          <p className={styles.instruction}>
            Drag slices onto open mouths — all 8 must be served or dropped!
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
