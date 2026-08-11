# eFootball League Platform

A full-stack tournament management platform for the eFootball community. Organizers create
tournaments, players register, fixtures are generated automatically, results are reported and
confirmed, standings and brackets update live, and champions get a trophy cabinet entry and a
profile history.

## Features

- **Authentication** — register/login with Auth.js (credentials + bcrypt password hashing),
  three roles: Player, Organizer, or Both.
- **Tournament lifecycle** — DRAFT → OPEN → APPROVAL → ACTIVE → COMPLETED / CANCELLED.
  Organizers approve join requests before a tournament starts.
- **Organizer roster entry** — after creating a tournament the organizer enters the players
  directly (one name per line). Names matching an existing account are linked to it; unknown
  names create placeholder player accounts automatically. The roster stays editable until the
  tournament starts.
- **Fixture generation** — fixtures, standings, and the bracket are generated automatically
  the moment the roster is full (or after 2+ players when no cap is set):
  - **Group stage** (round robin) + knockout bracket (Group-Knockout)
  - **Single elimination** and **double elimination**
  - **Swiss** pairing
- **Result workflow** — a player reports a score (with shootout for knockouts), the opponent
  confirms it; organizers can confirm or override disputed results and award walkovers.
- **Standings** — live group and Swiss standings computed from confirmed matches.
- **Bracket visualization** — rendered knockout bracket with seeds, byes, and TBD slots.
- **Notifications** — in-app notifications for approvals, results awaiting confirmation,
  match disputes, and tournament completion.
- **Trophy cabinet & celebration** — champions get a trophy, an announcement banner, and a
  celebration on the tournament page.
- **Player profiles & statistics** — public profile pages with win/loss records, goals,
  goal difference, win rate, championships, and tournament history. Players can edit their
  eFootball identity (gamertag, platform, player ID).

## Tech stack

- [Next.js](https://nextjs.org) 16 (App Router, Server Actions, React 19)
- [Prisma](https://prisma.io) 7 + `@prisma/adapter-pg` over PostgreSQL
- [Auth.js](https://authjs.dev) v5 beta (credentials provider)
- [Tailwind CSS](https://tailwindcss.com) v4
- [Zod](https://zod.dev) for input validation
- [Vitest](https://vitest.dev) for unit tests
- TypeScript throughout

## Prerequisites

- Node.js 20+
- A local PostgreSQL 17 cluster (the project is configured for a cluster on port **5433**,
  managed via `scripts/db-start.bat` / `scripts/db-stop.bat`).

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Start the local database** (creates/start the PostgreSQL cluster in `.postgres/data`)

   ```bash
   npm run db:up
   ```

3. **Configure environment**

   ```bash
   copy .env.example .env
   ```

   Edit `.env` and set a real `AUTH_SECRET`:

   ```bash
   openssl rand -base64 32
   ```

4. **Apply migrations**

   ```bash
   npm run db:migrate
   ```

   `prisma migrate dev` creates the database automatically if it does not exist yet. On an
   existing deployment use `npm run db:deploy` instead. No demo data is seeded; create
   accounts and tournaments through the app.

5. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command                | Description                                    |
| ---------------------- | ---------------------------------------------- |
| `npm run dev`          | Start the Next.js dev server                   |
| `npm run build`        | Create an optimized production build           |
| `npm run start`        | Start the production server                    |
| `npm run lint`         | Run ESLint                                     |
| `npm run typecheck`    | Run TypeScript type checking (`tsc --noEmit`)  |
| `npm test`             | Run the Vitest unit tests                      |
| `npm run db:up`        | Start the local PostgreSQL cluster (port 5433) |
| `npm run db:down`      | Stop the local PostgreSQL cluster              |
| `npm run db:generate`  | Generate the Prisma client                     |
| `npm run db:migrate`   | Create/apply a new dev migration               |
| `npm run db:deploy`    | Apply existing migrations to the database      |
| `npm run db:seed`      | Run the seed script (no demo data is created) |
| `npm run db:studio`    | Open Prisma Studio                             |
## Project structure

```
app/
  (auth pages)  login/ register/ dashboard/
  tournament pages:  tournaments/ (list, [slug], new)
  players/[id]/   public profile page
  profile/        own profile edit page
  trophies/  notifications/
components/
  nav, status-badge
  tournament-forms, match-result-forms, generate-fixtures-button (Start tournament)
  bracket-view, profile-form
lib/
  auth.ts             Auth.js setup
  actions/            server actions (auth, tournaments, fixtures, matches, profile)
  services/           business logic (fixtures, standings, advancement, statistics)
  fixtures.ts         pure fixture/pairing math (unit tested)
  prisma.ts           Prisma client + adapter-pg
prisma/
  schema.prisma       data model
  seed.ts             no-op (no demo data)
scripts/
  db-start.bat, db-stop.bat   local PostgreSQL helpers
tests/                Vitest unit tests for pairing logic
```

## How results and the bracket work

1. Once the organizer has entered the players and the roster is full, the tournament moves to
   `ACTIVE` and fixtures are generated automatically (see `lib/services/fixtures.ts`). A
   "Start tournament" button covers leagues that begin before the cap is reached.
2. Either participant reports a score (`PENDING_CONFIRM`); the opponent confirms it
   (`CONFIRMED`). For knockout matches a penalty shootout score is collected when the
   regulation score is level.
3. Organizers can confirm, override, or award a walkover for any scheduled/pending/disputed
   match (`lib/services/advancement.ts`).
4. When a knockout match is decided, the winner is advanced into the next round's slot.
5. When the final is decided, a trophy is awarded and the tournament moves to `COMPLETED`.

## Statistics

`lib/services/statistics.ts` derives each player's record from all confirmed/walkover matches
across every tournament, and their tournament history including championship/placement. These
are shown on public profile pages (`/players/[id]`).

## Verification

Run the full suite before shipping:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

