import type { State } from '../core/stateMachine';
import { buyLook, selectLook } from '../meta/economy';
import { renderShop } from '../ui/panels';
import { showScreens } from '../ui/screens';
import type { GameContext } from './context';
import { onBack } from './menu';

/** Buy and wear mushroom colours and glow trails. */
export function shopState(ctx: GameContext): State {
  onBack(ctx, 'screen-shop', 'start');

  const render = (): void =>
    renderShop(
      ctx.save,
      (item) => {
        if (buyLook(ctx.save, item.kind, item.id) === 'bought') {
          ctx.audio.ui('buy');
          ctx.persist();
        } else {
          ctx.audio.ui('error');
        }
        render();
      },
      (item) => {
        selectLook(ctx.save, item.kind, item.id);
        ctx.audio.ui('click');
        ctx.persist();
        render();
      },
    );

  return {
    enter() {
      render();
      showScreens('shop');
    },
  };
}
