import type { State } from '../core/stateMachine';
import { flapPlayer, stepWorld } from '../gameplay/world';
import { updateHud } from '../ui/hud';
import { showScreens } from '../ui/screens';
import type { GameContext } from './context';

/** Active flight. Each step runs the rules, then lets sound, effects and HUD react. */
export function playingState(ctx: GameContext): State {
  const deliverEvents = (): void => {
    const { world } = ctx;
    for (const event of world.events) {
      ctx.audio.react(event);
      ctx.effects.react(event, world.player.x, world.player.y);
    }
    world.events.length = 0;
  };

  return {
    enter() {
      showScreens('hud');
      deliverEvents();
      updateHud(ctx.world, ctx.save.lives, ctx.save.coins);
    },

    update(dt) {
      stepWorld(ctx.world, dt);
      deliverEvents();
      ctx.effects.update(dt);
      updateHud(ctx.world, ctx.save.lives, ctx.save.coins);
      if (ctx.world.crashed) ctx.go('roundOver');
    },

    onTap() {
      flapPlayer(ctx.world);
      deliverEvents();
    },
  };
}
