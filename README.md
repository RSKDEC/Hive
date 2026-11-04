# Oasis

A two-player hex-tile strategy game for the family: play **online with a private link**, **pass-and-play on one device**, or **against the computer**. No accounts, no ads.

A desert-themed game: surround the rival Pharaoh on all six sides before yours is trapped. There is no board. The tiles themselves make the playing area (the *oasis*), and each creature moves in its own way.

> Oasis is an original game with its own name, theme and artwork. Its rules follow the well-known
> "surround the key piece" hex-tile design (rules and mechanics are not copyrightable). It does not use any
> other game's name, characters, artwork or code. The rules engine was written independently from published rules.

| Creature | Tiles | Movement |
|---|---|---|
| Pharaoh | 1 | 1 space. Lose if it's surrounded. Must be placed by your 4th turn. |
| Cat | 2 | 1 space, and can climb on top of tiles (covered tiles are trapped). |
| Jerboa | 3 | Hops in a straight line over one or more tiles. |
| Scorpion | 2 | Exactly 3 spaces around the edge. |
| Camel | 3 | Any number of spaces around the edge. |
| Chameleon *(expansion)* | 1 | Copies the movement of the creatures it touches. |
| Falcon *(expansion)* | 1 | Flies 2 steps over the top of the oasis, then lands. |
| Ibis *(expansion)* | 1 | 1 space, or carries an adjacent tile over itself. |

**Basic** uses the first five creatures (11 tiles each). **Full** adds all three expansions (14 tiles each), and each expansion can also be switched on or off on its own.

---

## Quick start on a Mac

1. Install the tools (once). If you don't have [Homebrew](https://brew.sh):
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   brew install node git        # Node.js 20.9 or newer
   ```
2. Get the code and install dependencies:
   ```bash
   git clone https://github.com/rskdec/hive.git oasis
   cd oasis
   git checkout pondlife-app   # until it is merged
   npm install
   ```
3. Run it:
   ```bash
   npm run dev
   ```
   Open <http://localhost:3000>.

That's enough for **pass-and-play** and **vs computer**. **Online games also work in dev mode** without any setup: they are kept in the dev server's memory. Open the invite link in a second browser window (or on a phone on the same Wi-Fi via `http://<your-mac's-ip>:3000`) to try it. Restarting the server clears online games.

To play with family in other countries, deploy it (see below) with Supabase so games are stored permanently.

---

## Online play: Supabase + Vercel

### 1. Create the database (Supabase, free tier is fine)
1. Create a project at <https://supabase.com/dashboard>.
2. Open **SQL Editor → New query**, paste the contents of
   [`supabase/migrations/20261104000000_init.sql`](supabase/migrations/20261104000000_init.sql) and click **Run**.
   *(Or with the Supabase CLI: `supabase link --project-ref <ref>` then `supabase db push`.)*
3. In **Project Settings → API**, copy the **Project URL**, the **anon public** key and the **service_role** key.
4. In **Realtime → Settings**, make sure public channels are allowed (the default; "Allow public access" on / "private only" off).
   Notifications only say *"game X changed"*. Clients then fetch the state from the server.

### 2. Configure environment variables
Copy `.env.example` to `.env.local` and fill it in:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...      # public: browsers use it only for realtime notifications
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # secret: server only
PLAYER_SECRET_PEPPER=some-long-random-string
```

Run `npm run dev` again. The app now stores games in Supabase.

### 3. Deploy to Vercel
1. Push this repository to GitHub.
2. In <https://vercel.com/new>, import the repository (framework: Next.js, no other settings needed).
3. Add the four environment variables above under **Settings → Environment Variables**.
4. Deploy. Share `https://<your-app>.vercel.app` with the family. Players can "Add to Home Screen" to install it like an app.

> Without Supabase variables, a production deployment disables online play (the in-memory store doesn't work on
> serverless hosting). Local and computer games still work. On a single always-on machine you can opt in to the
> memory store with `ALLOW_MEMORY_STORE=1 npm start`.

---

## How online games work

1. A player creates a game. The server stores it and seats the creator.
2. The invite link is `/g/<game-id>`. The id is random (~70 bits) and the link contains **no credentials**.
3. Each browser generates a private random token, stored in `localStorage` and sent only in a request header.
   The server stores only a salted SHA-256 hash of it. That token is what owns a seat: whoever opens the link first takes the free seat, and a third person
   can only **watch** (read-only). Refreshing or reconnecting on the same browser returns you to your seat.
4. Every action is sent to `POST /api/games/:id/act` along with the client's last known **revision**. The server:
   - verifies the player's token and that it is their turn,
   - replays the game and validates the action with the **same rules engine** the UI uses,
   - commits atomically with optimistic concurrency (`update … where revision = expected`, via the `commit_game` SQL function),
   - inserts a pass automatically if the next player has no legal action,
   - broadcasts *"game changed"* so both screens refresh instantly.
