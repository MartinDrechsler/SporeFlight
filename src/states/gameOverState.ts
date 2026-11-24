import type { State } from '../core/stateMachine';
import { rest } from '../meta/economy';
import { byId, setText } from '../ui/dom';
import { showScreens } from '../ui/screens';
import { toast } from '../ui/toast';
import type { GameContext } from './context';

/**
 * Out of lives. The player chooses: rest one minute (counting only while the
 * game is open) or watch a short ad to fly again right away.
 */
export function gameOverState(ctx: GameContext): State {
  let sinceSave = 0;

  byId('watch-ad-button').addEventListener('click', () => {
    ctx.audio.unlock();
    ctx.audio.ui('click');
    ctx.persist();
    ctx.go('ad');
  });

  return {
    enter() {
      sinceSave = 0;
      setText(byId('gameover-score'), ctx.lastScore ?? 0);
      setText(byId('gameover-best'), ctx.save.bestScore);
      paintTimer(ctx.save.restSecondsLeft);
      showScreens('gameOver');
    },

    update(dt) {
      const rested = rest(ctx.save, dt);
      paintTimer(ctx.save.restSecondsLeft);
      // Save the countdown now and then, so closing the game keeps the progress.
      sinceSave += dt;
      if (sinceSave >= 1 || rested) {
        sinceSave = 0;
        ctx.persist();
      }
      if (!rested) return;
      ctx.audio.ui('reward');
      toast(`RESTED! +${ctx.save.lives} LIVES`);
      ctx.lastScore = null;
      ctx.go('start');
    },
  };
}

function paintTimer(seconds: number): void {
  const total = Math.ceil(seconds);
  setText(byId('gameover-timer'), `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`);
}

/** Shows or hides the "ad failed" message on the game over screen. */
export function setAdError(visible: boolean): void {
  byId('ad-error').hidden = !visible;
}
