# Arcade Ladder 🎮

> A web-based arcade platform where every game has a leaderboard and every player has a rank.

Play simple, fun browser-based games, compete on permanent per-game leaderboards, and climb the overall rankings. No seasons, no paywalls — just skill and repetition.

**Live site:** arcadeladder.com _(in development)_

---

## Tech Stack

| Layer            | Technology                             |
| ---------------- | -------------------------------------- |
| Frontend         | Vite + React + TypeScript              |
| Frontend Hosting | Firebase Hosting                       |
| Backend          | Node.js + Fastify                      |
| Backend Hosting  | Google Cloud Run                       |
| Database         | Google Cloud SQL (PostgreSQL)          |
| Auth             | Google OAuth 2.0 + GitHub OAuth 2.0    |
| CI/CD            | Google Cloud Build + Artifact Registry |
| Containerization | Docker                                 |

---

## Pages

| Page          | Route                | Description                                              |
| ------------- | -------------------- | -------------------------------------------------------- |
| Home / Hub    | `/`                  | Top 3 podium, site stats, live activity feed             |
| Games Gallery | `/games`             | Grid of all playable games with your rank per game       |
| Game (Play)   | `/games/:slug`       | Play the game, score tracking, game-specific leaderboard |
| Leaderboard   | `/leaderboard`       | Full top-50 rankings per game with game selector         |
| Profile       | `/profile/:username` | Player stats, all game rankings, recent XP               |

---

## Local Development

### Prerequisites

- Node.js 20+
- PostgreSQL 15 running locally (or use Cloud SQL Auth Proxy)
- Google Cloud SDK (`gcloud`) — for deployment only
- Firebase CLI (`firebase`) — for deployment only

### Quick Start

```bash
# 1. Clone the repo and install deps
git clone https://github.com/YOUR_USERNAME/arcade-ladder.git
cd arcade-ladder

# 2. Backend
cd server
cp .env.example .env          # fill in your values
npm install
npm run dev                   # starts on :8080

# 3. Frontend (separate terminal)
cd client
cp .env.example .env          # set VITE_API_BASE_URL=http://localhost:8080/api/v1
npm install
npm run dev                   # starts on :5173
```

### Environment Variables

**`server/.env`**

```
DATABASE_URL=postgresql://postgres:password@localhost:5432/arcadeladder
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
JWT_SECRET=dev-secret-change-me
COOKIE_SECRET=dev-cookie-secret
CLIENT_ORIGIN=http://localhost:5173
API_BASE_URL=http://localhost:8080
PORT=8080
```

**`client/.env`**

```
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

### Database Setup (local)

```bash
psql -U postgres -c "CREATE DATABASE arcadeladder;"
psql -U postgres -d arcadeladder -f server/src/db/migrations/001_init.sql
```

The migration creates all tables and inserts 3 seed users + scores across 3 games so leaderboards are never empty during development.

---

## Deployment (Google Cloud Platform)

Full step-by-step in [docs/architecture.md](docs/architecture.md). Short version:

1. Push code to a GitHub repository.
2. In GCP Console → Cloud Build → Triggers, connect the GitHub repo and point to `cloudbuild.yaml`.
3. Fill in the trigger's substitution variables (`_CLOUDSQL_INSTANCE`, `_CLIENT_ORIGIN`, `_API_BASE_URL`, `_GOOGLE_CLIENT_ID`, `_GITHUB_CLIENT_ID`).
4. Store secrets in Secret Manager: `JWT_SECRET`, `COOKIE_SECRET`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_SECRET`, `DATABASE_URL`.
5. Push to `main` — Cloud Build handles everything: Docker build → Artifact Registry → Cloud Run (backend) → Firebase Hosting (frontend).

**Cost at low traffic:** Cloud Run at min=0 scales to zero (no idle compute charges). Cloud SQL is the only always-on cost — `db-g1-small` is ~$25/mo. Firebase Hosting has a generous free tier.

---

## Project Structure

```
arcade-ladder/
├── client/          # Vite + React + TypeScript frontend
├── server/          # Node.js + Fastify backend
├── docs/            # Architecture and product documentation
└── .github/         # GitHub Actions / Cloud Build triggers
```

---

## Deployment

The backend deploys to **Google Cloud Run** via Docker containers. The frontend deploys to **Firebase Hosting**. Both are triggered automatically on pushes to `main`.

```
main branch push
  ├── Cloud Build → builds Docker image → Artifact Registry → Cloud Run (backend)
  └── Firebase CLI → firebase deploy (frontend)
```

Full deployment guide: see [docs/architecture.md](docs/architecture.md).

---

## Documentation

- [Architecture & Technical Design](docs/architecture.md)
- [Product Specification](docs/product-spec.md)

---

## Author

Solo project by [Stefan Bobrowski](stefanbobrowski.com). Built with TypeScript end-to-end on Google Cloud Platform.
