import { TUNING } from '../config/tuning';
import { isFever } from '../gameplay/combo';
import type { World } from '../gameplay/world';
import { byId, setText } from './dom';

/** The in-game display: score, lives, coins and the combo badge. */
export function updateHud(world: World, lives: number, bankedCoins: number): void {
  setText(byId('hud-score'), world.score);
  setText(byId('hud-coins'), bankedCoins + world.coins);
  setText(byId('hud-lives'), '♥'.repeat(lives) + '♡'.repeat(Math.max(0, TUNING.session.lives - lives)));

  const combo = byId('hud-combo');
  combo.hidden = world.combo.multiplier <= 1;
  setText(combo, isFever(world.combo) ? `FEVER x${world.combo.multiplier}` : `x${world.combo.multiplier}`);
  combo.classList.toggle('fever', isFever(world.combo));
}
