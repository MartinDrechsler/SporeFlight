import { TUNING } from '../config/tuning';
import { rootLeft, type Root } from './roots';

const M = TUNING.magnet;

/** A golden coin is a rare, huge coin worth 10. */
export type PickupKind = 'coin' | 'goldCoin' | 'diamond' | 'shield' | 'magnet';

/**
 * Something to collect. Most float in the space after a root and ride along
 * with it (so they follow a moving gap) at an offset that a magnet can pull.
 * Without a root (in a boss fight) the offset is simply the screen position.
 */
export interface Pickup {
  kind: PickupKind;
  root: Root | null;
  offsetX: number;
  offsetY: number;
  vx: number;
  vy: number;
  collected: boolean;
}

export function pickupPosition(pickup: Pickup): { x: number; y: number } {
  const root = pickup.root;
  if (!root) return { x: pickup.offsetX, y: pickup.offsetY };
  return { x: rootLeft(root) + pickup.offsetX, y: root.gapCenter + pickup.offsetY };
}

/** A pickup without a root drifts with the forest; one on a root already moves with it. */
export function scrollPickup(pickup: Pickup, travelled: number): void {
  if (!pickup.root) pickup.offsetX -= travelled;
}

/**
 * Lets a pickup go of its root (when the root leaves the screen): it keeps its
 * place on screen and from then on drifts with the forest by itself.
 */
export function detach(pickup: Pickup): void {
  if (!pickup.root) return;
  const { x, y } = pickupPosition(pickup);
  pickup.root = null;
  pickup.offsetX = x;
  pickup.offsetY = y;
}

/** A pickup floating freely at a screen position. */
export function freePickup(kind: PickupKind, x: number, y: number): Pickup {
  return { kind, root: null, offsetX: x, offsetY: y, vx: 0, vy: 0, collected: false };
}

/** Only valuables are attracted; a magnet never pulls in power-ups. */
export function isMagnetic(pickup: Pickup): boolean {
  return pickup.kind === 'coin' || pickup.kind === 'goldCoin' || pickup.kind === 'diamond';
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
