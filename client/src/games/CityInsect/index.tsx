import { useEffect, useRef, useState, useCallback } from 'react';
import type { GameProps } from '../../types';
import styles from './CityInsect.module.scss';

// ── Constants ─────────────────────────────────────────────────────────────────
const W = 480;
const H = 480;
const GAME_DURATION = 60;

// Insect size levels (0 = tiny … 4 = giant)
// Speed stays nearly constant — only a tiny slow-down at the largest sizes
const LEVEL_DATA = [
  { r: 13, spd: 3.8, xpNeeded: 6, name: 'Tiny' },
  { r: 19, spd: 3.8, xpNeeded: 12, name: 'Small' },
  { r: 27, spd: 3.6, xpNeeded: 22, name: 'Medium' },
  { r: 37, spd: 3.4, xpNeeded: 35, name: 'Large' },
  { r: 52, spd: 3.2, xpNeeded: Infinity, name: 'Giant' },
] as const;

// Food items – level 1..5 (insect at index N can eat food.level ≤ N+1)
type FoodDef = {
  level: number;
  r: number;
  pts: number;
  color: string;
  emoji: string | null;
  walks: boolean;
};
const FOOD_DEFS: FoodDef[] = [
  { level: 1, r: 6, pts: 5, color: '#a07840', emoji: null, walks: false }, // crumb
  { level: 2, r: 11, pts: 20, color: '#f59e0b', emoji: '🍟', walks: false }, // fry
  { level: 3, r: 18, pts: 70, color: '#ef4444', emoji: '🍕', walks: false }, // slice
  { level: 4, r: 26, pts: 180, color: '#22c55e', emoji: '🌮', walks: false }, // meal
  { level: 5, r: 15, pts: 450, color: '#93c5fd', emoji: null, walks: true }, // human
];

interface Food {
  id: number;
  x: number;
  y: number;
  def: FoodDef;
  vx: number;
  vy: number;
  facing: number; // radians – used for human drawing
  eaten: boolean;
  flashTimer: number; // counts down after eating
}

// ── City background (cached) ──────────────────────────────────────────────────
let cityCache: HTMLCanvasElement | null = null;

function buildCityCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;

  // Asphalt base
  ctx.fillStyle = '#141419';
  ctx.fillRect(0, 0, W, H);

  // Two roads: vertical x=180-260, horizontal y=180-260
  const ROAD_COLOR = '#1c1c24';
  ctx.fillStyle = ROAD_COLOR;
  ctx.fillRect(180, 0, 80, H); // vertical road
  ctx.fillRect(0, 180, W, 80); // horizontal road

  // Dashed centre lines
  ctx.strokeStyle = 'rgba(245,158,11,0.22)';
  ctx.lineWidth = 2;
  ctx.setLineDash([14, 10]);
  ctx.beginPath();
  ctx.moveTo(220, 0);
  ctx.lineTo(220, H);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 220);
  ctx.lineTo(W, 220);
  ctx.stroke();
  ctx.setLineDash([]);

  // Four building blocks
  const blocks = [
    { x: 6, y: 6, w: 170, h: 170 },
    { x: 264, y: 6, w: 210, h: 170 },
    { x: 6, y: 264, w: 170, h: 210 },
    { x: 264, y: 264, w: 210, h: 210 },
  ];

  for (const b of blocks) {
    // Building body
    ctx.fillStyle = '#1c1c26';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    // Edge highlight
    ctx.strokeStyle = '#26263a';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(b.x + 0.75, b.y + 0.75, b.w - 1.5, b.h - 1.5);
    // Windows
    for (let wx = b.x + 12; wx < b.x + b.w - 18; wx += 22) {
      for (let wy = b.y + 12; wy < b.y + b.h - 18; wy += 22) {
        const lit = Math.random() > 0.35;
        ctx.fillStyle = lit
          ? 'rgba(255,230,120,0.18)'
          : 'rgba(255,255,255,0.04)';
        ctx.fillRect(wx, wy, 12, 12);
      }
    }
  }

  // Kerb lines
  ctx.strokeStyle = '#2a2a38';
  ctx.lineWidth = 2;
  [
    [180, 0, 180, H],
    [260, 0, 260, H],
    [0, 180, W, 180],
    [0, 260, W, 260],
  ].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });

  return c;
}

