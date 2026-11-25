import { levelNumber } from '../meta/adventure';
import { ENDLESS_LEVEL_ID } from '../config/levels';
import { THEMES } from '../config/theme';
import { TUNING } from '../config/tuning';
import { courseProgress } from '../gameplay/course';
import { roundCoins, type World } from '../gameplay/world';
import type { SaveData } from '../core/save';
import { byId, setText } from './dom';
import { showHearts } from './icons';

/**
 * The in-game display. During a round, totals are the saved amount plus what
 * the round has earned so far; once `banked`, the save already includes it.
 */
export function updateHud(world: World, save: SaveData, options: { banked: boolean } = { banked: false }): void {
  const endless = world.level.id === ENDLESS_LEVEL_ID;
  const pending = options.banked ? 0 : 1;
  setText(byId('hud-score'), world.stats.score);
  setText(byId('hud-coins'), save.coins + pending * roundCoins(world));
  setText(byId('hud-diamonds'), save.diamonds + pending * world.stats.diamonds);
  setText(byId('hud-best'), save.bestScore);
  byId('hud-best-stat').hidden = !endless;
  // In a level the level badge takes the name's place; small phones have no room for both.
  const username = byId('hud-username');
  username.hidden = !endless;
  setText(username, save.username ?? TUNING.session.defaultUsername);

  showHearts(byId('hud-lives'), save.lives);

  const levelBadge = byId('hud-level');
  levelBadge.hidden = endless;
  setText(levelBadge, levelNumber(world.level.id) > 0 ? `LEVEL ${levelNumber(world.level.id)}` : 'SECRET');
  levelBadge.style.setProperty('--level-color', THEMES[world.level.theme].accent);
  const progress = byId('hud-progress');
  progress.hidden = endless;
  progress.style.setProperty('--level-color', THEMES[world.level.theme].accent);
  byId('hud-progress-bar').style.width = `${courseProgress(world) * 100}%`;

  popOnChange(byId('hud-score'), world.stats.score);

  byId('hud-shield').hidden = !world.shield;
  const magnet = byId('hud-magnet');
  magnet.hidden = world.magnetTime <= 0;
  byId('hud-magnet-bar').style.width = `${(world.magnetTime / TUNING.magnet.seconds) * 100}%`;
}

/** Restarts a short "pop" animation whenever a number changes. */
function popOnChange(element: HTMLElement, value: number): void {
  if (element.dataset.value === String(value)) return;
  element.dataset.value = String(value);
  element.classList.remove('pop');
  void element.offsetWidth;
  element.classList.add('pop');
}
