# Progress

Original goal: rebuild Spore Flight (old version: github.com/MartinDrechsler/spore-flight) in clean
TypeScript, keeping its idea, principles and flow, then develop it further towards a public launch.

## Status: phase 4 live (leaderboard connected); polish and sound after playing (2026-11-24)
The plan lives in the Claude Doc "Spore Flight plan" (5 phases). Next: phase 5, launch prep (real ads, PWA,
app stores, playtesting).

### Coin and diamond piles on home
- Beside the home avatar: neat stacks of coins to its lower left (10 per stack, up to 5 stacks) and a
  pyramid of diamonds to its right (5 at the bottom, up to 15), one piece for each one owned, with the
  number at each pile's outer side. Past 50 coins or 15 diamonds the pile stays full and the number tells
  the rest (`render/treasure.ts`).
- When the amount changes (a purchase, a reward), the piles change one piece at a time: spent pieces pop
  off the top and fade, new ones drop on. A big change still takes about a second. The piles catch up
  whenever the home screen shows, so coming back from the shop shows the purchase leaving the pile.
- Spacing: the piles start further out from the avatar (1.75 radii from its centre) and stand a little
  below its foot (never lower than its space, above the buttons). The home avatar can be bigger (up to
  2.1x); the pieces keep their size and shrink only if a screen is too narrow for full piles.

### Going back without lives
- **BACK on the out of breath screen** asks first: "GO BACK WITHOUT LIVES?" YES / NO, inline under the two
  choices. YES goes home with no lives.
- **Home with no lives**: the home screen shows (it no longer jumps straight to out of breath). The lives
  stat pulses red; tapping it, or TAP TO FLAP, opens the out of breath screen, where the player still has to
  rest a minute or watch an ad.
- **A started rest goes on** anywhere in the game while it is open (`restWhileAway`, main loop); on the home
  screen the countdown shows in place of the empty hearts. When it ends: "RESTED! +5 LIVES".

### Out of breath, and home vs flight
- **"Record" instead of "best"** everywhere on screen: home, HUD, out of breath, leaderboard, NEW RECORD!
- **Home and flight are separate**: tapping TAP TO FLAP no longer shrinks the big home mushroom into the
  flying one; the flying mushroom is simply in its place.