// ── Drawing helpers ───────────────────────────────────────────────────────────

function drawInsect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  angle: number,
  level: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const BODY_COLORS = ['#3d3020', '#2d3820', '#1e2e3a', '#302038', '#1a3828'];
  const body = BODY_COLORS[level] ?? BODY_COLORS[0];
  const legCol = '#0e0e08';
  const legW = Math.max(1.5, r * 0.055);

  // Legs – 3 per side
  ctx.strokeStyle = legCol;
  ctx.lineWidth = legW;
  for (let i = -1; i <= 1; i++) {
    const ly = i * r * 0.32;
    for (const s of [-1, 1] as const) {
      ctx.beginPath();
      ctx.moveTo(s * r * 0.28, ly);
      ctx.lineTo(s * r * 0.68, ly - r * 0.16);
      ctx.lineTo(s * (r + r * 0.36), ly + r * 0.12);
      ctx.stroke();
    }
  }

  // Abdomen
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.22, r * 0.5, r * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();

  // Thorax
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.3, r * 0.44, r * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sheen
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.1, -r * 0.35, r * 0.18, r * 0.28, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.78, r * 0.32, r * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  const eyeR = Math.max(2, r * 0.07);
  ctx.fillStyle = '#ff2222';
  ctx.beginPath();
  ctx.arc(-r * 0.13, -r * 0.82, eyeR, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.13, -r * 0.82, eyeR, 0, Math.PI * 2);
  ctx.fill();

  // Antennae
  ctx.strokeStyle = legCol;
  ctx.lineWidth = Math.max(1, r * 0.038);
  for (const s of [-1, 1] as const) {
    ctx.beginPath();
    ctx.moveTo(s * r * 0.1, -r * 0.96);
    ctx.quadraticCurveTo(s * r * 0.45, -r * 1.32, s * r * 0.78, -r * 1.52);
    ctx.stroke();
  }

  ctx.restore();
}

function drawHuman(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  facing: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(facing);

  const s = r; // scale unit
  const t = Date.now() * 0.006;
  const swing = Math.sin(t) * s * 0.35;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(0, s * 1.5, s * 0.7, s * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.fillStyle = '#1e3a5f';
  ctx.fillRect(-s * 0.28, s * 0.82, s * 0.24, s * 0.72 + swing);
  ctx.fillRect(s * 0.04, s * 0.82, s * 0.24, s * 0.72 - swing);

  // Torso
  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(-s * 0.4, -s * 0.18, s * 0.8, s * 1.0);

  // Arms
  ctx.strokeStyle = '#fbbf7a';
  ctx.lineWidth = s * 0.14;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-s * 0.38, s * 0.1);
  ctx.lineTo(-s * 0.78, s * 0.5 + swing);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(s * 0.38, s * 0.1);
  ctx.lineTo(s * 0.78, s * 0.5 - swing);
  ctx.stroke();

  // Head
  ctx.fillStyle = '#fbbf7a';
  ctx.beginPath();
  ctx.arc(0, -s * 0.6, s * 0.36, 0, Math.PI * 2);
  ctx.fill();

  // Hair
  ctx.fillStyle = '#7c5c2a';
  ctx.beginPath();
  ctx.arc(0, -s * 0.68, s * 0.34, Math.PI, 0, false);
  ctx.fill();

  ctx.restore();
}

