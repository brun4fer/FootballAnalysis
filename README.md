# FootballAnalysis

Next.js + Drizzle football analytics stack for capturing goals and computing live aggregates.

## Tech
- Next.js (App Router, React 18, TypeScript)
- Drizzle ORM + Zod validation
- PostgreSQL 16+
- TailwindCSS + Radix primitives + Recharts
- TanStack Query on the client

## Setup
1. Install deps: `npm install`
2. Copy env: `cp .env.example .env` and set `DATABASE_URL`.
3. Run migrations: `npm run db:migrate` (drizzle-kit uses `src/db/migrations`).
4. Dev server: `npm run dev`

## Structure
- `src/schema` – Drizzle schema (kept in sync with SQL migrations)
- `src/db/migrations` – SQL migrations (0000 schema, 0001 lookup seed, 0002 Liga Portugal 2)
- `src/server` – DB utilities and aggregation queries
- `src/app/api` – Typed REST endpoints (goals + stats + lookups + team/player management)
- `src/app/goals` – Goal capture wizard
- `src/app/teams` – Team stats dashboard
- `src/app/manage/teams` – Team CRUD
- `src/app/manage/players` – Player CRUD

## Seeded Data
- Seasons: 2024/25
- Championship: Liga Portugal 2 (Portugal)
- Teams: Académico de Viseu, AVS Futebol SAD, Belenenses, CD Mafra, CD Nacional, Feirense, FC Penafiel, FC Porto B, Leixões SC, Marítimo, Oliveirense, Paços de Ferreira, Santa Clara, Torreense, Tondela, União de Leiria, Benfica B, Estrela da Amadora.

## Key Endpoints
- `POST /api/goals` – insert goal + involvements (validated with Zod, transactional)
- `GET /api/goals?teamId=` – list goals for a team
- Stats: `/api/stats/top-scorers|involvement|zones|moments|actions|penalties-by-zone?teamId=`
- Lookups: `/api/lookups` (moments, sub-moments, actions, goalkeeper zones, championships, teams)
- Teams CRUD: `/api/manage/teams` (GET/POST) and `/api/manage/teams/:id` (PUT/DELETE)
- Players CRUD: `/api/manage/players` (GET/POST) and `/api/manage/players/:id` (PUT/DELETE)

## UI
- Dark, neon-accented "ops" theme
- Wizard flow: team ? scorer ? involvements ? tactical context ? goalkeeper zone ? review
- Dashboards: KPI cards, bar/pie charts, involvement leaderboard (driven by live SQL aggregations)
- Management screens: teams & players with inline create/update/delete
