import type { State } from '../core/stateMachine';
import { grantAdLives } from '../meta/economy';
import { byId, setText } from '../ui/dom';
import { showScreens } from '../ui/screens';
import { toast } from '../ui/toast';
import type { GameContext } from './context';
import { setAdError } from './gameOverState';

/** While a rewarded ad plays. Lives are granted only if it was watched to the end. */
export function adState(ctx: GameContext, expectedSeconds: number): State {
  let timeLeft = 0;

  return {
    enter() {
      timeLeft = expectedSeconds;
      setAdError(false);
      showScreens('ad');
      ctx.ads.show().then(
        (watched) => finish(watched),
        () => finish(false),
      );
    },

    update(dt) {
      timeLeft = Math.max(0, timeLeft - dt);
      setText(byId('ad-timer'), Math.ceil(timeLeft));
    },
  };

  function finish(watched: boolean): void {
    if (ctx.current() !== 'ad') return;
    if (!watched) {
      ctx.go('gameOver');
      setAdError(true);
      return;
    }
    grantAdLives(ctx.save);
    ctx.persist();
    ctx.audio.ui('reward');
    toast(`+${ctx.save.lives} LIVES! READY TO FLY`);
    ctx.lastScore = null;
    ctx.go('start');
  }
}
