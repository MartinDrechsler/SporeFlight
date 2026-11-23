import type { State } from '../core/stateMachine';
import { byId, setText } from '../ui/dom';
import { clearHudEffects } from '../ui/hud';
import { showScreens } from '../ui/screens';
import type { GameContext } from './context';

/** Out of lives. The only way back into the air is watching a rewarded ad. */
export function gameOverState(ctx: GameContext): State {
  byId('watch-ad-button').addEventListener('click', () => {
    ctx.audio.unlock();
    ctx.audio.ui('click');
    ctx.go('ad');
  });

  return {
    enter() {
      clearHudEffects();
      setText(byId('gameover-score'), ctx.lastScore ?? 0);
      setText(byId('gameover-best'), ctx.save.bestScore);
      showScreens('gameOver');
    },
  };
}

/** Shows or hides the "ad failed" message on the game over screen. */
export function setAdError(visible: boolean): void {
  byId('ad-error').hidden = !visible;
}
