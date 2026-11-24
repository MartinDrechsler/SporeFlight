import { ENDLESS_LEVEL_ID } from '../config/levels';
import { TUNING } from '../config/tuning';
import type { State } from '../core/stateMachine';
import { roundCoins, stepWorld } from '../gameplay/world';
import { bankRound } from '../meta/economy';
import { updateHud } from '../ui/hud';
import type { GameContext } from './context';
import { addQuest, checkAchievements, deliverEvents } from './round';

/**
 * The moment after a crash: the round's coins are banked, a life is lost
 * (in every mode), and a mushroom clump will grow where the mushroom fell.
 */
export function roundOverState(ctx: GameContext): State {
  let timeLeft = 0;

  return {
    enter() {
      const { world, save } = ctx;
      deliverEvents(ctx);
      const newBest = bankRound(save, {
        levelId: world.level.id,
        score: world.stats.score,
        coins: roundCoins(world),
        diamonds: world.stats.diamonds,
        distance: world.distance + world.player.x,
      });
      if (newBest && world.stats.score > 0) {
        ctx.effects.newBest(world.width, world.height);
        ctx.audio.ui('reward');
      }
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
      if (ctx.save.lives <= 0) ctx.go('gameOver');
      else ctx.go(ctx.world.level.id === ENDLESS_LEVEL_ID ? 'start' : 'adventureOver');
    },
  };
}
