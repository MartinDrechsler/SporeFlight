import { ENDLESS_LEVEL_ID } from '../config/levels';
import { THEMES } from '../config/theme';
import { TUNING } from '../config/tuning';
import { isFever } from '../gameplay/combo';
import { roundCoins, type World } from '../gameplay/world';
import type { SaveData } from '../core/save';
import { byId, setText } from './dom';

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
  setText(byId('hud-best'), endless ? save.bestScore : (save.levelBest[world.level.id] ?? 0));
  setText(byId('hud-username'), save.username ?? TUNING.session.defaultUsername);

  const lives = byId('hud-lives');
  lives.hidden = !endless;
  setText(lives, hearts(save.lives));

  const levelBadge = byId('hud-level');
  levelBadge.hidden = endless;
  setText(levelBadge, `LEVEL ${world.level.id}`);
  levelBadge.style.setProperty('--level-color', THEMES[world.level.theme].accent);

  const fever = isFever(world.combo) && !world.crashed;
  const combo = byId('hud-combo');
  combo.hidden = world.combo.multiplier <= 1;
  setText(combo, fever ? `FEVER x${world.combo.multiplier}` : `COMBO x${world.combo.multiplier}`);
  combo.classList.toggle('fever', fever);
  byId('game').classList.toggle('fever', fever);

  byId('hud-shield').hidden = !world.shield;
  const magnet = byId('hud-magnet');
  magnet.hidden = world.magnetTime <= 0;
  byId('hud-magnet-bar').style.width = `${(world.magnetTime / TUNING.magnet.seconds) * 100}%`;
}

export function hearts(lives: number): string {
  const slots = Math.max(TUNING.session.heartSlots, lives);
  return '♥'.repeat(lives) + '♡'.repeat(slots - lives);
}

/** Removes in-game decorations when leaving play. */
export function clearHudEffects(): void {
  byId('game').classList.remove('fever');
}
