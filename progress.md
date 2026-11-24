# Progress

Original goal: rebuild Spore Flight (old version: github.com/MartinDrechsler/spore-flight) in clean
TypeScript, keeping its idea, principles and flow, then develop it further towards a public launch.

## Status: phase 1 "Challenge and feel" done (2026-11-24)
The plan lives in the Claude Doc "Spore Flight plan" (5 phases). Phase 1 makes the game a real Flappy-style
challenge. Next: phase 2, the Adventure journey (map path, 10 levels with finish gates).

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

## Changed from the old game on purpose
- Lives are saved. Before, a reload gave 5 free lives; with ads as the only refill, that would be a free bypass.
- Difficulty follows roots passed, not points, so a big combo no longer makes the game harder.
- Adventure speed: the old code let a level's speed multiplier fall back to 1.0 within a second (a bug).
  Now the level's multiplier is the base and steps up every 10 roots, as in endless.
- Pickups float halfway between roots. The old fixed offset put them inside the next root on the
  closely spaced levels (tunnel, storm).
- Level select: tap once to read a level, tap again to fly. The old hover text could not be read on phones.
- Coins and diamonds are banked at the end of a round (same totals; closing the app mid-round loses that round's).
- Removed: unused obstacle types, the dev tunnel/QR code, the "skip rest (testing)" button.
- The resting-mushroom picture is used on the game over and adventure crash screens.

## Open questions for Martin
- **Adventure unlock price**: the old game had 0 coins / 0 diamonds (a placeholder). Set in `config/levels.ts`.
- **Levels 7 and 8 may be too hard**: every gap swings by up to 80 px, level 7 roots are only 170 px apart.
  These are the old game's values. Play them and decide; a balance pass is a one-line change per level.
- **Ad network**: AdMob (needs the app-store wrapper) or a web ad network for the browser version.

## Roadmap
1. Balance pass after Martin plays every level on his phone.
2. Deploy to a new Vercel project for real-phone testing.
3. Real rewarded ads behind `src/ads/ads.ts`.
4. Launch prep: PWA install (offline, icon), performance pass on a low-end Android, app-store wrapping (Capacitor).
