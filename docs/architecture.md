# Architecture & Technical Design

## Stack Decisions

### Frontend — Vite + React + TypeScript

Not Next.js. This is a fully authenticated, interactive SPA — there is no SEO benefit from SSR because game pages are behind a login and nobody is Googling individual leaderboard entries. Next.js would add build complexity, server component overhead, and routing constraints with zero upside. Vite gives a faster dev loop, simpler config, and a clean static output that deploys perfectly to Firebase Hosting.

### Backend — Node.js + Fastify

Fastify over Express for three reasons:

1. **JSON schema validation is built into every route.** Invalid request bodies are rejected before your handler runs. Response schemas strip undeclared fields automatically (security + performance).
2. **Plugin scoping.** Decorators and hooks registered inside a plugin don't leak into unrelated routes. Eliminates entire categories of Express middleware bugs.
3. **2–3x faster JSON serialization** via ahead-of-time schema compilation (ajv). Matters for leaderboard endpoints returning arrays of player objects.

### Database — Cloud SQL (PostgreSQL)

Leaderboard queries are simple `SELECT MAX(score) GROUP BY user_id ORDER BY score DESC` queries. PostgreSQL handles this at this scale with no special infrastructure. No Redis needed for MVP — add it later if query times degrade with large player counts. Cloud SQL gives managed backups, easy connection pooling via Cloud SQL Proxy, and first-class Cloud Run integration.

### Frontend Hosting — Firebase Hosting

Better than serving the React app from Cloud Run. Firebase Hosting puts static assets on Google's global CDN, has a free tier that covers normal traffic, and deploys in one command (`firebase deploy`). Cloud Run is for compute, not file serving.

### Auth — Google OAuth + GitHub OAuth (no email/password)

Email authentication is skipped intentionally. Users of an arcade ranking site universally have Google or GitHub accounts. Adding email requires a transactional email service (Resend, SendGrid, etc.) plus credential storage and password reset flows — real operational overhead for near-zero gain. After the OAuth handshake, the backend issues its own short-lived JWT for API sessions. The app owns the user record; Google/GitHub only handles identity verification.

### Real-time — Polling (no WebSockets)

Leaderboards update when the user loads or refreshes the page. This is sufficient for a permanent ranked leaderboard model with no live competitions. No WebSocket server, no persistent connections, significantly simpler infrastructure.

---

## Infrastructure

```
┌─────────────────────────────────────────────────────────────┐
│                        GCP Project                          │
│                                                             │
│  ┌───────────────┐     ┌──────────────────────────────┐    │
│  │ Cloud Build   │────▶│ Artifact Registry            │    │
│  │ (GitHub push  │     │ (Docker images)              │    │
│  │  trigger)     │     └──────────────┬───────────────┘    │
│  └───────────────┘                    │                     │
│                                       ▼                     │
│  ┌───────────────┐     ┌──────────────────────────────┐    │
│  │ Firebase      │     │ Cloud Run                    │    │
│  │ Hosting       │     │ (Fastify backend container)  │    │
│  │ (React SPA)   │────▶│ min=0, max=10, 512MB, 1 CPU  │    │
│  └───────────────┘     └──────────────┬───────────────┘    │
│                                       │                     │
│                                       ▼                     │
│                         ┌────────────────────────────┐     │
│                         │ Cloud SQL (PostgreSQL)      │     │
│                         │ via Unix socket (built-in   │     │
│                         │ Cloud Run + Cloud SQL proxy)│     │
│                         └────────────────────────────┘     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Secret Manager                                      │   │
│  │ JWT_SECRET · COOKIE_SECRET · DATABASE_URL           │   │
│  │ GOOGLE_CLIENT_SECRET · GITHUB_CLIENT_SECRET         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Cloud Run Configuration

- **Min instances:** 0 — scales to zero when idle; you only pay for request time
- **Max instances:** 10 (adjustable)
- **Memory:** 512 MiB
- **CPU:** 1 vCPU
- **Port:** 8080
- **Cloud SQL connection:** via Unix socket at `/cloudsql/<connection-name>` — no proxy sidecar needed on Cloud Run, it's built into the platform when you pass `--add-cloudsql-instances`

### Cost Model (Cloud SQL concern)

Cloud SQL charges for instance uptime, not query volume. The instance runs 24/7 regardless of traffic. To manage this:

- Use the smallest instance tier that handles load — `db-f1-micro` is free-tier eligible, `db-g1-small` ($~25/mo) is fine for a dev/early prod app.
- Cloud Run scales to zero so backend compute costs are effectively zero at low traffic.
- Cloud SQL is the dominant cost. If budget is tight, consider a serverless alternative later (Neon, Supabase free tier) — but Cloud SQL is the right call for GCP-native integration and managed backups.

### CI/CD Flow

```
git push origin main
  └── Cloud Build trigger fires (connected via GitHub app)
        ├── builds Docker image from ./server
        ├── pushes image to Artifact Registry
        ├── deploys new Cloud Run revision
        │     ├── --set-env-vars (non-sensitive config)
        │     └── --set-secrets (sensitive values from Secret Manager)
        ├── npm ci && npm run build (client)
        └── firebase deploy --only hosting
