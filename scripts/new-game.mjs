#!/usr/bin/env node
/**
 * Usage (from repo root):
 *   node scripts/new-game.mjs <slug> "<Title>" "<emoji>"
 *
 * Example:
 *   node scripts/new-game.mjs word-scramble "Word Scramble" "🔤"
 *
 * What it does:
 *   1. Creates client/src/games/<ComponentName>/index.tsx  (stub component)
 *   2. Creates client/src/games/<ComponentName>/<ComponentName>.module.scss
 *   3. Adds the game row to server/src/db/migrations/sync-games.sql
 *   4. Registers the lazy import in client/src/pages/Game/index.tsx
 *   5. Adds a gradient entry to client/src/pages/Games/index.tsx
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ── Args ──────────────────────────────────────────────────────────────────────

const [slug, title, emoji = '🎮'] = process.argv.slice(2);

if (!slug || !title) {
  console.error('Usage: node scripts/new-game.mjs <slug> "<Title>" "<emoji>"');
  process.exit(1);
}

// slug → PascalCase component name  e.g. word-scramble → WordScramble
const componentName = slug
  .split('-')
  .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
  .join('');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ── 1 & 2 — Game component + SCSS ────────────────────────────────────────────

const gameDir = path.join(root, 'client', 'src', 'games', componentName);

if (fs.existsSync(gameDir)) {
  console.error(`❌  ${gameDir} already exists. Aborting.`);
  process.exit(1);
}

fs.mkdirSync(gameDir, { recursive: true });

fs.writeFileSync(
  path.join(gameDir, 'index.tsx'),
  `import { useEffect } from 'react';
import type { GameProps } from '../../types';
import styles from './${componentName}.module.scss';

export default function ${componentName}({ isPlaying, onScoreUpdate, onGameOver }: GameProps) {
  // TODO: implement game logic

  useEffect(() => {
    if (!isPlaying) return;
    // Stub: replace with real game loop
    let score = 0;
    const tick = setInterval(() => {
      score += Math.floor(Math.random() * 20) + 5;
      onScoreUpdate(score);
    }, 500);
    const end = setTimeout(() => {
      clearInterval(tick);
      onGameOver(score);
    }, 30_000);
    return () => { clearInterval(tick); clearTimeout(end); };
  }, [isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={styles.game}>
      <p className={styles.placeholder}>${emoji} ${title} — coming soon</p>
    </div>
  );
}
`
);

fs.writeFileSync(
  path.join(gameDir, `${componentName}.module.scss`),
  `.game {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 480px;
  gap: 1rem;
}

.placeholder {
  font-size: 1.25rem;
  color: rgba(255, 255, 255, 0.5);
}
`
);

console.log(`✅  Created client/src/games/${componentName}/`);

// ── Helper: patch a file by replacing one string ──────────────────────────────

function patch(filePath, searchStr, replacement, label) {
  const rel = path.relative(root, filePath);
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes(searchStr)) {
    console.error(`❌  Could not find anchor in ${rel} — skipping "${label}"`);
    return;
  }
  fs.writeFileSync(filePath, content.replace(searchStr, replacement));
  console.log(`✅  Patched ${rel} — ${label}`);
}

// ── 3 — SQL migration ─────────────────────────────────────────────────────────

const sqlFile = path.join(
  root,
  'server',
  'src',
  'db',
  'migrations',
  'sync-games.sql'
);
const sqlAnchor = `('snake-escape',`;
const safeTitle = title.replace(/'/g, "''");
const description = `${title} — coming soon.`;
const sqlLine = `('${slug}',   '${title}',   '${description}',   '${emoji}'),\n  ${sqlAnchor}`;

patch(sqlFile, sqlAnchor, sqlLine, `add game row for ${slug}`);

// ── 4 — Game/index.tsx GAME_COMPONENTS ───────────────────────────────────────

const gamePageFile = path.join(
  root,
  'client',
  'src',
  'pages',
  'Game',
  'index.tsx'
);
const gamePageAnchor = `'snake-escape': lazy(() => import('../../games/SnakeEscape')),`;
const gamePageReplacement = `'${slug}': lazy(() => import('../../games/${componentName}')),\n  ${gamePageAnchor}`;

patch(
  gamePageFile,
  gamePageAnchor,
  gamePageReplacement,
  `register ${componentName} in GAME_COMPONENTS`
);

// ── 5 — Games/index.tsx GAME_GRADIENTS ───────────────────────────────────────

const gamesPageFile = path.join(
  root,
  'client',
  'src',
  'pages',
  'Games',
  'index.tsx'
);
const gradientsAnchor = `'snake-escape': ['#15803d', '#166534'],`;
const gradientsReplacement = `'${slug}': ['#7c3aed', '#06b6d4'],\n  ${gradientsAnchor}`;

patch(
  gamesPageFile,
  gradientsAnchor,
  gradientsReplacement,
  `add gradient for ${slug}`
);

// ── Done ──────────────────────────────────────────────────────────────────────

console.log(`
Done! Next steps:
  1. Edit client/src/games/${componentName}/index.tsx  — build the game
  2. Edit the SQL row in sync-games.sql if you want a better description
  3. Change the gradient for '${slug}' in Games/index.tsx
  4. Sync games to your local DB (keeps users & scores):
       npm run db:sync-games
`);
