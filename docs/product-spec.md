# Product Specification

## Overview

Arcade Ladder is a browser-based arcade platform. Players create an account, play simple skill-based games built with web UI (no canvas, no WebGL — just styled divs and JavaScript state), and compete on permanent per-game ladders. Rankings are earned, never purchased. The primary motivation loop is climbing from rank #500 → #100 → #10 → #1 in any given game.

---

## User Accounts

### Authentication

- Sign in via **Google OAuth** or **GitHub OAuth** only
- No email/password — no password reset flows, no email infrastructure
- On first sign-in, a user account is created automatically
- Username is auto-generated from OAuth display name, user can edit it once after account creation

### Avatars

- Default: profile picture pulled from Google or GitHub account
- Alternative: user can choose from 5 predefined abstract avatars (static SVG assets, consistent visual theme)
- User can switch between their OAuth avatar and a predefined avatar at any time from their profile

---

## Pages

### 1. Home / Hub (`/`)

The social proof and energy page. Goal: make the site feel active and alive.

**Ladder Podium**

- Top 3 players by combined total score across all games
- Card layout: #1 center (larger), #2 left, #3 right
- Each card: rank badge, avatar, username, total score
- Trophy icon on #1, medal colors for #2 and #3

**Site Stat Cards** (row of 4)

- Total Players
- Total Games Played (all score submissions ever)
- Games Available
- Active Now (users with a session in the last 15 minutes — approximate)

**Live Activity Feed**

- Scrollable vertical list of recent events
- Each entry: user avatar, username, event description, time ago
- Event types:
  - `[User] scored [score] in [Game]`
  - `[User] reached rank #[N] in [Game]`
  - `[User] beat their personal best in [Game]`
- Populated from recent score submissions (last 50), ordered by time descending
- Updates on page load / manual refresh

---

### 2. Games Gallery (`/games`)

**Header**

- Title: "Game Gallery"
- Subtitle: "Pick your challenge and climb the ranks"

**Game Grid**

- Responsive grid (3 columns desktop, 2 tablet, 1 mobile)
- Each game card contains:
  - Game thumbnail / emoji on colored background
  - Your rank badge (top-right corner): `#127` in a pill badge — hidden if not played
  - Game title
  - Total play count (e.g. `45.2K plays`)
  - Your rank label: `Your rank: #127` or `Not played` in muted style
  - Play Now button (navigates to `/games/:slug`)

---

### 3. Game / Play Page (`/games/:slug`)

The core experience. A fixed-size responsive game container with a live ladder sidebar.

**Layout**

- Left/center: game container (responsive square, max ~600px)
- Right sidebar: Top Players ladder (desktop only — collapses on mobile, accessible via tab)

**Game Container Header**

- Game title
- Current score (updates live during play)
- Combo / streak indicator if relevant to the game

**Game Container Footer**

- Progress bar (time remaining or level progress)
- Retry button after game over

**Right Sidebar — Top Players**

