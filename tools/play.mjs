/**
 * Plays the game in a phone-sized browser and saves screenshots to shots/.
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
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const advance = (ms) => page.evaluate((t) => window.advanceTime(t), ms);
// Overlays fade in over real time, so let CSS animations finish before capturing.
const shot = async (name) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path: `shots/${tag}-${name}.png` });
};
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok, detail });

await page.goto(`${url}?test=1&seed=12345`);
await advance(500);
await shot('1-start');
check('starts on start screen', (await state()).state === 'start');

await page.tap('#start-button');
await advance(50);
check('start button begins play', (await state()).state === 'playing');

// Autopilot: flap whenever below the next gap centre.
let maxScore = 0;
for (let i = 0; i < 600; i++) {
  await page.evaluate(() => {
    const s = JSON.parse(window.render_game_to_text());
    const next = s.roots.find((r) => r.x + 65 > s.player.x - 18);
    const target = next ? next.gapCenter + 10 : s.field.height * 0.45;
    if (s.player.y > target && s.player.vy > 0) window.__test.flap();
    window.advanceTime(1000 / 30);
  });
  const s = await state();
  maxScore = Math.max(maxScore, s.round.score);
  if (i === 150) await shot('2-playing');
  if (s.state !== 'playing') break;
}
check('scores while flying', maxScore > 0, `max score ${maxScore}`);

// Stop flapping until the round ends.
await advance(4000);
await shot('3-after-crash');
const afterCrash = await state();
check('crash costs a life', afterCrash.save.lives === 4, `lives ${afterCrash.save.lives}`);
check('back to start after crash', afterCrash.state === 'start');

// Lose the remaining lives.
for (let life = 0; life < 4; life++) {
  await page.evaluate(() => window.__test.tap());
  await advance(4000);
}
await shot('4-game-over');
const over = await state();
check('out of lives shows game over', over.state === 'gameOver');

await page.evaluate(() => window.__test.finishRest());
await advance(100);
const rested = await state();
check('resting refills lives', rested.state === 'start' && rested.save.lives === 5);

await page.reload();
await advance(200);
check('progress survives reload', (await state()).save.bestScore >= maxScore);

check('no console errors', errors.length === 0, errors.join(' | '));
await browser.close();

for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? `  (${c.detail})` : ''}`);
process.exit(checks.every((c) => c.ok) ? 0 : 1);
