/**
 * Plays every screen of the game in a phone-sized browser, checks the flows
 * and saves screenshots to shots/.
 *
 *   npm run dev                         (in one terminal)
 *   npm run play -- http://localhost:5173/ [device]
 *
 * device defaults to "iPhone 13". Set CHROME_PATH to use an installed Chrome
 * when Playwright cannot download its own browser.
 * Gameplay is driven through the test hooks (?test=1), not real-time taps,
 * so every run is exact and repeatable.
 */
import { mkdirSync } from 'node:fs';
import { chromium, devices } from 'playwright';

const [url = 'http://localhost:5173/', deviceName = 'iPhone 13'] = process.argv.slice(2);
const device = devices[deviceName];
if (!device) throw new Error(`Unknown device "${deviceName}"`);

mkdirSync('shots', { recursive: true });
const tag = deviceName.replace(/\s+/g, '-').toLowerCase();
const launchOptions = { args: ['--no-sandbox'] };
if (process.env.CHROME_PATH) launchOptions.executablePath = process.env.CHROME_PATH;

const browser = await chromium.launch(launchOptions);
const page = await (await browser.newContext({ ...device })).newPage();
const errors = [];
// The browser logs every failed request; the one the harness causes on purpose (a 503 while
// simulating the leaderboard offline) is expected, everything else counts.
let expectedFailures = 0;
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  if (expectedFailures > 0 && m.text().includes('status of 503')) {
    expectedFailures -= 1;
    return;
  }
  errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const advance = (ms) => page.evaluate((t) => window.advanceTime(t), ms);
const test = (fn, arg) => page.evaluate(fn, arg);
// Overlays fade in over real time, so let CSS animations finish before capturing.
const shot = async (name) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path: `shots/${tag}-${name}.png` });
};
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok, detail });
const tapButton = async (selector) => {
  await page.tap(selector);
  await advance(50);
};

/** Flies with a simple autopilot for up to `frames` steps of 1/30 s. Returns the best score seen. */
async function fly(frames, snapshotAt = -1, snapshotName = '') {
  let best = 0;
  for (let i = 0; i < frames; i++) {
    const s = await test(() => {
      const s = JSON.parse(window.render_game_to_text());
      const next = s.roots.find((r) => r.right > s.player.x - s.player.radius);
      const target = next ? next.gapCenter + 10 : s.field.height * 0.45;
      if (s.player.y > target && s.player.vy > 0) window.__test.flap();
      window.advanceTime(1000 / 30);
      return JSON.parse(window.render_game_to_text());
    });
    best = Math.max(best, s.round.score);
    if (i === snapshotAt) await shot(snapshotName);
    if (s.state !== 'playing') break;
  }
  return best;
}

// 1. First launch asks for a name.
await page.goto(`${url}?test=1&seed=12345`);
await advance(300);
check('first launch asks for a name', (await state()).state === 'username');
await shot('01-username');
await page.fill('#username-input', 'martin');
await tapButton('#username-form button');
let s = await state();
check('name saved, start screen shown', s.state === 'start' && s.save.username === 'martin');
check('daily quests created', s.save.quests.list.length === 3);
await shot('02-start');

// 2. Endless round.
await tapButton('#start-button');
check('start button begins play', (await state()).state === 'playing');
await test(() => window.__test.setSave({}));
const maxScore = await fly(900, 200, '03-playing');
check('scores while flying', maxScore > 0, `max score ${maxScore}`);
// Without flapping, the mushroom soon crashes.
for (let i = 0; i < 100 && (await state()).state === 'playing'; i++) await advance(1000 / 30);
s = await state();
check('no clump while the mushroom is still falling', s.state === 'roundOver' && s.round.landedTime === null && s.save.deathMarks['0']?.length === 1, `landed ${s.round.landedTime}`);
for (let i = 0; i < 60 && (await state()).round.landedTime === null; i++) await advance(50);
await advance(400);
s = await state();
check('waits on the ground while the clump grows', s.state === 'roundOver' && s.round.landedTime > 0.3, `${s.state} ${s.round.landedTime}`);
await shot('03b-clump-growing');
await advance(3000);
s = await state();
check('crash costs a life', s.save.lives === 4, `lives ${s.save.lives}`);
check('back to start after crash', s.state === 'start');
check('crash spot remembered', s.save.deathMarks['0']?.length === 1);
await shot('04-start-after-round');

// 3. Out of lives: rest one minute, or watch a short ad.
async function loseAllLives() {
  for (let life = 0; life < 5; life++) {
    await test(() => window.__test.tap());
    await advance(4000);
  }
}
await loseAllLives();
s = await state();
check('out of lives shows the rest screen', s.state === 'gameOver' && s.save.lives === 0, `${s.state} lives ${s.save.lives}`);
await advance(20000);
s = await state();
check('rest counts down while open', s.state === 'gameOver' && s.save.restSecondsLeft < 45, `left ${s.save.restSecondsLeft}`);
await shot('05-game-over');
await advance(41000);
s = await state();
check('resting refills lives', s.state === 'start' && s.save.lives === 5, `${s.state} lives ${s.save.lives}`);
await loseAllLives();
await tapButton('#watch-ad-button');
await page.waitForTimeout(100); // the test ad resolves on the next tick
await advance(50);
s = await state();
check('watching the ad gives 5 lives', s.state === 'start' && s.save.lives === 5, `${s.state} lives ${s.save.lives}`);

