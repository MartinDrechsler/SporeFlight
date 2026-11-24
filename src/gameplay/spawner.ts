import type { LevelConfig } from '../config/levels';
import { TUNING } from '../config/tuning';
import type { Random } from '../core/random';
import type { Pickup, PickupKind } from './pickups';
import type { Root, RootMotion } from './roots';
import type { WindZone } from './wind';

const R = TUNING.roots;
const PK = TUNING.pickups;
const WD = TUNING.wind;
const WV = TUNING.waves;

/** Where a root sits in endless's rhythm of tension and release. */
export type WavePhase = 'calm' | 'normal' | 'surge';

export function wavePhase(level: LevelConfig, index: number): WavePhase {
  if (!level.progressive) return 'normal';
  const position = index % WV.length;
  if (position >= WV.length - WV.surgeRoots) return 'surge';
  if (index >= WV.length && position < WV.calmRoots) return 'calm';
  return 'normal';
}

export interface Field {
  height: number;
  groundY: number;
}

/**
 * Decides what each new root looks like from the level's data. All placement
 * and difficulty rules live here. `index` counts roots spawned before this one.
 */
export function makeRoot(
  rng: Random,
  level: LevelConfig,
  field: Field,
  x: number,
  index: number,
  previousCenter: number | null,
): Root {
  const centerMin = field.height * R.centerMinFraction;
  const centerMax = field.height * R.centerMaxFraction;
  const gapCenter = chooseCenter(rng, level, field, index, centerMin, centerMax, previousCenter);

  return {
    x,
    width: R.width,
    xOffset: 0,
    gapCenter,
    gapSize: gapSizeFor(level, index),
    centerMin,
    centerMax,
    motion: chooseMotion(rng, level, index, gapCenter),
    gapPulse: level.gapPulse ? { min: level.gap.min, max: level.gap.max, phase: rng.range(0, Math.PI * 2) } : null,
    slidePhase: level.slide ? rng.range(0, Math.PI * 2) : null,
    passed: false,
    nearMissCounted: false,
  };
}

export function gapSizeFor(level: LevelConfig, index: number): number {
  if (level.progressive) {
    const base = Math.max(level.gap.min, level.gap.max - index * R.gapShrinkPerRoot);
    const wave = Math.floor(index / WV.length);
    switch (wavePhase(level, index)) {
      case 'surge':
        return base - Math.min(WV.surgeGapShrinkMax, WV.surgeGapShrink + wave * WV.surgeGapShrinkPerWave);
      case 'calm':
        return base + WV.calmGapBonus;
      case 'normal':
        return base;
    }
  }
  if (level.gapPulse) return (level.gap.min + level.gap.max) / 2;
  return level.gap.min;
}

/** The pickup floating in the open space after a root, if any. */
export function makePickup(rng: Random, root: Root, index: number, level: LevelConfig, field: Field): Pickup | null {
  const chance = wavePhase(level, index) === 'calm' ? PK.chance * WV.calmPickupFactor : PK.chance;
  const kind = choosePickupKind(rng, index, chance, index >= level.magnetFromRoot);
  if (kind === null) return null;

  const wantedY = root.gapCenter + rng.sign() * rng.range(PK.minVerticalOffset, PK.maxVerticalOffset);
  const y = Math.min(field.height - PK.bottomMargin, Math.max(PK.minY, wantedY));
  // Halfway through the open space between this root and the next.
  const offsetX = root.width + (level.spacing - root.width) / 2;
  return { kind, root, offsetX, offsetY: y - root.gapCenter, vx: 0, vy: 0, collected: false };
}

export function makeWindZone(rng: Random, x: number): WindZone {
  return {
    kind: rng.chance(0.5) ? 'updraft' : 'downdraft',
    x,
    width: rng.range(WD.minWidth, WD.maxWidth),
  };
}

export function nextWindDistance(rng: Random): number {
  return rng.range(WD.minInterval, WD.maxInterval);
}

function choosePickupKind(rng: Random, index: number, chance: number, magnetAllowed: boolean): PickupKind | null {
  const isDiamondSlot = index >= PK.diamondFirstRoot && (index - PK.diamondFirstRoot) % PK.diamondEveryRoots === 0;
  if (isDiamondSlot) return 'diamond';
  if (!rng.chance(chance)) return null;
  const roll = rng.next();
  if (roll < PK.shieldShare) return 'shield';
  if (roll < PK.shieldShare + PK.magnetShare) return magnetAllowed ? 'magnet' : 'coin';
  return 'coin';
}

function chooseCenter(
  rng: Random,
  level: LevelConfig,
  field: Field,
  index: number,
  min: number,
  max: number,
  previous: number | null,
): number {
  switch (level.layout) {
    case 'tunnel': {
      const t = R.tunnel;
      return field.height * t.centerFraction + Math.sin(index * t.stepPerRoot) * field.height * t.amplitudeFraction;
    }
    case 'random': {
      if (previous === null) return rng.range(min, max);
      const low = Math.max(min, previous - R.maxCenterStep);
      const high = Math.min(max, previous + R.maxCenterStep);
      return rng.range(low, high);
    }
  }
}

function chooseMotion(rng: Random, level: LevelConfig, index: number, center: number): RootMotion {
  // A breather is always still; tension lives in the surge.
  if (wavePhase(level, index) === 'calm') return { kind: 'still' };
  const sways = level.sway || (level.progressive && index >= R.endlessSwayFromRoot);
  if (sways) {
    return {
      kind: 'sway',
      baseCenter: center,
      amplitude: rng.range(R.sway.minAmplitude, R.sway.maxAmplitude),
      frequency: rng.range(R.sway.minFrequency, R.sway.maxFrequency),
      phase: rng.range(0, Math.PI * 2),
    };
  }
  const drift = driftFor(level, index);
  if (drift && rng.chance(drift.chance)) return { kind: 'drift', speed: drift.speed, direction: rng.sign() };
  return { kind: 'still' };
}

function driftFor(level: LevelConfig, index: number): { chance: number; speed: number } | null {
  if (!level.progressive) return level.drift;
  const d = R.endlessDrift;
  if (index < d.fromRoot) return null;
  const rootsInto = index - d.fromRoot;
  return {
    chance: Math.min(d.maxChance, d.startChance + rootsInto * d.chancePerRoot),
    speed: Math.min(d.maxSpeed, d.baseSpeed + rootsInto * d.extraSpeedPerRoot),
  };
}