```

### First-Time GCP Setup Checklist

1. **Create a GCP project** and enable billing.
2. **Enable APIs:** Cloud Run, Cloud Build, Artifact Registry, Cloud SQL Admin, Secret Manager, Firebase.
3. **Create Artifact Registry repository:** `gcloud artifacts repositories create arcade-ladder --repository-format=docker --location=us-central1`
4. **Create Cloud SQL instance:** `gcloud sql instances create arcade-ladder-db --database-version=POSTGRES_15 --tier=db-g1-small --region=us-central1`; then create a database and user.
5. **Run the migration:** `psql "$(gcloud sql instances describe arcade-ladder-db --format='value(connectionName)')" -f server/src/db/migrations/001_init.sql` (via Cloud SQL Auth Proxy locally or Cloud Shell).
6. **Store secrets in Secret Manager** (one per secret — see Environment Variables section).
7. **Connect Cloud Build to GitHub:** Go to Cloud Build → Triggers → Connect Repository → select the GitHub app → authorize → pick your repo.
8. **Create a trigger:** Branch = `^main$`, config = `cloudbuild.yaml`, fill in all substitution variables (`_CLOUDSQL_INSTANCE`, `_CLIENT_ORIGIN`, `_API_BASE_URL`, `_GOOGLE_CLIENT_ID`, `_GITHUB_CLIENT_ID`).
9. **Grant Cloud Build service account permissions:** Secret Manager Secret Accessor, Cloud Run Admin, Service Account User, Artifact Registry Writer.
10. **Initialize Firebase Hosting:** `firebase init hosting` in project root, point public dir to `client/dist`, configure as SPA.

---

## Database Schema

### `users`

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      VARCHAR(32) UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  oauth_provider VARCHAR(20) NOT NULL,        -- 'google' | 'github'
  oauth_id      VARCHAR(255) NOT NULL,
  avatar_url    TEXT,                          -- pulled from OAuth provider
  chosen_avatar VARCHAR(50),                  -- if user picks a predefined avatar
  xp            INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (oauth_provider, oauth_id)
);
```

### `games`

