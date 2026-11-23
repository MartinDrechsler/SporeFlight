import { TUNING } from '../config/tuning';
import { rootLeft, type Root } from './roots';

const M = TUNING.magnet;

export type PickupKind = 'coin' | 'diamond' | 'shield' | 'magnet';

/**
 * Something to collect, floating in the space after a root. It rides along
 * with its root (so it follows a moving gap) at an offset that a magnet can pull.
 */
export interface Pickup {
  kind: PickupKind;
  root: Root;
  offsetX: number;
  offsetY: number;
  vx: number;
  vy: number;
  collected: boolean;
}

export function pickupPosition(pickup: Pickup): { x: number; y: number } {
  return { x: rootLeft(pickup.root) + pickup.offsetX, y: pickup.root.gapCenter + pickup.offsetY };
}

/** Only valuables are attracted; a magnet never pulls in power-ups. */
export function isMagnetic(pickup: Pickup): boolean {
  return pickup.kind === 'coin' || pickup.kind === 'diamond';
}

/** Accelerates a nearby valuable toward the mushroom, with damping so it glides in. */
export function pullToward(pickup: Pickup, targetX: number, targetY: number, dt: number): void {
  const { x, y } = pickupPosition(pickup);
  const dx = targetX - x;
  const dy = targetY - y;
  const distance = Math.hypot(dx, dy);
  if (distance >= M.range || distance === 0) return;

  pickup.vx += (dx / distance) * M.pull * dt;
  pickup.vy += (dy / distance) * M.pull * dt;
  const keep = M.damping ** (dt * 60);
  pickup.vx *= keep;
  pickup.vy *= keep;
  pickup.offsetX += pickup.vx * dt;
  pickup.offsetY += pickup.vy * dt;
}
