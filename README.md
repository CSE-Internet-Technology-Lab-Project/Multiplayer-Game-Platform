# Gridline — Multiplayer Tic-Tac-Toe

The MVP is a modular-monolith game platform: Next.js owns the browser UI and HTTP API, while a compact Socket.IO process owns live match events. Both use the same Prisma/PostgreSQL data model.

## Run locally

1. Copy `.env.example` to `.env` and change `AUTH_SECRET`.
2. Start PostgreSQL: `docker compose up -d postgres`.
3. Create the schema: `npm run db:migrate -- --name init`.
4. In separate terminals run `npm run dev` and `npm run socket`.
5. Open `http://localhost:3000` in two browsers (or two physical machines) and register two users.

## Deployment

Deploy the Next.js app to Vercel with `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_ORIGIN`, and `NEXT_PUBLIC_SOCKET_URL`. Run `npm run db:deploy` once against the production database. Deploy the included `Dockerfile.socket` to any long-running Node/Docker host, pointed at the same database and `AUTH_SECRET`; set its `NEXT_PUBLIC_APP_ORIGIN` to the Vercel URL.

Vercel functions cannot host a persistent Socket.IO server, so the dedicated socket process is required for real-time play. This still keeps one codebase, one database, and one modular-monolith domain model.

## Game rules and scoring

- The creator is X; the next authenticated user becomes O.
- The socket server validates player membership, turn order, board cells, wins, and draws.
- A win is worth 3 points; a draw awards 1 point to each player.
- Completed matches are persisted and feed the leaderboard and personal analytics.

## Platform foundation

Authenticated creators can open `http://localhost:3000/creator` to create and publish declarative game definitions. A definition contains a slug, category, player/team limits, rules, winning conditions, and scoring policy as structured JSON. Executable game code is intentionally not uploaded; each game type is implemented behind a reviewed server-side adapter.

The platform APIs are:

- `GET/POST /api/games` to discover published games or create creator drafts.
- `GET /api/games/:id` to read a published definition or the creator's own draft.
- `POST /api/games/:id/publish` to publish a creator-owned draft.
- `GET /api/events` to read the authenticated player's recent domain events.
- `POST /api/rooms` optionally accepts `{ "gameDefinitionId": "..." }` for a published game.

Rooms now persist participants with optional team assignments and append domain events such as `ROOM_CREATED`, `PLAYER_JOINED`, `MOVE_PLAYED`, and `MATCH_FINISHED`. This gives the Socket.IO process a stable event-driven boundary while PostgreSQL remains the source of truth.