// 4. Shop.
await test(() => window.__test.setSave({ coins: 60, diamonds: 3 }));
await tapButton('#menu-shop');
check('shop opens', (await state()).state === 'shop');
await shot('06-shop');
// Row 1 is the MUSHROOMS heading, row 2 the free skin, row 3 the first one to buy.
await page.tap('#shop-list li:nth-child(3) button');
s = await state();
check('buying a skin spends coins and wears it', s.save.activeSkin === 'emerald' && s.save.coins === 10);
check('a new skin is shown off', await page.isVisible('#shop-reveal'));
await advance(600);
await shot('06c-reveal-spin');
await advance(1400);
check('the new look is named once revealed', !(await page.getAttribute('#reveal-name', 'class')).includes('pending'));
await shot('06d-reveal-done');
await tapButton('#reveal-done');
check('the reveal closes', !(await page.isVisible('#shop-reveal')));
await page.tap('#shop-list li:has-text("STARDUST") button');
s = await state();
check('buying a trail with diamonds wears it', s.save.activeTrail === 'stardust' && s.save.diamonds === 0);
await advance(2500);
await shot('06e-reveal-trail');
await tapButton('#reveal-done');
await page.evaluate(() => document.querySelector('#shop-list li:has(.trail-preview)')?.scrollIntoView());
await shot('06b-shop-trails');
await test(() => window.__test.setSave({ diamonds: 0 }));
await tapButton('#screen-shop .back-button');

// 5. Badges.
await tapButton('#menu-badges');
check('badges open', (await state()).state === 'badges');
await shot('07-badges');
await tapButton('#screen-badges .back-button');

// 5b. Settings: the music slider sets and saves the music volume.
await tapButton('#settings-button');
check('settings open', (await state()).state === 'settings');
await page.evaluate(() => {
  const slider = document.getElementById('music-volume');
  slider.value = '40';
  slider.dispatchEvent(new Event('input'));
  slider.dispatchEvent(new Event('change'));
});
s = await state();
check('the music slider sets and saves the volume', s.save.musicVolume === 0.4 && (await page.textContent('#music-volume-value')) === '40%');
await shot('07b-settings');
await tapButton('#screen-settings .back-button');

// 6. Quests: finish the first one and claim it.
await test(() => {
  const save = JSON.parse(window.render_game_to_text()).save;
  save.quests.list[0].progress = 999;
  window.__test.setSave({ quests: save.quests });
});
await tapButton('#menu-quests');
await shot('08-quests');
const coinsBefore = (await state()).save.coins;
await page.tap('#quests-list li:first-child .item-button');
s = await state();
check('claiming a quest pays coins once', s.save.coins > coinsBefore && s.save.quests.list[0].claimed);
await tapButton('#screen-quests .back-button');

// 6b. Leaderboard: a stand-in server answers /api, so the screens and flows can be checked.
const posted = [];
let apiDown = false;
await page.route('**/api/**', async (route) => {
  // Without storage connected, the real server answers 503 'offline'.
  if (apiDown) {
    expectedFailures += 1;
    return route.fulfill({ status: 503, json: { error: 'offline' } });
  }
  const url = new URL(route.request().url());
  if (url.pathname === '/api/scores') {
    posted.push(JSON.parse(route.request().postData() ?? '{}'));
    return route.fulfill({ json: { best: posted.at(-1).score, rank: 3, countryRank: 1 } });
  }
  if (url.pathname === '/api/forget') return route.fulfill({ json: { ok: true } });
  const you = url.searchParams.get('player') !== null;
  return route.fulfill({
    json: {
      entries: [
        { rank: 1, pub: 'a'.repeat(20), name: 'Mia', country: 'CH', score: 61, you: false },
        { rank: 2, pub: 'b'.repeat(20), name: 'Jonas', country: 'DE', score: 44, you: false },
        { rank: 3, pub: 'c'.repeat(20), name: 'martin', country: 'CH', score: 5, you },
      ],
      you: you ? { rank: 3, score: 5 } : null,
      detectedCountry: 'CH',
    },
  });
});
await test(() => window.__test.setSave({ leaderboard: { playerId: null, country: null, best: null, sent: null, nameRefused: false } }));
await test(() => window.__test.go('start'));
// A run first, so there is a best run to send when joining.
await test(() => window.__test.tap());
await fly(200);
for (let i = 0; i < 100 && (await state()).state === 'playing'; i++) await advance(1000 / 30);
await advance(4000);
s = await state();
check('the best endless run is kept with its record', s.save.leaderboard.best?.run.taps.length > 0, JSON.stringify(s.save.leaderboard.best?.score));
check('nothing is sent before joining', posted.length === 0);
await tapButton('#menu-ranks');
await page.waitForTimeout(150);
check('leaderboard shows the world top before joining', (await page.locator('#ranks-list li').count()) === 3 && (await page.isVisible('#ranks-join')));
check('the country is suggested from the connection', (await page.inputValue('#ranks-join-country')) === 'CH');
await shot('08b-leaderboard-join');
await tapButton('#ranks-join-button');
await page.waitForTimeout(150);
s = await state();
check('joining sends the best run with name and country', posted.length === 1 && posted[0].country === 'CH' && posted[0].run.taps.length > 0 && s.save.leaderboard.sent?.score === posted[0].score);
check('after joining, your row and rank show', (await page.isVisible('#ranks-member')) && (await page.isVisible('#ranks-list li.you')));
await shot('08c-leaderboard');
await tapButton('#ranks-tab-country');
await page.waitForTimeout(150);
check('the country board opens', (await page.textContent('#ranks-tab-country')).includes('CH'));
await tapButton('#ranks-leave');
await tapButton('#ranks-leave');
await page.waitForTimeout(150);
s = await state();
check('leaving deletes the entry and the player id', s.save.leaderboard.playerId === null && (await page.isVisible('#ranks-join')));
apiDown = true;
await tapButton('#ranks-tab-world');
await page.waitForTimeout(150);
check('offline, the leaderboard says so instead of failing', (await page.textContent('#ranks-status')).includes("CAN'T BE REACHED"));
await tapButton('#screen-ranks .back-button');
apiDown = false;
await test(() => window.__test.setSave({ lives: 5 }));

