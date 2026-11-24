# Progress

Original goal: rebuild Spore Flight (old version: github.com/MartinDrechsler/spore-flight) in clean
TypeScript, keeping its idea, principles and flow, then develop it further towards a public launch.

## Status: phase 2 "Adventure journey" done (2026-11-24)
The plan lives in the Claude Doc "Spore Flight plan" (5 phases). Next: phase 3, biomes and rewards
(8 endless biomes every 20 points, golden coin, crystal veins to mine diamonds, badges without coins,
quests paying 5 to 15 coins, skin prices).

### Phase 2 changes
- **Adventure map**: a winding path, level 1 at the bottom. Finished stops show stars, the next one glows
  with the player's mushroom on it, locked ones wait further up. Tap a stop to read it, then FLY.
- **10 levels** as in the plan: First Light, Narrow Passage, Drifting Canopy, Breathing Hollow,
  The Stone Thrower (boss), Creeping Roots, Upside-Down Grove (twist), Canopy Winds, The Way Home (twist),
  Heart of the Storm (swinging tunnel, then the boss returns). 20 to 40 roots each.
- **Stages and the finish gate**: a level is a list of stages (roots or boss); after the last one a gate of
  light appears. Flying through it completes the level, costs no life and opens the next level.
- **Fixed layouts**: roots, gaps, pickups and wind are seeded by the level, so every attempt is the same and
  the mushroom clumps mark the hard spots. The boss's attacks vary per attempt.
- **Interest curve per level**: calm, still, wider roots at the start and halfway; a tighter climax in the
  last 5 roots.
- **Stars**: 1 for finishing, 2 for 80% of the coins, 3 for every coin plus the level's diamond (one per
  level, in the climax; becomes a crystal vein in phase 3). Stars fly in one by one on the complete screen.
- **The Stone Thrower**: rocks aimed, in fans of three, or in walls with one opening; faster as the fight
  goes on, with a breather halfway. Every throw is announced (eyes flare, mouth opens, growl).
- **Twist levels** mirror the picture, never the rules (`view` in level data).
- **HUD** shows a progress bar to the gate in levels; the crash screen shows how far you got.
- **Unlock price**: 50 coins and 3 diamonds (was 100 at first). **Save v4**: stars per level (old level scores dropped,
  since the levels are new).