// ── Game state (lives in a ref, never triggers re-render) ─────────────────────
interface GameState {
  x: number;
  y: number;
  angle: number;
  level: number;
  xp: number;
  score: number;
  timeLeft: number;
  foods: Food[];
  idCtr: number;
  keys: Record<'w' | 'a' | 's' | 'd', boolean>;
  running: boolean;
  raf: number;
  timerInterval: ReturnType<typeof setInterval> | null;
  spawnTimeout: ReturnType<typeof setTimeout> | null;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CityInsect({
  isPlaying,
  onScoreUpdate,
  onGameOver,
}: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stRef = useRef<GameState>({
    x: W / 2,
    y: H / 2,
    angle: -Math.PI / 2,
    level: 0,
    xp: 0,
    score: 0,
    timeLeft: GAME_DURATION,
    foods: [],
    idCtr: 0,
    keys: { w: false, a: false, s: false, d: false },
    running: false,
    raf: 0,
    timerInterval: null,
    spawnTimeout: null,
  });

  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [levelName, setLevelName] = useState('Tiny');
  const [xpPct, setXpPct] = useState(0);

  const onGameOverRef = useRef(onGameOver);
  const onScoreUpdateRef = useRef(onScoreUpdate);
  onGameOverRef.current = onGameOver;
  onScoreUpdateRef.current = onScoreUpdate;

  // ── Spawn one food item, then schedule the next ──────────────────────────
  const spawnFood = useCallback(() => {
    const st = stRef.current;
    if (!st.running) return;

    // Weight each food type; unlock higher tiers as player grows
    const weights = [60, 35, 20, 12, 0];
    const maxLevel = Math.min(5, st.level + 2);
    for (let i = 0; i < weights.length; i++) {
      if (i + 1 > maxLevel) weights[i] = 0;
    }
    // Humans spawn from level 2 onward — they're dangerous!
    if (st.level >= 2) weights[4] = 8;

    const total = weights.reduce((a, b) => a + b, 0);
    if (total === 0) {
      st.spawnTimeout = setTimeout(spawnFood, 2000);
      return;
    }

    let rnd = Math.random() * total;
    let idx = 0;
    for (let i = 0; i < weights.length; i++) {
      rnd -= weights[i];
      if (rnd <= 0) {
        idx = i;
        break;
      }
    }
    const def = FOOD_DEFS[idx];

    let x: number,
      y: number,
      vx = 0,
      vy = 0,
      facing = 0;
    if (def.walks) {
      // Humans walk in from a random edge
      const spd = 0.8 + Math.random() * 0.65;
      const side = Math.floor(Math.random() * 4);
      if (side === 0) {
        x = Math.random() * W;
        y = -def.r;
        vx = (Math.random() - 0.5) * spd * 0.6;
        vy = spd;
      } else if (side === 1) {
        x = W + def.r;
        y = Math.random() * H;
        vx = -spd;
        vy = (Math.random() - 0.5) * spd * 0.6;
      } else if (side === 2) {
        x = Math.random() * W;
        y = H + def.r;
        vx = (Math.random() - 0.5) * spd * 0.6;
        vy = -spd;
      } else {
        x = -def.r;
        y = Math.random() * H;
        vx = spd;
        vy = (Math.random() - 0.5) * spd * 0.6;
      }
      facing = Math.atan2(vy, vx) + Math.PI / 2;
    } else {
      // Static scraps scattered on the map
      x = def.r + Math.random() * (W - def.r * 2);
      y = def.r + Math.random() * (H - def.r * 2);
    }

    st.foods.push({
      id: st.idCtr++,
      x,
      y,
      def,
      vx,
      vy,
      facing,
      eaten: false,
      flashTimer: 0,
    });

    st.spawnTimeout = setTimeout(spawnFood, 750 + Math.random() * 900);
  }, []);

  // ── Global key listeners ─────────────────────────────────────────────────
  useEffect(() => {
    const st = stRef.current;
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase() as 'w' | 'a' | 's' | 'd';
      if (k in st.keys) {
        st.keys[k] = true;
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase() as 'w' | 'a' | 's' | 'd';
      if (k in st.keys) st.keys[k] = false;
    };
    document.addEventListener('keydown', down);
    document.addEventListener('keyup', up);
    return () => {
      document.removeEventListener('keydown', down);
      document.removeEventListener('keyup', up);
    };
  }, []);

  // ── Main game effect ─────────────────────────────────────────────────────
  useEffect(() => {
    const st = stRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    // ── Stop ──────────────────────────────────────────────────────────────
    if (!isPlaying) {
      st.running = false;
      cancelAnimationFrame(st.raf);
      if (st.timerInterval) {
        clearInterval(st.timerInterval);
        st.timerInterval = null;
      }
      if (st.spawnTimeout) {
        clearTimeout(st.spawnTimeout);
        st.spawnTimeout = null;
      }

      // Draw idle overlay
      const city = cityCache ?? buildCityCanvas();
      ctx.drawImage(city, 0, 0);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('WASD to move · eat food to grow', W / 2, H / 2);
      return;
    }

    // ── Start ─────────────────────────────────────────────────────────────
    cityCache = null; // re-randomise windows each game
    st.x = W / 2;
    st.y = H / 2;
    st.angle = -Math.PI / 2;
    st.level = 0;
    st.xp = 0;
    st.score = 0;
    st.timeLeft = GAME_DURATION;
    st.foods = [];
    st.idCtr = 0;
    st.running = true;
    setTimeLeft(GAME_DURATION);
    setScore(0);
    setLevelName('Tiny');
    setXpPct(0);

    // Initial litter
    const scatter = (defIdx: number, count: number) => {
      const def = FOOD_DEFS[defIdx];
      for (let i = 0; i < count; i++) {
        st.foods.push({
          id: st.idCtr++,
          x: def.r + Math.random() * (W - def.r * 2),
          y: def.r + Math.random() * (H - def.r * 2),
          def,
          vx: 0,
          vy: 0,
          facing: 0,
          eaten: false,
          flashTimer: 0,
        });
      }
    };
    scatter(0, 18); // crumbs
    scatter(1, 6); // fries

    // Timer
    st.timerInterval = setInterval(() => {
      st.timeLeft = Math.max(0, st.timeLeft - 1);
      setTimeLeft(st.timeLeft);
      if (st.timeLeft <= 0) {
        st.running = false;
        clearInterval(st.timerInterval!);
        st.timerInterval = null;
        if (st.spawnTimeout) {
          clearTimeout(st.spawnTimeout);
          st.spawnTimeout = null;
        }
        cancelAnimationFrame(st.raf);
        onGameOverRef.current(st.score);
      }
    }, 1000);

    // Start spawning
    if (st.spawnTimeout) clearTimeout(st.spawnTimeout);
    st.spawnTimeout = setTimeout(spawnFood, 1200);

    // Build city once (captures random windows for this session)
    const cityImg = buildCityCanvas();
    cityCache = cityImg;

    // ── Game loop ─────────────────────────────────────────────────────────
    let lastT = performance.now();

    const loop = (t: number) => {
      if (!st.running) return;
      const dt = Math.min((t - lastT) / 16.67, 3);
      lastT = t;

      const lv = LEVEL_DATA[st.level];

      // Movement
      let mdx = 0,
        mdy = 0;
      if (st.keys.w) mdy -= 1;
      if (st.keys.s) mdy += 1;
      if (st.keys.a) mdx -= 1;
      if (st.keys.d) mdx += 1;

      if (mdx !== 0 || mdy !== 0) {
        const mag = Math.sqrt(mdx * mdx + mdy * mdy);
        const spd = lv.spd * dt;
        st.x = Math.max(lv.r, Math.min(W - lv.r, st.x + (mdx / mag) * spd));
        st.y = Math.max(lv.r, Math.min(H - lv.r, st.y + (mdy / mag) * spd));

        // Smooth rotation to face movement direction
        const target = Math.atan2(mdy, mdx) + Math.PI / 2;
        let da = target - st.angle;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        st.angle += da * 0.2 * dt;
      }

      // Update food
      for (const f of st.foods) {
        if (f.eaten) {
          f.flashTimer = Math.max(0, f.flashTimer - dt);
          continue;
        }

        // Humans wander
        if (f.def.walks) {
          if (Math.random() < 0.01 * dt) {
            const ang = Math.random() * Math.PI * 2;
            const spd = 0.9 + Math.random() * 0.7;
            f.vx = Math.cos(ang) * spd;
            f.vy = Math.sin(ang) * spd;
          }
          f.x += f.vx * dt;
          f.y += f.vy * dt;
          if (f.x < f.def.r) {
            f.x = f.def.r;
            f.vx = Math.abs(f.vx);
          }
          if (f.x > W - f.def.r) {
            f.x = W - f.def.r;
            f.vx = -Math.abs(f.vx);
          }
          if (f.y < f.def.r) {
            f.y = f.def.r;
            f.vy = Math.abs(f.vy);
          }
          if (f.y > H - f.def.r) {
            f.y = H - f.def.r;
            f.vy = -Math.abs(f.vy);
          }
          if (f.vx !== 0 || f.vy !== 0)
            f.facing = Math.atan2(f.vy, f.vx) + Math.PI / 2;
        }

        // Collision check
        const dx = st.x - f.x,
          dy = st.y - f.y;
        const distSq = dx * dx + dy * dy;
        const hitR = lv.r * 0.85 + f.def.r * 0.75;

        if (distSq >= hitR * hitR) continue;

        // Human collision: DEADLY unless player is Giant (level 4)
        if (f.def.walks && st.level < 4) {
          st.running = false;
          clearInterval(st.timerInterval!);
          st.timerInterval = null;
          if (st.spawnTimeout) {
            clearTimeout(st.spawnTimeout);
            st.spawnTimeout = null;
          }
          cancelAnimationFrame(st.raf);
          onGameOverRef.current(st.score);
          return;
        }

        // Can only eat food at or below insect level
        if (f.def.level > st.level + 1) continue;

        f.eaten = true;
        f.flashTimer = 22;
        st.score += f.def.pts;
        st.xp += f.def.level; // higher food = more XP
        setScore(st.score);
        onScoreUpdateRef.current(st.score);

        if (
          st.level < LEVEL_DATA.length - 1 &&
          st.xp >= LEVEL_DATA[st.level].xpNeeded
        ) {
          st.level++;
          st.xp = 0;
          setLevelName(LEVEL_DATA[st.level].name);
        }
        setXpPct(
          st.level < LEVEL_DATA.length - 1
            ? st.xp / LEVEL_DATA[st.level].xpNeeded
            : 1
        );
      } // end foods loop
      st.foods = st.foods.filter((f) => !f.eaten || f.flashTimer > 0);

      // ── Render ────────────────────────────────────────────────────────
      ctx.drawImage(cityImg, 0, 0);

      // Food
      for (const f of st.foods) {
        ctx.save();

        // Eaten flash: expanding yellow burst
        if (f.eaten) {
          const a = f.flashTimer / 22;
          ctx.globalAlpha = a;
          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.def.r * (1 + (1 - a) * 1.2), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          continue;
        }

        // Dim food the insect can't yet eat
        if (f.def.level > st.level + 1) ctx.globalAlpha = 0.38;

        if (f.def.walks) {
          drawHuman(ctx, f.x, f.y, f.def.r, f.facing);
        } else if (f.def.emoji) {
          ctx.font = `${Math.round(f.def.r * 2.1)}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(f.def.emoji, f.x, f.y);
        } else {
          // Crumb
          ctx.fillStyle = f.def.color;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.def.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.18)';
          ctx.beginPath();
          ctx.arc(
            f.x - f.def.r * 0.28,
            f.y - f.def.r * 0.28,
            f.def.r * 0.38,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }

        ctx.restore();
      }

      // Insect
      drawInsect(ctx, st.x, st.y, lv.r, st.angle, st.level);

      st.raf = requestAnimationFrame(loop);
    };

    st.raf = requestAnimationFrame(loop);

    return () => {
      st.running = false;
      cancelAnimationFrame(st.raf);
      if (st.timerInterval) {
        clearInterval(st.timerInterval);
        st.timerInterval = null;
      }
      if (st.spawnTimeout) {
        clearTimeout(st.spawnTimeout);
        st.spawnTimeout = null;
      }
    };
  }, [isPlaying, spawnFood]);

  return (
    <div className={styles.game}>
      <div className={styles.hud}>
        <span
          className={`${styles.timerBadge} ${timeLeft <= 10 ? styles.urgent : ''}`}
        >
          {timeLeft}s
        </span>
        <span className={styles.lvlBadge}>{levelName} Insect</span>
        <span className={styles.scoreBadge}>{score.toLocaleString()}</span>
      </div>
      <div className={styles.xpBar}>
        <div
          className={styles.xpFill}
          style={{ width: `${Math.round(xpPct * 100)}%` }}
        />
      </div>
      <canvas ref={canvasRef} width={W} height={H} className={styles.canvas} />
      <p className={styles.hint}>
        WASD to move · eat food to grow · avoid humans until you're Giant!
      </p>
    </div>
  );
}
