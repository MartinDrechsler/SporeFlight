# Spore Flight

One-tap mobile web game: a glowing mushroom flies through gaps in forest roots.
TypeScript + Vite, drawn on a canvas, no game engine and no runtime dependencies.

## Commands
- `npm run dev`: local server with live reload (`--host`, so a phone on the same Wi-Fi can open it)
- `npm run check`: strict type check + unit tests. Must pass before every commit.
- `npm run play -- http://localhost:5173/ "iPhone 13"`: phone test with screenshots in `shots/`
  (set `CHROME_PATH=/usr/bin/google-chrome` where Playwright cannot download a browser). Also run with `"iPhone SE"`.
- `npm run build`: production build in `dist/`

## Before deciding
Design decisions are checked against the books in the claude.ai project (Ousterhout, *The Pragmatic Programmer*,
Fowler's *Refactoring*, Schell's *Art of Game Design*, Koster's *A Theory of Fun*). Code rules: the
`clean-game-code` skill. Workflow and phone testing: the `mobile-web-game-dev` skill.

## Architecture
Dependencies point one way: `states -> gameplay -> core/config`. `render` and `ui` only read state.

- `src/config/`: every tuning number (`tuning.ts`, px and seconds) and colours (`theme.ts`). No numbers elsewhere.
- `src/core/`: fixed-step loop, state machine, seeded random, save file. Game-agnostic.
- `src/gameplay/`: the rules as plain data + pure functions. No DOM, no timers, no `Math.random`.
  `world.ts` runs one round and reports what happened as `GameEvent`s.
- `src/render/`: canvas drawing. Reads the world, never changes it. Effects are visual only.
- `src/ui/`: the only code that touches the DOM (`dom.ts`, `hud.ts`, `screens.ts`).
- `src/states/`: one file per screen with `enter/exit/update/onTap`. Sessions (lives, banking coins,
  saving) live here.
- `src/audio/`: synthesized sounds reacting to `GameEvent`s.
- `src/testHooks.ts`: `render_game_to_text`, `advanceTime`, `__test`, only with `?test=1`.

## Rules that matter most
1. Gameplay is deterministic: use `world.rng`, step time only through `dt`. Pass `?seed=N` to replay a run.
2. New behaviour = new data or a new case in one module, not flags spread across files.
3. Only `src/core/save.ts` touches localStorage; loading never fails (bad data becomes defaults).
4. A commit either restructures or changes behaviour, never both. Update `progress.md` as you go.
