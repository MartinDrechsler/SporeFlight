# Spore Flight

One-tap mobile web game: a glowing mushroom flies through gaps in forest roots.
TypeScript + Vite, drawn on a canvas, no game engine. The only runtime package is the bundled VT323 font.

## Commands
- `npm run dev`: local server with live reload (`--host`, so a phone on the same Wi-Fi can open it)
- `npm run check`: strict type check + unit tests. Must pass before every commit.
- `npm run play -- http://localhost:5173/ "iPhone 13"`: walks every screen and flow, checks them, saves
  screenshots to `shots/` (set `CHROME_PATH=/usr/bin/google-chrome` where Playwright cannot download a
  browser). Also run with `"iPhone SE"`, the smallest supported screen. Look at the screenshots.
- `npm run build`: production build: the game in `dist/`, then `.vercel/output` (Vercel's Build Output format:
  the game as static files plus each leaderboard endpoint bundled with esbuild into a self-contained function).

## Before deciding
Design decisions are checked against the books in the claude.ai project (Ousterhout, *The Pragmatic Programmer*,
Fowler's *Refactoring*, Schell's *Art of Game Design*, Koster's *A Theory of Fun*). Code rules: the
`clean-game-code` skill. Workflow and phone testing: the `mobile-web-game-dev` skill.

## Architecture
Dependencies point one way: `states -> meta / gameplay -> core / config`. `render` and `ui` only read state.

- `src/config/`: all data. `tuning.ts` (every number, px and seconds), `levels.ts` (endless + 10 adventure
  levels as stages, described by flags, never by name), `biomes.ts` (the 8 endless biomes), `theme.ts`
  (11 level colour themes), `skins.ts` and `trails.ts` (looks and prices), `rewards.ts` (badges, daily quest pool).
- `src/core/`: fixed-step loop, state machine, seeded random, versioned save file, run record, and `fmath.ts`
  (sin, cos, atan2, hypot from basic arithmetic, identical on every device). Game-agnostic.
- `src/gameplay/`: the flight rules as plain data + pure functions. No DOM, no timers, no `Math.random`.
  `world.ts` runs one round and reports what happened as `GameEvent`s. `course.ts` walks a level's stages to the
  finish gate (endless is one stage that never ends). `spawner.ts` turns level data into roots, pickups and wind.
  `boss.ts` is the Stone Thrower, `veins.ts` the crystal veins. `replay.ts` replays a recorded endless run.
- `src/meta/`: everything outside flight, as pure functions on `SaveData`: economy (banking, shop, unlock,
  lives), adventure (stars, which levels are open), achievements, daily quests, names, leaderboard (what to send).
- `src/ads/`: the rewarded-ads interface. A mock today; a real ad network plugs in here only.
- `src/online/`: calls to the leaderboard server; never throws, tells whether to retry.
- `server/`: the leaderboard server. `api.ts` checks every input and replays each run before accepting a score;
  `store.ts` is Upstash Redis (env `KV_REST_API_URL`, `KV_REST_API_TOKEN`) or memory in tests; `node.ts` adapts
  it to a Vercel Node function. Imports game rules from `src/`, never DOM code.
- `src/render/`: canvas drawing. Reads the world, never changes it. `effects.ts` is visual only. `view.ts`
  mirrors the picture for twist levels (upside down, backwards); the rules never change. `obstacles.ts` and
  `scenery.ts` draw each biome's obstacles, distant world and life in the air.
- `src/ui/`: the only code that touches the DOM: screens, HUD, menu lists, the Adventure map, toast.
- `src/states/`: one file per screen with `enter/exit/update/onTap`. They connect gameplay, meta and UI.
- `src/audio/`: synthesized sounds reacting to `GameEvent`s.
- `src/testHooks.ts`: `render_game_to_text`, `advanceTime`, `__test`, only with `?test=1`.

## Rules that matter most
1. Gameplay is deterministic: use `world.rng` (per attempt) or `world.layoutRng` (roots, pickups, wind; seeded by
   the level when its layout is fixed), step time only through `dt`. Pass `?seed=N` to replay a run. In
   `src/gameplay` use `core/fmath` instead of Math.sin/hypot/pow/`**` (a test enforces it), and raise
   `TUNING.leaderboard.rulesVersion` when a rule change would make old runs replay differently.
2. New behaviour = new data or a new case in one module, not flags spread across files.
3. Only `src/core/save.ts` touches localStorage; loading never fails (bad data becomes defaults).
   Changing `SaveData` means updating `migrate()` and its test.
4. A commit either restructures or changes behaviour, never both. Update `progress.md` as you go.