- **Removed** (Martin's call): glowfly swarms, one-sided roots, breathing root width, big height steps.

### After Martin's first phone test
- Fixed: missed coins and diamonds froze on screen when their root left (they now drift off).
- Adventure unlock: 50 coins (and 3 diamonds).
- More coins: a pickup after 30% of roots (was 15%), three in four of them coins. Endless clearings:
  now and then (about one in 15 roots) a root is left out and an arc of 7 coins floats in the space.
  Coins are never pulled in by themselves; you fly through them (only the magnet power-up pulls).
- Endless moving gaps open wider: drifting +24 px plus more for faster drift, swinging +34 px.
- Removed the dotted light column after each root.

### To check by playing
- Heart of the Storm: 40 roots at spacing 170 with speed rising every 10 roots may be too hard.
- Boss rock speed and throw timing (tuning.ts `boss`), level gap sizes (levels.ts).

### Phase 1 changes
- **Flight**: rises softly, falls faster (separate rise and fall gravity), nose dips further when diving.
- **Score**: exactly 1 point per root. Combo, multipliers, fever and coin benchmarks are removed.
- **Endless rhythm**: waves of 10 roots: a surge of 4 tighter roots, then 2 calm, still roots with more pickups.
  Endless gaps start at 140 px and tighten to 115 px.
- **Milestones** at 10, 20, 30, 50, 75, 100: big number, burst and flash. No coins, the moment is the reward.
- **Feedback**: light column on every pass, score pop, near-miss sound and slow motion (no coins),
  stronger crash shake, "new best" celebration.
- **Lives everywhere**: Adventure crashes cost a life too. Out of lives: rest 1 minute (counts only while
  the game is open) or watch a short ad (skippable after 3 s). Both give 5 lives.
- **Mushroom clumps** grow where you crashed, per level (nearby crashes grow one bigger clump).
- **Coins are scarce**: coins are worth 1 and come only from collecting them. Diamonds: root 30, then every 30th.
- **Save v3**: death marks per level, rest countdown. Older saves migrate.
- **Fixes after Martin's review**: a crash's mushroom clump grows only after the mushroom has landed on that
  spot (the round-over screen waits for it). Endless starts plain: magnets from root 40, wind from root 120
  (level data `magnetFromRoot`, `windFromRoot`).

### Built before phase 1 (some details superseded above)
- **Flight**: fixed 60 Hz physics, roots, gap shrinking and moving gaps with progress, speed-up, ceiling bump.
- **Endless mode**: 5 lives, round score resets each crash, benchmarks at 25/50/75/100 (+5/10/15/20 coins),
  wind zones, the painted forests from the old game fading in at score 20 and 40, markers where recent rounds ended.
- **Adventure mode**: 9 levels as data (alternating breathing roots + glowflies, drifting gaps, tight gaps,
  breathing gaps, sliding roots, staggered steps, waving tunnel, maze, storm), unlock screen, level select
  with stars (5/12/25), per-level best, own crash screen with retry. Crashes do not cost lives.
- **Pickups**: coins (worth the combo multiplier), diamonds (root 20, then every 10th), glow-shield (absorbs one
  hit, then 1.5 s invulnerable), magnet (10 s, pulls coins and diamonds).
- **Combo**: passes, coins, near-misses and diamonds build it; x2 to x5; x5 is fever (double again, rainbow
  trail, purple vignette). Near-miss: coins, short slow motion, small shake.
- **Meta**: username on first launch, shop with 4 skins, 6 achievements with coin rewards, 3 daily quests
  from a pool of 5 (reset at local midnight, claim button), coins and diamonds.
- **Lives**: only refilled by watching a rewarded ad (+10). Ads are a mock (2 s) behind `src/ads/ads.ts`.
- **Quality**: 33 unit tests; phone harness with 21 flow checks passing on iPhone 13 and iPhone SE, zero
  console errors, screenshots of every screen and every level.

## Martin's decisions
- A crash ends the round (endless: one life lost, score resets).
- Lives come back by resting 1 minute or by a short skippable ad. No generous refills, no random ads.
- 1 point per root, no combos or multipliers. Coins hard to get. Keep the name screen first.
- Endless biome changes every 20 points; Adventure is a map path like Candy Crush.
- Keep the username screen.

## Decisions (and why)
- **Rebuild instead of refactor**: the old 5,500-line `game.js` mixed rules, drawing and DOM in one class.
- **Rules are pure data + functions, drawing and screens separate** (Ousterhout, "design it twice").
- **Modules split by knowledge, not by order of events** (Ousterhout, temporal decomposition): all placement and
  difficulty rules live in `spawner.ts`, all spending in `meta/economy.ts`.
- **Levels are data with flags** (old code checked level names in several places).
- **Fixed time step**: same air time on every phone (Koster: consistent jumps feel like good controls).
- **Thin end-to-end slice first, then breadth** (Pragmatic Programmer, tracer bullets).
- **Endless is a level with one never-ending stage** (Ousterhout, define special cases out of existence):
  the course code has no "if endless" branch for spawning or finishing.
- **Twist levels mirror the picture, not the physics** (Ousterhout, pull complexity down): one `view`
  transform in rendering instead of reversed-gravity and reversed-direction cases in the rules.
- **Stars as layers of challenge** (Schell): finishing moves you on; stars give skilled players a reason
  to replay.
- **Boss throws are announced** (Schell, Lens of Fairness): a hit should always feel like your own mistake.
- **Fixed layouts per level, random boss attacks**: levels are learned by replaying; the boss stays tense.

## Changed from the old game on purpose
- Lives are saved. Before, a reload gave 5 free lives; with ads as the only refill, that would be a free bypass.
- Difficulty follows roots passed, not points, so a big combo no longer makes the game harder.
- Adventure speed: the old code let a level's speed multiplier fall back to 1.0 within a second (a bug).
  Now the level's multiplier is the base and steps up every 10 roots, as in endless.
- Pickups float halfway between roots. The old fixed offset put them inside the next root on the
  closely spaced levels (tunnel, storm).
- Level select: tap a stop on the map to read it, then FLY. The old hover text could not be read on phones.
- Coins and diamonds are banked at the end of a round (same totals; closing the app mid-round loses that round's).
- Removed: unused obstacle types, the dev tunnel/QR code, the "skip rest (testing)" button.
- The resting-mushroom picture is used on the game over and adventure crash screens.

## Open questions for Martin
- **Ad network**: AdMob (needs the app-store wrapper) or a web ad network for the browser version.
- **Balance** after playing: gap sizes per level, boss speed, Heart of the Storm's difficulty.

## Roadmap
Phases from the plan: 1 challenge and feel (done), 2 Adventure journey (done), 3 biomes and rewards,
4 leaderboard (backend, replay check, country, privacy), 5 launch prep (real ads, PWA, app stores,
playtesting).
