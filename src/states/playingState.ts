import type { State } from '../core/stateMachine';
import { flapPlayer, stepWorld } from '../gameplay/world';
import { updateHud } from '../ui/hud';
import { showScreens } from '../ui/screens';
import type { GameContext } from './context';
import { checkAchievements, deliverEvents } from './round';

/** Active flight. Each step runs the rules, then lets everything else react. */
export function playingState(ctx: GameContext): State {
  return {
    enter() {
      ctx.effects.clear();
      showScreens('hud');
      updateHud(ctx.world, ctx.save);
    },

    update(dt) {
      stepWorld(ctx.world, dt);
      deliverEvents(ctx);
      checkAchievements(ctx);
      updateHud(ctx.world, ctx.save);
      if (ctx.world.crashed) ctx.go('roundOver');
    },

    onTap() {
      flapPlayer(ctx.world);
      deliverEvents(ctx);
    },
  };
}
