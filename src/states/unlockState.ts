import { ADVENTURE_UNLOCK_COST } from '../config/levels';
import type { State } from '../core/stateMachine';
import { canUnlockAdventure, unlockAdventure } from '../meta/economy';
import { byId, setText } from '../ui/dom';
import { showScreens } from '../ui/screens';
import { toast } from '../ui/toast';
import type { GameContext } from './context';
import { onBack } from './menu';

/** Offer to unlock adventure mode for its price. */
export function unlockState(ctx: GameContext): State {
  onBack(ctx, 'screen-unlock', 'start');
  byId('unlock-confirm').addEventListener('click', () => {
    if (!unlockAdventure(ctx.save)) {
      ctx.audio.ui('error');
      toast('NOT ENOUGH COINS OR DIAMONDS');
      return;
    }
    ctx.persist();
    ctx.audio.ui('reward');
    ctx.go('levels');
  });

  return {
    enter() {
      const { coins, diamonds } = ADVENTURE_UNLOCK_COST;
      setText(byId('unlock-cost'), coins === 0 && diamonds === 0 ? 'FREE' : `${coins} COINS + ${diamonds} DIAMONDS`);
      setText(byId('unlock-have'), `${ctx.save.coins} COINS + ${ctx.save.diamonds} DIAMONDS`);
      byId<HTMLButtonElement>('unlock-confirm').classList.toggle('disabled', !canUnlockAdventure(ctx.save));
      showScreens('unlock');
    },
  };
}
