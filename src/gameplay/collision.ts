import { TUNING } from '../config/tuning';
import type { Player } from './player';
import { gapBottom, gapTop, glowflyPosition, rootLeft, type Root } from './roots';

/** A solid rectangle of a root, in screen coordinates. */
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Distance from a circle's edge to a rectangle; negative means overlapping. */
export function circleToBoxGap(cx: number, cy: number, radius: number, box: Box): number {
  const closestX = Math.max(box.x, Math.min(cx, box.x + box.w));
  const closestY = Math.max(box.y, Math.min(cy, box.y + box.h));
  return Math.hypot(cx - closestX, cy - closestY) - radius;
}

/** Circle-to-circle touch, scaled by `factor` (below 1 means stricter). */
export function circlesTouch(ax: number, ay: number, ar: number, bx: number, by: number, br: number, factor = 1): boolean {
  const reach = (ar + br) * factor;
  return (ax - bx) ** 2 + (ay - by) ** 2 < reach * reach;
}

function columnBoxes(root: Root, groundY: number): Box[] {
  const x = rootLeft(root);
  const boxes: Box[] = [];
  if (root.columns !== 'bottom') boxes.push({ x, y: 0, w: root.width, h: gapTop(root) });
  if (root.columns !== 'top') boxes.push({ x, y: gapBottom(root), w: root.width, h: groundY - gapBottom(root) });
  return boxes;
}

/**
 * The closest the mushroom is to any solid part of a root (columns and
 * glowfly swarm). Negative means it is touching.
 */
export function gapToRoot(player: Player, root: Root, groundY: number): number {
  let closest = Infinity;
  for (const box of columnBoxes(root, groundY)) {
    closest = Math.min(closest, circleToBoxGap(player.x, player.y, player.radius, box));
  }
  const swarm = glowflyPosition(root);
  if (swarm) {
    const gap = Math.hypot(player.x - swarm.x, player.y - swarm.y) - player.radius - TUNING.glowflies.radius;
    closest = Math.min(closest, gap);
  }
  return closest;
}

export function playerHitsRoot(player: Player, root: Root, groundY: number): boolean {
  return gapToRoot(player, root, groundY) < 0;
}

/** True when the mushroom slips past a root within the near-miss distance without touching it. */
export function isNearMiss(player: Player, root: Root, groundY: number): boolean {
  const margin = TUNING.nearMiss.horizontalMargin;
  const left = rootLeft(root);
  const besideRoot = player.x + player.radius >= left - margin && player.x - player.radius <= left + root.width + margin;
  if (!besideRoot) return false;
  const gap = gapToRoot(player, root, groundY);
  return gap >= 0 && gap < TUNING.nearMiss.distance;
}

export function playerHitsGround(player: Player, groundY: number): boolean {
  return player.y + player.radius >= groundY;
}
