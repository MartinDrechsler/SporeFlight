# Progress

Original goal: rebuild Spore Flight (old version: github.com/MartinDrechsler/spore-flight) in clean
TypeScript, keeping its idea, principles and flow, then develop it further towards a public launch.

## Done
- 2026-11-23: First playable slice (Endless mode), built as a "tracer bullet" end to end:
  - Core: fixed 60 Hz step loop, screen state machine, seeded random, versioned save that repairs bad data.
  - Gameplay: flap physics, roots with still / drift / sway gaps, gap shrinking with progress, speed-up,
    coins, diamonds (root 20, then every 10th), combo x1 to x5 with fever (double points), crash.
  - Screens: start, playing (HUD), round over, game over with 60 s rest that survives app restarts.
  - Visuals: parallax forest, glowing roots, animated mushroom, particles, floating score texts.
  - Sound: synthesized effects, mute toggle saved.
  - Tests: 16 unit tests; phone harness with 9 checks passing on iPhone 13 and iPhone SE, zero console errors.

## Decisions (and why)
- **Rebuild instead of refactor**: the old 5,500-line `game.js` mixed rules, drawing and DOM in one class.
- **Rules are pure data + functions, drawing is separate** (Ousterhout, "design it twice"): rules are tested
  without a browser, visuals can change freely.
- **Modules split by knowledge, not by order of events** (Ousterhout, temporal decomposition): e.g. all
  difficulty rules live in `spawner.ts`.
- **Fixed time step**: every flap gives the same air time on every phone (Koster: consistent jump time is
  what players feel as "good controls"), and bugs replay exactly.
- **Thin end-to-end slice first** (Pragmatic Programmer, tracer bullets): one complete mode before breadth.
- **Changed from the old game on purpose**:
  - Difficulty follows roots passed, not points, so combos no longer make the game harder.
  - Touching the top edge bumps softly instead of being ignored or killing.
  - Coins float halfway between roots (old: fixed offset) and keep their height.
  - Start screen HUD overlap bug and the production `/api/ip` error are gone by design.

## Open questions for Martin
- Should a crash keep the round score and continue (respawn) or end the round as now? Old game: round
  ends, score resets, one life lost.
- Rest timer 60 s and the old "watch ad for +10 lives": keep ads for launch, or another reward?
- Keep the username screen? It is only useful with a leaderboard.

## Roadmap (next slices, each with tests + phone screenshots)
1. Near-miss bonus with slow motion, shield and magnet pickups.
2. Wind zones (updraft / downdraft).
3. Adventure mode: levels as data in `config/levels.ts` + level select and unlock.
4. Shop with skins (colours already isolated in `theme.ts`).
5. Daily quests and achievements, driven by `GameEvent`s.
6. Launch prep: PWA install (offline, icon), performance pass on low-end Android, deploy (new Vercel
   project), then app-store wrapping with Capacitor.
