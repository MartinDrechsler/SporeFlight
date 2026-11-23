import { byId } from '../ui/dom';
import type { GameContext, StateName } from './context';

/** Wires the BACK / CANCEL buttons of a menu screen. */
export function onBack(ctx: GameContext, screenId: string, target: StateName): void {
  for (const back of byId(screenId).querySelectorAll<HTMLButtonElement>('.back-button')) {
    back.addEventListener('click', () => {
      ctx.audio.ui('click');
      ctx.go(target);
    });
  }
}