- **Out of breath: two big choices side by side**, REST 1 MINUTE (hollow, yellow border and text) and WATCH
  AN AD (hollow, glowing green border and text, gently pulsing). Nothing happens until one is tapped (the
  rest no longer starts by itself; `startRest`, no save change: out of lives with 0 seconds left means "not
  chosen yet"). Meanwhile the mushroom lies knocked out: crossed eyes, tongue out, cartoon stars circling.
- **Resting**: the rest button becomes a yellow countdown ring, the ad button stays to skip the wait. The mushroom
  gets better as the minute passes (`RECOVERY` in config/animations.ts, by share of the rest), starting
  from where it lies: at 15 s sits up and opens its eyes, at 30 s drinks a glass of water
  through a straw, gulp by gulp, at 45 s stands up and stretches, at 60 s a jump for joy with a burst, then
  home with 5 lives. Leaving mid-rest and coming back picks up at the right step.
- New moves: lie (down or back up), slump, daze, stars, drink. Squashes now keep the stem's foot on the
  ground.

### Jump feel
- **Squeeze and stretch forward** (`render/jump.ts`, drawing only): a tap flattens the mushroom for 50 ms
  from the very frame of the tap, then it springs long and thin along the jump, leaning right (forward).
  Upright again at the top of the arc, then it leans further right as the fall speeds up (dive, up to 75
  degrees). It never leans back to the left any more. The jump itself starts on the tap as before (Schell:
  answer within a tenth of a second; a crouch before the jump frustrates players).
- **New flap sound**: a soft squish, then a springy rising "boing" with a puff of air. Each flap is pitched
  a little up or down at random (6%) so a hundred flaps never sound like one recording (`PITCH_VARIATION`).
- avatars.html shows one flap frame by frame.

### Avatar with a face that acts
- **New look**: the "Button" mushroom Martin picked from four sketches: a wide round red cap with three white
  spots over a chubby white stem, smooth dark outlines, no gills. One drawing (`render/mushroom.ts`) is used in
  flight, on the home screen, on the scene stages and (as SVG) in the shop. The free skin is now CLASSIC RED.
- **Faces as data** (`config/expressions.ts`): neutral, happy, sad, exhausted, dozing, surprised, proud,
  nervous, dizzy. Each is a few numbers for eyes, eyelids, brows, mouth, cheeks and a sweat drop; faces ease
  into each other. Schell: faces carry the most emotion, and simple eyes and brows give it cheaply.
- **Animations as data** (`config/animations.ts`): a list of moves (hop, squash, spin, flash, wobble, shiver,
  lean, lie, breathe, burst, zzz, reveal) and face cues. `render/timeline.ts` turns one into a frame for any
  moment (pure, tested). A new animation is a new entry, not new code.
- **Scenes**: out of lives, the mushroom lies on its side, exhausted, breathing slowly, eyes falling shut now
  and then, "z z" rising, with the ad and the countdown underneath. An Adventure crash shows it dazed, then
  sad. Buying a skin or trail: crouch, jump into a spin (the face hides while its back turns), a flash and a
  burst of spores and light, the new look, then happy hops; the name appears at the reveal.
- **Cheer** on the level complete screen (big happy jumps). **Proud** on the home screen after a new badge
  (a hop, then chest out, chin up and a smirk for a few seconds; the home avatar can act out any animation
  through `Pose.act`). **Nervous** in flight while the Stone Thrower is in the fight (worried brows, wobbly
  mouth, a sweat drop; face only, so the flight looks and plays the same).
- **avatars.html** plays every animation and shows every face, for checking by eye (not linked in the game).
- The old resting-mushroom picture is gone.

### Settings, pixel icons, home avatar
- **Settings** (gear on the home screen): a music volume slider, off to 100%, heard while dragging and saved
  (save v7, default 70%). Sound effects keep their level; the speaker button still mutes everything.
  Music at 0 is stopped, not just silent.
- **Pixel icons**: hearts (full and empty), a gold coin with a rim, stamped ring and shine, and a brilliant-cut
  diamond (table, crown, girdle, pavilion). Defined once as data in `config/sprites.ts`, drawn on the canvas
  for pickups (the coin turns on its edge, the golden coin is the same coin, bigger, with sparkles; the
  diamond glints instead of spinning) and handed to CSS for the HUD, home screen stats and lives.
- **Home avatar**: the mushroom floats in the middle of the home screen, as big as the screen has room for
  (up to 1.7x), glances left and right with a small head turn, blinks (sometimes twice), and has a shine in
  its eyes. On tap it glides to its flight place. Drawing only (`render/avatar.ts`): the flight is untouched.
- **Fixed**: a page opened in a hidden or tiny window froze (a negative size in the background drawing
  stopped the loop). The loop now survives a bad frame.

### Polish and sound (after Martin played phases 1 to 4)
- **Endless is pure speed**: every gap is 132 px and still; only the speed rises (every 10 roots). Moving,
  breathing and tighter gaps, surges and wind are adventure-only. Waves in endless now only shape rewards
  (calm roots bring more pickups, no clearings in a surge). Leaderboard `rulesVersion` 2.
- **Near miss only when you live**: a root brushed closely becomes a near miss once you are past it alive,
  so a crash is never one. No slow motion and no shake any more (they broke the rhythm of flaps, Schell:
  direct feedback, no distractions); a gold ring, sparks streaming back and the text show it instead.
- **Adventure backdrops**: each level names a distant world in its data (forest, peaks, old town, towers,
  ruins, castle, windmills), drawn in the level's own colours with small lights in its accent colour.
- **Music**: Martin's two loops (xtremefreddy, Pixabay licence, free for games, no credit required; credited in
  CREDITS.md anyway). The calm one plays in menus, the faster one in flight, none during an ad; they crossfade
  between screens and are cut to whole musical phrases so they loop on the beat.
- **Sound for everything** (`audio/sounds.ts`, all synthesized): flap whoosh, metal coin, golden coin cascade,
  glassy diamond, shield and magnet pickups, near-miss swish, shield pop, crash thud, landing, wind gust,
  boss growl and throw, vein clink and shatter, milestone, finish fanfare, badge fanfare, quest, new best,
  level stars, new biome, shop purchase, menu click, error. The speaker button mutes all of it.
- **Fixed: no sound on iPhone.** iPhone Safari only starts audio from the end of a touch or a click; the game
  unlocked it at the start of a touch. Every finished touch now unlocks it (and resumes it after iOS
  interrupts it). Note: with the iPhone's silent switch on, iOS mutes web audio.

