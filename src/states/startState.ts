import type { State } from '../core/stateMachine';
import { flapPlayer } from '../gameplay/world';
import { byId, setText } from '../ui/dom';
import { showScreens } from '../ui/screens';
import type { GameContext } from './context';

const HOVER_SCROLL_SPEED = 40;

/** Title screen: the mushroom hovers while the forest drifts by. */
export function startState(ctx: GameContext): State {
  let time = 0;

  return {
    enter() {
      if (ctx.save.restUntil > 0) {
        ctx.go('gameOver');
        return;
      }
      ctx.world = ctx.newWorld();
      ctx.effects.clear();
      time = 0;
      setText(byId('start-best'), ctx.save.bestScore);
      setText(byId('start-coins'), ctx.save.coins);
      setText(byId('start-diamonds'), ctx.save.diamonds);
      setText(byId('start-lives'), ctx.save.lives);
      const last = byId('start-last');
      last.hidden = ctx.lastScore === null;
      setText(byId('start-last-score'), ctx.lastScore ?? 0);
      showScreens('start');
    },

    update(dt) {
      time += dt;
      const player = ctx.world.player;
      const home = ctx.world.height * 0.45;
      player.y = home + Math.sin(time * 2.5) * 6;
      ctx.world.distance += HOVER_SCROLL_SPEED * dt;
      ctx.effects.update(dt);
    },

    onTap() {
      ctx.go('playing');
      flapPlayer(ctx.world);
    },
  };
}
