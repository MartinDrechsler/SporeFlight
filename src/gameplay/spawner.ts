import { TUNING } from '../config/tuning';
import type { Random } from '../core/random';
import type { Root, RootMotion } from './roots';

const R = TUNING.roots;
const PK = TUNING.pickups;

export type PickupKind = 'coin' | 'diamond';

export interface Pickup {
  kind: PickupKind;
  x: number;
  y: number;
  collected: boolean;
}

/**
 * Decides what each new root looks like. All difficulty rules (gap size,
 * moving gaps, where coins and diamonds appear) live here.
 * `index` is the number of roots spawned before this one in the round.
 */
export function makeRoot(
  rng: Random,
  x: number,
  fieldHeight: number,
  index: number,
  previousCenter: number | null,
): Root {
  const centerMin = fieldHeight * R.centerMinFraction;
  const centerMax = fieldHeight * R.centerMaxFraction;
  const gapCenter = chooseCenter(rng, centerMin, centerMax, previousCenter);

  return {
    x,
    width: R.width,
    gapCenter,
    gapSize: gapSizeFor(index),
    centerMin,
    centerMax,
    motion: chooseMotion(rng, index, gapCenter),
    passed: false,
  };
}

/** The pickup floating in the open space after a root, if any. */
export function makePickup(rng: Random, root: Root, index: number, fieldHeight: number): Pickup | null {
  const kind = pickupKindFor(rng, index);
  if (kind === null) return null;

  const offset = rng.sign() * rng.range(PK.minVerticalOffset, PK.maxVerticalOffset);
  const y = clamp(root.gapCenter + offset, fieldHeight * 0.1, fieldHeight * 0.8);
  // Halfway between this root and the next one.
  const x = root.x + root.width + (R.spacing - root.width) / 2;
  return { kind, x, y, collected: false };
}

export function gapSizeFor(index: number): number {
  return Math.max(R.gapMin, R.gapStart - index * R.gapShrinkPerRoot);
}

function pickupKindFor(rng: Random, index: number): PickupKind | null {
  const isDiamondSlot =
    index >= PK.diamondFirstRoot && (index - PK.diamondFirstRoot) % PK.diamondEveryRoots === 0;
  if (isDiamondSlot) return 'diamond';
  return rng.chance(PK.coinChance) ? 'coin' : null;
}

function chooseCenter(rng: Random, min: number, max: number, previous: number | null): number {
  if (previous === null) return rng.range(min, max);
  const low = Math.max(min, previous - R.maxCenterStep);
  const high = Math.min(max, previous + R.maxCenterStep);
  return rng.range(low, high);
}

function chooseMotion(rng: Random, index: number, center: number): RootMotion {
  if (index >= R.sway.fromRoot) {
    return {
      kind: 'sway',
      baseCenter: center,
      amplitude: rng.range(R.sway.minAmplitude, R.sway.maxAmplitude),
      frequency: rng.range(R.sway.minFrequency, R.sway.maxFrequency),
      phase: rng.range(0, Math.PI * 2),
    };
  }
  if (index >= R.drift.fromRoot) {
    const rootsInto = index - R.drift.fromRoot;
    const chance = Math.min(R.drift.maxChance, R.drift.startChance + rootsInto * R.drift.chancePerRoot);
    if (rng.chance(chance)) {
      const speed = Math.min(R.drift.maxSpeed, R.drift.baseSpeed + rootsInto * R.drift.extraSpeedPerRoot);
      return { kind: 'drift', speed, direction: rng.sign() };
    }
  }
  return { kind: 'still' };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
