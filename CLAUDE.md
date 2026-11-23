# Spore Flight

One-tap mobile web game: a glowing mushroom flies through gaps in forest roots.
TypeScript + Vite, drawn on a canvas, no game engine. The only runtime package is the bundled VT323 font.

## Commands
- `npm run dev`: local server with live reload (`--host`, so a phone on the same Wi-Fi can open it)
- `npm run check`: strict type check + unit tests. Must pass before every commit.
- `npm run play -- http://localhost:5173/ "iPhone 13"`: walks every screen and flow, checks them, saves
  screenshots to `shots/` (set `CHROME_PATH=/usr/bin/google-chrome` where Playwright cannot download a
  browser). Also run with `"iPhone SE"`, the smallest supported screen. Look at the screenshots.
- `npm run build`: production build in `dist/`

## Before deciding
Design decisions are checked against the books in the claude.ai project (Ousterhout, *The Pragmatic Programmer*,
Fowler's *Refactoring*, Schell's *Art of Game Design*, Koster's *A Theory of Fun*). Code rules: the
`clean-game-code` skill. Workflow and phone testing: the `mobile-web-game-dev` skill.

## Architecture
Dependencies point one way: `states -> meta / gameplay -> core / config`. `render` and `ui` only read state.

- `src/config/`: all data. `tuning.ts` (every number, px and seconds), `levels.ts` (endless + 9 adventure
  levels, described by flags, never by name), `theme.ts` (10 colour themes), `skins.ts`, `rewards.ts`
  (achievements, daily quest pool).
- `src/core/`: fixed-step loop, state machine, seeded random, versioned save file. Game-agnostic.
- `src/gameplay/`: the flight rules as plain data + pure functions. No DOM, no timers, no `Math.random`.
  `world.ts` runs one round and reports what happened as `GameEvent`s. `spawner.ts` turns level data into roots,
  pickups and wind.
- `src/meta/`: everything outside flight, as pure functions on `SaveData`: economy (banking, shop, unlock,
  ad lives), achievements, daily quests.
- `src/ads/`: the rewarded-ads interface. A mock today; a real ad network plugs in here only.
- `src/render/`: canvas drawing. Reads the world, never changes it. `effects.ts` is visual only.
- `src/ui/`: the only code that touches the DOM: screens, HUD, menu lists, toast.
- `src/states/`: one file per screen with `enter/exit/update/onTap`. They connect gameplay, meta and UI.
- `src/audio/`: synthesized sounds reacting to `GameEvent`s.
- `src/testHooks.ts`: `render_game_to_text`, `advanceTime`, `__test`, only with `?test=1`.

## Rules that matter most
1. Gameplay is deterministic: use `world.rng`, step time only through `dt`. Pass `?seed=N` to replay a run.
2. New behaviour = new data or a new case in one module, not flags spread across files.
3. Only `src/core/save.ts` touches localStorage; loading never fails (bad data becomes defaults).
   Changing `SaveData` means updating `migrate()` and its test.
4. A commit either restructures or changes behaviour, never both. Update `progress.md` as you go.