// 7. Adventure: unlock with coins and diamonds, open the map, fly level 1, crash.
await tapButton('#menu-adventure');
check('adventure asks to unlock first', (await state()).state === 'unlock');
await tapButton('#unlock-confirm');
check('cannot unlock without enough coins and diamonds', (await state()).state === 'unlock');
await test(() => window.__test.setSave({ coins: 80, diamonds: 3 }));
await test(() => window.__test.go('unlock'));
await advance(50);
await shot('09-unlock');
await tapButton('#unlock-confirm');
s = await state();
check('adventure unlocked for 50 coins and 3 diamonds', s.state === 'levels' && s.save.adventureUnlocked && s.save.coins === 30 && s.save.diamonds === 0);
await shot('10-map');
await page.tap('.map-node >> nth=1');
await advance(50);
check('a locked level cannot be started', (await state()).state === 'levels' && !(await page.isVisible('#map-play')));
await page.tap('.map-node >> nth=0');
await advance(50);
await tapButton('#map-play');
s = await state();
check('level 1 starts from the map', s.state === 'playing' && s.level.id === 1);
await fly(400, 60, '11-level-1');
for (let i = 0; i < 100 && (await state()).state === 'playing'; i++) await advance(1000 / 30);
await advance(3000);
s = await state();
check('adventure crash costs a life and marks the level', s.state === 'adventureOver' && s.save.lives === 4 && s.save.deathMarks['1']?.length === 1, `lives ${s.save.lives}`);
await shot('12-adventure-over');
await tapButton('#adventure-retry');
check('retry restarts the same level', (await state()).level.id === 1);

// 8. Fly level 1 to its finish gate (invulnerable): stars fly in and level 2 opens.
await test(() => window.__test.invulnerable(true));
for (let i = 0; i < 120 && (await state()).state === 'playing'; i++) await fly(30);
await advance(1600);
s = await state();
check('the finish gate completes the level', s.state === 'levelComplete' && (s.save.levelStars['1'] ?? 0) >= 1, `${s.state}`);
await shot('12b-level-complete');
await tapButton('#complete-map');
s = await state();
check('the map shows level 2 open next', s.state === 'levels' && (await page.isVisible('.map-node.current')));
await shot('12c-map-progress');

// 9. Every adventure level looks right mid-flight (all open, invulnerable to reach later parts).
await test(() => window.__test.setSave({ levelStars: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1 } }));
for (const id of [2, 3, 4, 5, 6, 7, 8, 9, 10]) {
  await test(() => window.__test.go('levels'));
  await advance(50);
  await page.tap(`.map-node >> nth=${id - 1}`);
  await advance(50);
  await tapButton('#map-play');
  await test(() => window.__test.invulnerable(true));
  await fly(150);
  await shot(`13-level-${id}`);
}

// 10. Progress survives a reload.
await test(() => window.__test.go('start'));
await page.reload();
await advance(200);
s = await state();
check('progress survives reload', s.state === 'start' && s.save.username === 'martin' && s.save.bestScore >= maxScore && s.save.activeSkin === 'emerald');

check('no console errors', errors.length === 0, errors.join(' | '));
await browser.close();

for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? `  (${c.detail})` : ''}`);
process.exit(checks.every((c) => c.ok) ? 0 : 1);
