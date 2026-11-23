import { TUNING } from '../config/tuning';
import type { State } from '../core/stateMachine';
import { writeSave } from '../core/save';
import { stepWorld } from '../gameplay/world';
import { updateHud } from '../ui/hud';
import { showScreens } from '../ui/screens';
import type { GameContext } from './context';

/**
 * The moment after a crash: the round's rewards are banked and one life is
 * lost, then the mushroom falls for a beat before the next screen.
 */
export function roundOverState(ctx: GameContext): State {
  let timeLeft = 0;

  return {
    enter() {
      const { world, save } = ctx;
      save.coins += world.coins;
      save.diamonds += world.diamonds;
      save.bestScore = Math.max(save.bestScore, world.score);
      save.lives = Math.max(0, save.lives - 1);
      writeSave(ctx.store, save);

      ctx.lastScore = world.score;
      timeLeft = TUNING.roundOver.seconds;
      showScreens('hud');
      updateHud(world, save.lives, save.coins - world.coins);
    },

    update(dt) {
      stepWorld(ctx.world, dt);
      ctx.world.events.length = 0;
      ctx.effects.update(dt);
      timeLeft -= dt;
      if (timeLeft > 0) return;
      ctx.go(ctx.save.lives > 0 ? 'start' : 'gameOver');
    },
  };
}