```sql
CREATE TABLE games (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        VARCHAR(64) UNIQUE NOT NULL,    -- e.g. 'typing-speed'
  title       VARCHAR(100) NOT NULL,
  description TEXT,
  emoji       VARCHAR(10),                    -- used as game icon
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `scores`

```sql
CREATE TABLE scores (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id    UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  score      INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX scores_game_user_idx ON scores (game_id, user_id);
CREATE INDEX scores_game_score_idx ON scores (game_id, score DESC);
```

### Leaderboard queries (no separate table needed)

**Top 50 for a game:**

```sql
SELECT
  u.id, u.username, u.avatar_url, u.chosen_avatar,
  MAX(s.score) AS best_score,
  RANK() OVER (ORDER BY MAX(s.score) DESC) AS rank
FROM scores s
JOIN users u ON s.user_id = u.id
WHERE s.game_id = $1
GROUP BY u.id, u.username, u.avatar_url, u.chosen_avatar
ORDER BY best_score DESC
LIMIT 50;
```

**A player's rank in a game:**

```sql
SELECT rank FROM (
  SELECT user_id, RANK() OVER (ORDER BY MAX(score) DESC) AS rank
  FROM scores
  WHERE game_id = $1
  GROUP BY user_id
) ranked
WHERE user_id = $2;
```

**Overall top players (sum of best scores across all games):**

```sql
SELECT
  u.id, u.username, u.avatar_url, u.chosen_avatar,
  SUM(game_bests.best_score) AS total_score,
  RANK() OVER (ORDER BY SUM(game_bests.best_score) DESC) AS overall_rank
FROM (
  SELECT user_id, game_id, MAX(score) AS best_score
  FROM scores
  GROUP BY user_id, game_id
) game_bests
JOIN users u ON game_bests.user_id = u.id
GROUP BY u.id, u.username, u.avatar_url, u.chosen_avatar
ORDER BY total_score DESC
LIMIT 10;
```

---

## API Routes

All routes are prefixed with `/api/v1`.

### Auth

| Method | Route                   | Description                             |
| ------ | ----------------------- | --------------------------------------- |
| GET    | `/auth/google`          | Redirect to Google OAuth                |
| GET    | `/auth/google/callback` | Handle Google OAuth callback, issue JWT |
| GET    | `/auth/github`          | Redirect to GitHub OAuth                |
| GET    | `/auth/github/callback` | Handle GitHub OAuth callback, issue JWT |
| POST   | `/auth/logout`          | Clear session / invalidate token        |
| GET    | `/auth/me`              | Return current authenticated user       |

### Users

| Method | Route                | Description                                  |
| ------ | -------------------- | -------------------------------------------- |
| GET    | `/users/:username`   | Get public profile by username               |
| PATCH  | `/users/me`          | Update own profile (username, chosen_avatar) |
| GET    | `/users/me/rankings` | Get current user's rank in every game        |

### Games

| Method | Route          | Description             |
| ------ | -------------- | ----------------------- |
| GET    | `/games`       | List all active games   |
| GET    | `/games/:slug` | Get single game details |

### Scores

| Method | Route                         | Description                               |
| ------ | ----------------------------- | ----------------------------------------- |
| POST   | `/games/:slug/scores`         | Submit a score (auth required)            |
| GET    | `/games/:slug/leaderboard`    | Top 50 players for game                   |
| GET    | `/games/:slug/leaderboard/me` | Current user's rank + surrounding players |

### Leaderboard (overall)

| Method | Route              | Description                                   |
| ------ | ------------------ | --------------------------------------------- |
| GET    | `/leaderboard/top` | Top 10 overall players (for home page podium) |

---

## Auth Flow

```
1. User clicks "Sign In" → modal opens with Google and GitHub options
2. User picks a provider → browser navigates to /api/v1/auth/google (or /github)
3. Fastify redirects to provider OAuth consent screen
4. User approves → provider redirects to /api/v1/auth/{provider}/callback
5. Backend exchanges code for provider profile (email, name, avatar)
6. Backend upserts user in DB (creates on first login)
7. Backend issues a signed short-lived JWT (1h)
8. Browser redirects to frontend with ?token=<jwt> in query string
9. Frontend reads the token from URL, stores in sessionStorage, clears URL
10. Frontend calls /auth/me to hydrate user context
```

**Token storage:** JWT is kept in `sessionStorage` (cleared on tab close). This is a pragmatic trade-off for a game site — it avoids the complexity of refresh token rotation while keeping tokens out of localStorage (where XSS has indefinite access). A refresh token flow can be added later if session duration becomes a UX issue.

JWT payload:

```json
{
  "sub": "<user_uuid>",
  "username": "CyberKnight",
  "iat": 1234567890,
  "exp": 1234571490
}
```

---

## XP System

XP is earned by submitting scores. It is cosmetic — no unlocks or gating, just a visible level on the profile.

| Action                                        | XP Earned |
| --------------------------------------------- | --------- |
| Submit any score (first play on a game today) | +10 XP    |
| Beat your personal best                       | +25 XP    |
| Reach top 100 in a game (first time)          | +50 XP    |
| Reach top 10 in a game (first time)           | +100 XP   |
| Reach #1 in a game                            | +250 XP   |

**Level thresholds** (sample):

| Level | XP Required |
| ----- | ----------- |
| 1     | 0           |
| 2     | 100         |
| 3     | 250         |
| 5     | 750         |
| 10    | 2,500       |
| 20    | 10,000      |

These can be stored as a config constant on the backend and client — no DB table needed.

---

## Avatar System

Users have two avatar options, resolved in priority order:

1. **OAuth avatar** — pulled from Google or GitHub during auth, stored as `avatar_url`
2. **Predefined avatar** — user selects from 5 abstract shape avatars, stored as `chosen_avatar` (e.g. `"abstract-1"`)

The frontend resolves which to display: if `chosen_avatar` is set, use the predefined image asset; otherwise fall back to `avatar_url`.

Predefined avatars are static SVG assets bundled with the frontend — no storage bucket needed.

---

## Environment Variables

### Backend (`server/.env`)

```
DATABASE_URL=postgresql://...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
CLIENT_ORIGIN=https://arcadeladder.com
PORT=8080
```

### Frontend (`client/.env`)

```
VITE_API_BASE_URL=https://api.arcadeladder.com
```

---

## Security Notes

- JWTs stored in memory (not localStorage) — XSS cannot steal tokens
- Refresh tokens in `httpOnly` cookies — inaccessible to JavaScript
- CORS restricted to `CLIENT_ORIGIN` only
- Response schemas strip undeclared fields (Fastify built-in)
- Score submission requires valid JWT — no unauthenticated score posting
- SQL queries use parameterized statements — no raw string interpolation
- `UNIQUE (oauth_provider, oauth_id)` prevents account duplication across providers
