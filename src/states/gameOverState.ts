import { TUNING } from '../config/tuning';
import type { State } from '../core/stateMachine';
import { writeSave } from '../core/save';
import { byId, setText } from '../ui/dom';
import { showScreens } from '../ui/screens';
import type { GameContext } from './context';

/**
 * Out of lives: the mushroom rests until lives refill. Resting uses the real
 * clock on purpose, so it keeps counting while the app is closed, and the
 * end time is saved so a reload cannot skip it.
 */
export function gameOverState(ctx: GameContext): State {
  return {
    enter() {
      if (ctx.save.restUntil === 0) {
        ctx.save.restUntil = ctx.now() + TUNING.session.restSeconds * 1000;
        writeSave(ctx.store, ctx.save);
      }
      setText(byId('gameover-score'), ctx.lastScore ?? 0);
      setText(byId('gameover-best'), ctx.save.bestScore);
      showScreens('gameOver');
    },

    update(dt) {
      ctx.effects.update(dt);
      const msLeft = ctx.save.restUntil - ctx.now();
      if (msLeft > 0) {
        setText(byId('gameover-timer'), formatSeconds(Math.ceil(msLeft / 1000)));
        return;
      }
      ctx.save.lives = TUNING.session.lives;
      ctx.save.restUntil = 0;
      writeSave(ctx.store, ctx.save);
      ctx.lastScore = null;
      ctx.go('start');
    },
  };
}

function formatSeconds(total: number): string {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