### Phase 4 changes
- **World and country leaderboard** for endless, opt-in: JOIN shows what is stored (name, country, best
  score, a random player number on the phone). Tabs World / country, your rank, report a name, change
  country or name, LEAVE deletes the entry. Privacy notice in PRIVACY.md.
- **Scores are checked by replay**: every round records its seed, screen size, start height and the step of
  every tap. The server replays the run with the same rules and accepts the score only if it matches exactly.
  To make that possible the flight rules use `core/fmath.ts` (exact on every device) instead of Math.sin etc.
- **Server** (`server/`): Vercel functions built in Vercel's Build Output format by `npm run build`, store in
  Upstash Redis. Rate limits per address; names checked (offensive words refused, 3 reports hide a name).
- **Offline-friendly**: the best run waits on the phone and is sent when the connection is back.
- **Save v6**: leaderboard state.
- **To turn it on** (done by Martin): Vercel dashboard, Integrations, Browse Marketplace, Upstash Redis (free
  plan), connect it to project sporeflightclaude, then redeploy. Check:
  https://sporeflightclaude.vercel.app/api/leaderboard shows `{"entries":[]...}` (before connecting it says
  `{"error":"offline"}`, which already proves the functions are deployed).

### Phase 3 changes
- **Endless biomes** (config/biomes.ts): a new world every 20 points, 8 in all: Dark Enchanted Forest,
  Twilight Woods, Morning Woodland, Sunlit Meadow, Dry Savanna, Desert Canyon, Highland Pass, Frozen Peaks.
  Each has colours, scenery, life in the air and its own obstacles. Colours blend over the 5 roots before
  a biome arrives, obstacles change exactly at its score, and its name is announced. Rules never change.
  A badge for reaching each biome. All eight are drawn in code in one flat, layered style (sky, sun or moon,
  distant and near silhouettes, hills, life in the air), so they match and blend into each other. The old
  painted forest pictures are gone (they ended in a hard edge and looked different from the rest).
- **Crystal veins**: gem clusters on a root cap facing the gap. Touching one bounces you off and cracks it;
  the third hit breaks it open for a diamond. Endless: root 20, then every 30. Adventure: one per level in
  the climax, replacing the diamond pickup (part of the third star).
- **Golden coin**: rare, huge, worth 10; a surprise in endless only (fixed levels stay the same).
- **Badges are honour**: no coins. Reach 10/20/50, each biome, near-miss master, diamond hunter, beat the
  Stone Thrower, finish level 10, 3 stars on one level, 3 stars everywhere. Four unlock a unique trail.
- **Glow trails**: bought with coins (60, 150) or diamonds (3), or earned with a badge.
- **Skins**: 50 / 120 / 250 coins; two premium skins for 5 and 10 diamonds.
- **Daily quests** pay 5 to 15 coins: reach 15 in endless, 5 coins in one run, 20 coins today, finish an
  Adventure level (only once Adventure is open), crack a crystal vein, 6 near misses, 100 flaps.
- **Save v5**: trails; quests reset to the new pool; removed badges dropped.

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
- Adventure unlock: 50 coins and 3 diamonds. Endless diamonds come at root 12, then every 20 (was 30 and 30).
  Magnets stay off the start (from root 40).
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
  (Later changed: endless gaps stay one size; see "Polish and sound".)
- **Milestones** at 10, 20, 30, 50, 75, 100: big number, burst and flash. No coins, the moment is the reward.
- **Feedback**: light column on every pass, score pop, near-miss sound and sparks (no coins),
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
- **Never trust a score from outside** (Pragmatic Programmer, Pragmatic Paranoia): the server replays every run.
- **Device-independent maths in the rules** (Ousterhout, define errors out of existence): instead of tolerating
  tiny differences between phones and server, the rules cannot produce them.
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
- The resting mushroom on the game over and adventure crash screens is now the animated avatar.

## Open questions for Martin
- **Leaderboard**: weekly board as well as all-time? (not built; the plan's default was all-time only)
- **Ad network**: AdMob (needs the app-store wrapper) or a web ad network for the browser version.
- **Balance** after playing: gap sizes per level, boss speed, Heart of the Storm's difficulty.

## Roadmap
Phases from the plan: 1 challenge and feel (done), 2 Adventure journey (done), 3 biomes and rewards (done),
4 leaderboard (live), 5 launch prep (real ads, PWA, app stores,
playtesting).