5. Stale clients get `409` plus the current state and resynchronise. Duplicate submissions of the same move are
   idempotent, and two simultaneous submissions can't both win. Clients also poll as a fallback and refresh on reconnect, focus and when coming back online.
6. Take-backs and draws are offers that the opponent must accept. Rematches create a new game with colours swapped.

The database tables have Row Level Security enabled with **no policies**, so the public anon key cannot read or write
them. Only the Next.js server (service-role key) can.

---

## Development

```bash
npm run dev          # dev server on :3000
npm test             # rules engine, AI and server tests (Vitest)
npm run test:e2e     # browser tests (Playwright): builds, starts on :3200, plays complete games
npm run lint         # TypeScript type check
npm run build        # production build
```

First time running browser tests on your Mac: `npx playwright install chromium`.

### Project layout

```
src/engine/          Pure, deterministic rules engine (no React, no I/O)
  coordinates.ts     axial hex maths
  board.ts           stacks, lifting, perimeter
  connectivity.ts    One Oasis rule (connectivity + articulation points)
  sliding.ts         freedom-to-move gates, height-aware climbing
  movement.ts        each creature's movement (incl. Chameleon and Falcon)
  expansions.ts      Ibis lift rules, resting / just-moved restrictions
  placement.ts       placement and opening rules, Pharaoh deadline
  winner.ts          surround detection
  game-state.ts      createGame, getLegalActions, getLegalMoves, validateAction, applyAction, …
  serialization.ts   save/replay, action parsing
  notation.ts        human-readable move history
  ai.ts              Easy / Medium / Hard computer players
  __tests__/         rules tests
src/server/          authoritative game service, stores (memory + Supabase), identity, realtime
src/app/             Next.js App Router pages and API routes
src/components/      Board (SVG, pan/zoom), tiles and artwork, trays, rules guide with live demos
src/store/           Zustand UI state (selection, settings)
supabase/migrations/ database schema
e2e/                 Playwright tests
```

The engine is the single source of truth. The board highlights, the server validation and the AI all call the
same functions (`getLegalActions`, `getLegalMoves`, `getLegalPlacements`, `getLiftOptions`, `validateAction`,
`applyAction`). No movement logic is duplicated.

---

## Features

- ✅ Complete rules: placement and opening restrictions (no Pharaoh first), Pharaoh-by-4th-turn, no moving before the
  Pharaoh, One Oasis connectivity (including stacks), freedom-to-move gates, height-aware climbing, covered tiles,
  automatic pass, surround win, simultaneous-surround draw, resignation, agreed draws.
- ✅ All 8 creatures including the three expansions, with Basic / Full presets and per-expansion toggles.
- ✅ Private online games: invite link, WhatsApp/share/copy, automatic start, seat protection, spectators,
  realtime sync, reconnection, refresh-safe, take-back requests, draw offers, resign, rematch.
- ✅ Pass-and-play with automatic saving (works offline after the first visit thanks to the service worker).
- ✅ Computer opponent: Easy, Medium, Hard (runs in a Web Worker so the board stays smooth).
- ✅ SVG board with pan, pinch-zoom, wheel-zoom, double-tap / button recentre, stacked tiles with height badges,
  animated placement and movement, last-move marker, legal-move highlights, two-step Ibis lift with a chooser.
- ✅ Beginner-friendly: hints, tap any tile to learn what it does, short explanations for rejected moves, a rules
  guide with live movement demos, Pharaoh "danger" meter, family mode (bigger tiles, calmer animations).
- ✅ Installable PWA, responsive from phones to desktops.
- ✅ 64 unit/integration tests + 8 browser tests (complete local game, complete two-device online game with refresh,
  disconnect, spectator and rematch; take-back flow; computer opponent; mobile layout).

## Rule interpretations

Where published rules leave room for interpretation, Oasis does the following:
- The Ibis may not lift the tile its opponent **moved** on the previous turn (a freshly *placed* tile may be lifted).
- A tile lifted by an Ibis cannot move, or use the Ibis's ability, on the next turn. A pass clears these effects.
- Both players' first tile may not be the Pharaoh (tournament opening).
- A Chameleon copies the creatures on top of adjacent stacks. On top of the oasis it moves like a Cat.

## Known limitations

- The Supabase store is implemented and type-checked, but the automated tests run against the in-memory store.
  Run one quick online game after you configure Supabase.
- No rate limiting or abuse protection beyond unguessable ids and seat tokens. Fine for a private family app, but not
  hardened for a public service.
- A seat belongs to one browser. If someone switches device mid-game, they can watch but not play from the new device
  (unless they copy their browser data).
- No game clocks, chat or push notifications. The Hard AI is a reasonable club opponent, not an expert.
