import { ENDLESS_LEVEL_ID } from '../config/levels';
import { TUNING } from '../config/tuning';
import type { State } from '../core/stateMachine';
import { roundCoins, stepWorld } from '../gameplay/world';
import { bankRound } from '../meta/economy';
import { updateHud } from '../ui/hud';
import type { GameContext } from './context';
import { addQuest, checkAchievements, deliverEvents } from './round';

/**
 * The moment after a crash: the round ends, its rewards are banked (an
 * endless round also costs a life), then the mushroom falls for a beat.
 */
export function roundOverState(ctx: GameContext): State {
  let timeLeft = 0;

  return {
    enter() {
      const { world, save } = ctx;
      deliverEvents(ctx);
      bankRound(save, {
        levelId: world.level.id,
        score: world.stats.score,
        coins: roundCoins(world),
        diamonds: world.stats.diamonds,
        distance: world.distance + world.player.x,
      });
      if (world.level.id !== ENDLESS_LEVEL_ID) addQuest(ctx, 'adventureRuns', 1);
      checkAchievements(ctx);
      ctx.persist();
      ctx.lastScore = world.stats.score;
      timeLeft = TUNING.roundOver.seconds;
      updateHud(world, save, { banked: true });
    },

    update(dt) {
      stepWorld(ctx.world, dt);
      ctx.world.events.length = 0;
      timeLeft -= dt;
      if (timeLeft > 0) return;
      if (ctx.world.level.id !== ENDLESS_LEVEL_ID) ctx.go('adventureOver');
      else ctx.go(ctx.save.lives > 0 ? 'start' : 'gameOver');
    },
  };
}
