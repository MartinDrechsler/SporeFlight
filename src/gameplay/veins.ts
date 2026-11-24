import { TUNING } from '../config/tuning';
import { gapBottom, gapTop, rootLeft, type Root } from './roots';
import type { World } from './world';

const V = TUNING.veins;

/**
 * A glowing crystal vein on a root's cap, facing the gap. Touching it does
 * not kill: the mushroom bounces off and the crystal cracks. The last hit
 * breaks it open and releases a diamond. Going for it is a risk next to a
 * root; leaving it alone is always allowed.
 */
export interface Vein {
  /** 'top': on the cap of the hanging column; 'bottom': on the cap of the rising one. */
  side: 'top' | 'bottom';
  hits: number;
}

export function isBroken(vein: Vein): boolean {
  return vein.hits >= V.hitsToBreak;
}

/**
 * Bounces the mushroom off any vein it touches from the gap side and cracks
 * it. Returns true when a bounce happened, so the root is not counted as a hit.
 */
export function bounceOffVeins(world: World): boolean {
  if (world.veinCooldown > 0) return false;
  const player = world.player;
  for (const root of world.roots) {
    const vein = root.vein;
    if (!vein || isBroken(vein) || !touches(world, root, vein)) continue;

    if (vein.side === 'bottom') {
      player.y = gapBottom(root) - player.radius - 1;
      player.vy = -V.bounceSpeed;
    } else {
      player.y = gapTop(root) + player.radius + 1;
      player.vy = V.bounceSpeed * V.downBounceFactor;
    }
    vein.hits += 1;
    world.veinCooldown = V.cooldownSeconds;
    const at = { x: rootLeft(root) + root.width / 2, y: vein.side === 'bottom' ? gapBottom(root) : gapTop(root) };
    world.events.push({ type: 'veinHit', ...at, hits: vein.hits });
    if (isBroken(vein)) {
      world.stats.diamonds += 1;
      world.stats.veins += 1;
      world.events.push({ type: 'veinBreak', ...at });
    }
    return true;
  }
  return false;
}

/** The vein's crystal sits on the cap; it counts only when touched from the open gap. */
function touches(world: World, root: Root, vein: Vein): boolean {
  const { x, y, radius } = world.player;
  const left = rootLeft(root) - V.overhang;
  const right = rootLeft(root) + root.width + V.overhang;
  if (x + radius < left || x - radius > right) return false;
  if (vein.side === 'bottom') {
    const surface = gapBottom(root);
    return y < surface && y + radius >= surface - V.crystalHeight;
  }
  const surface = gapTop(root);
  return y > surface && y - radius <= surface + V.crystalHeight;
}
