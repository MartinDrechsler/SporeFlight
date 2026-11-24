import { skinById } from '../config/skins';
import { trailById } from '../config/trails';
import type { State } from '../core/stateMachine';
import { buyLook, selectLook } from '../meta/economy';
import { AvatarStage } from '../ui/avatarStage';
import { byId, setText } from '../ui/dom';
import { renderShop, type ShopItem } from '../ui/panels';
import { showScreens } from '../ui/screens';
import type { GameContext } from './context';
import { onBack } from './menu';

/** Buy and wear mushroom colours and glow trails. A new look is shown off with a little performance. */
export function shopState(ctx: GameContext): State {
  onBack(ctx, 'screen-shop', 'start');
  const reveal = byId('shop-reveal');
  const name = byId('reveal-name');
  const stage = new AvatarStage(byId<HTMLCanvasElement>('reveal-stage'), { skin: skinById(ctx.save.activeSkin) });
  byId('reveal-done').addEventListener('click', () => {
    ctx.audio.ui('click');
    reveal.hidden = true;
  });

  /** Spin, burst, reveal: the old look turns into the new one, then a happy hop. */
  const showOff = (item: ShopItem, skinBefore: string): void => {
    const skin = skinById(skinBefore);
    const look =
      item.kind === 'skin'
        ? { skin, newSkin: skinById(item.id), trail: trailById(ctx.save.activeTrail) }
        : { skin, trail: trailById(item.id), trailIsNew: true };
    setText(name, item.name);
    name.classList.add('pending');
    reveal.hidden = false;
    stage.play('reveal', look, () => {
      name.classList.remove('pending');
      ctx.audio.ui('achievement');
    });
  };

  const render = (): void =>
    renderShop(
      ctx.save,
      (item) => {
        const skinBefore = ctx.save.activeSkin;
        if (buyLook(ctx.save, item.kind, item.id) === 'bought') {
          ctx.audio.ui('buy');
          ctx.persist();
          showOff(item, skinBefore);
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
      reveal.hidden = true;
      render();
      showScreens('shop');
    },

    update(dt) {
      if (!reveal.hidden) stage.update(dt);
    },
  };
}
