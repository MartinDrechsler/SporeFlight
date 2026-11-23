import { byId } from '../ui/dom';
import type { GameContext } from './context';

const HOVER_SCROLL_SPEED = 40;
const BOB_AMPLITUDE = 6;
const BOB_SPEED = 2.5;

/**
 * Idle animation on menu screens: the mushroom bobs in the empty slot the
 * screen reserves for it, while the forest drifts by. Measuring the slot
 * keeps it clear of the text on every screen size.
 */
export function hover(ctx: GameContext, slotId: string, time: number, dt: number): void {
  const slot = byId(slotId).getBoundingClientRect();
  const field = byId('game').getBoundingClientRect();
  const center = slot.height > 0 ? slot.top - field.top + slot.height / 2 : ctx.world.height * 0.45;
  ctx.world.player.y = center + Math.sin(time * BOB_SPEED) * BOB_AMPLITUDE;
  ctx.world.distance += HOVER_SCROLL_SPEED * dt;
}
