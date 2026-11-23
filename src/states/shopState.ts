import type { State } from '../core/stateMachine';
import { buySkin, selectSkin } from '../meta/economy';
import { renderShop } from '../ui/panels';
import { showScreens } from '../ui/screens';
import type { GameContext } from './context';
import { onBack } from './menu';

/** Buy and choose mushroom skins with coins. */
export function shopState(ctx: GameContext): State {
  onBack(ctx, 'screen-shop', 'start');

  const render = (): void =>
    renderShop(
      ctx.save,
      (skin) => {
        if (buySkin(ctx.save, skin.id) === 'bought') {
          ctx.audio.ui('buy');
          ctx.persist();
        } else {
          ctx.audio.ui('error');
        }
        render();
      },
      (skin) => {
        selectSkin(ctx.save, skin.id);
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
