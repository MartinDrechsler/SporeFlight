import type { State } from '../core/stateMachine';
import { refillLives } from '../meta/economy';
import { showScreens } from '../ui/screens';
import { toast } from '../ui/toast';
import type { GameContext } from './context';
import { setAdError } from './gameOverState';

/** While a rewarded ad plays. The ad network draws the ad; lives come back when it ends or is skipped. */
export function adState(ctx: GameContext): State {
  return {
    enter() {
      setAdError(false);
      showScreens('ad');
      ctx.ads.show().then(
        (earned) => finish(earned),
        () => finish(false),
      );
    },
  };

  function finish(earned: boolean): void {
    if (ctx.current() !== 'ad') return;
    if (!earned) {
      ctx.go('gameOver');
      setAdError(true);
      return;
    }
    refillLives(ctx.save);
    ctx.persist();
    ctx.audio.ui('reward');
    toast(`+${ctx.save.lives} LIVES! READY TO FLY`);
    ctx.lastScore = null;
    ctx.go('start');
  }
}
