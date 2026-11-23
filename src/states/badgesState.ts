import type { State } from '../core/stateMachine';
import { renderBadges } from '../ui/panels';
import { showScreens } from '../ui/screens';
import type { GameContext } from './context';
import { onBack } from './menu';

/** All achievements, earned and still to earn. */
export function badgesState(ctx: GameContext): State {
  onBack(ctx, 'screen-badges', 'start');
  return {
    enter() {
      renderBadges(ctx.save);
      showScreens('badges');
    },
  };
}
