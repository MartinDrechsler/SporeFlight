import type { Player } from './player';
import { gapBottom, gapTop, type Root } from './roots';

/** True when a circle overlaps an axis-aligned rectangle. */
export function circleHitsRect(
  cx: number,
  cy: number,
  radius: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
): boolean {
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < radius * radius;
}

export function playerHitsRoot(player: Player, root: Root, groundY: number): boolean {
  const top = gapTop(root);
  const bottom = gapBottom(root);
  return (
    circleHitsRect(player.x, player.y, player.radius, root.x, 0, root.width, top) ||
    circleHitsRect(player.x, player.y, player.radius, root.x, bottom, root.width, groundY - bottom)
  );
}

export function playerHitsGround(player: Player, groundY: number): boolean {
  return player.y + player.radius >= groundY;
}

/** Circle-to-circle touch, scaled by `factor` (below 1 means stricter). */
export function circlesTouch(
  ax: number,
  ay: number,
  ar: number,
  bx: number,
  by: number,
  br: number,
  factor = 1,
): boolean {
  const reach = (ar + br) * factor;
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy < reach * reach;
}