- Title: "Top Players" with trophy icon
- List of top 10 players for this game
  - Rank number (trophy emoji for #1, medal colors for #2–3, number for rest)
  - Avatar (small circle)
  - Username
  - Best score
- Highlighted row: current user's row, even if outside top 10
- "Next Rank" callout below list: `#4 LaserCat — 890 pts to go`

**Post-Game State**

- Overlay on game container showing: Your Score, Your Rank (updated), XP earned
- Buttons: Play Again, View Ladder, Back to Games

---

### 4. Ladder (`/ladder`)

Full ranking view per game. Gives the competitive depth that the game page sidebar can't show.

**Game Selector**

- Horizontal scrollable tabs or dropdown: one tab per game
- Defaults to first game (or most-played)

**Per-Game Ladder Table**

- Shows top 50 players for selected game
- Columns: Rank, Player (avatar + username), Best Score, # Plays, Percentile
- Rank column uses trophy for #1, gold/silver/bronze medals for #2–3, number for rest
- Current user's row highlighted if they appear in top 50
- If current user is outside top 50, show their row pinned at bottom with their actual rank

**Your Position Card** (if logged in, outside top 50)

- Card below table: "You are ranked #312 out of 4,820 players — top 6%"
- Points to next rank: "Beat LaserCat's score of 9,340 to reach #4"

---

### 5. Profile (`/profile/:username`)

Viewable by anyone. Own profile has edit controls.

**Header Card**

- Large avatar
- Username + edit button (own profile only)
- Member since date
- Badge: "Top 5% Overall" if applicable (top 5% by total score across all games)
- Stat row: Total XP | Games Played | Overall Rank

**Your Game Rankings** (table/list)

- Shows every game on the platform regardless of whether the user has played
- Columns: Rank, Game Name, # of Plays, Percentile, Progress bar (progress toward #1 score)
- Unplayed games show `—` for rank, progress bar empty, with "Not played" label
- Clicking a game row navigates to `/games/:slug`

**XP & Level**

- Level badge (e.g. "Level 12")
- XP progress bar to next level
- How XP is earned: tooltip or small explainer text

---

## Game Specification

Games are self-contained React components that communicate with the game host via a simple callback interface. This ensures any game can be dropped in and ranked consistently.

### Game Contract

Every game component receives these props:

```typescript
interface GameProps {
  onScoreUpdate: (score: number) => void; // called during play (updates header)
  onGameOver: (finalScore: number) => void; // called when game ends
  isPlaying: boolean; // controlled by host
}
```

The host (game page) handles:

- Starting/stopping the game
- Capturing the final score and submitting to the API
- Displaying the post-game overlay

### Score Submission Rules

- Score is submitted only on `onGameOver` — not during play
- A retry counts as a new score submission (total play count increments)
- Best score is what appears on ladders — all scores are stored but only `MAX(score)` is ranked
- Score must be a non-negative integer

### What makes a valid Arcade Ladder game

- Entirely UI-based: styled divs, CSS animations, JavaScript state — no canvas required
- Ends definitively (not infinite scroll)
- Produces a single numeric score
- Can be played in 1–5 minutes
- Skill-based: same starting conditions for all players (no randomness that can't be seeded fairly)

---

## Game Ideas (launch candidates)

All games below use only React state + CSS — no external game libraries needed.

| Game               | Core Mechanic                                                    | Score Basis                           |
| ------------------ | ---------------------------------------------------------------- | ------------------------------------- |
| **Typing Speed**   | Type displayed words/sentences as fast as possible               | WPM × accuracy multiplier             |
| **Reaction Grid**  | Click the highlighted tile before it moves — speed increases     | Tiles hit before first miss           |
| **Pattern Memory** | Watch a sequence, repeat it — sequences get longer (Simon-style) | Longest sequence completed            |
| **Quick Math**     | Answer arithmetic questions under a timer — harder = more points | Correct answers × difficulty weight   |
| **Color Sort**     | Drag items into correct color-coded bins — speed + accuracy      | Items sorted per second, minus errors |

These five are all implementable as pure React components with no external dependencies beyond the app's own UI library.

---

## Ranking & XP System

### Per-Game Rank

- A player's rank in a game = their position when all players are sorted by their personal best score (descending)
- Rank is always displayed as an integer: #1, #2, #127
- Rank updates immediately after score submission on the next page load

### Overall Rank

- Overall rank = player's position when all players are sorted by the sum of their personal best scores across all games
- Displayed on home page podium, profile header, and profile badge
- "Top X%" badge appears on profiles when overall rank places the user in the top 5% of all players

### XP & Levels

XP is cosmetic — no features are gated behind it.

| Action                                    | XP   |
| ----------------------------------------- | ---- |
| Play a game (first play per game per day) | +10  |
| Beat personal best                        | +25  |
| Enter top 100 in any game (first time)    | +50  |
| Enter top 10 in any game (first time)     | +100 |
| Reach #1 in any game                      | +250 |

Level thresholds follow a curve (0 → 100 → 250 → 500 → 1,000 → 2,500 → 5,000 → 10,000...). Levels are displayed as a number and a cosmetic label (e.g. "Level 7 · Veteran") — labels are optional flavor.

---

## Navigation

**Top navigation bar (always visible)**

- Left: Logo / site name "Arcade Ladder" — links to `/`
- Center links: Hub | Games | Ladder | Play (context-aware, highlights active page)
- Right: XP display (star icon + number) + avatar circle (links to own profile) — when logged in
- Right: Sign In button — when logged out

**Mobile:** hamburger menu collapses the center links. XP + avatar remain visible.

---

## Visual Design

Based on provided Figma mockups.

- **Primary background:** deep purple `#1a0a2e` to `#2d1b69` gradient
- **Card backgrounds:** dark semi-transparent `rgba(255,255,255,0.05)` to `rgba(255,255,255,0.1)`
- **Accent colors:** gold/amber (#f59e0b) for #1, silver (#9ca3af) for #2, bronze (#d97706) for #3
- **Interactive accent:** purple-to-cyan gradient for buttons and highlighted elements
- **Typography:** clean sans-serif, high contrast white on dark
- **Rank badges:** pill-shaped, dark background, colored text
- **Active nav item:** filled pill with gradient background

---

## Future Considerations (out of scope for v1)

- Achievements / badge system
- Dedicated "About" page with parallax scroll
- Custom profile picture upload (requires Cloud Storage)
- Redis caching for ladders at scale
- Weekly featured game or spotlight
- Social sharing (shareable profile card image)
- Admin dashboard for adding/toggling games
