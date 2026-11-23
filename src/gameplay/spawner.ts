import type { LevelConfig } from '../config/levels';
import { TUNING } from '../config/tuning';
import type { Random } from '../core/random';
import type { Pickup, PickupKind } from './pickups';
import type { ColumnSet, Root, RootMotion } from './roots';
import type { WindZone } from './wind';

const R = TUNING.roots;
const PK = TUNING.pickups;
const G = TUNING.glowflies;
const WD = TUNING.wind;

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
  const columns = chooseColumns(level, index);

  return {
    x,
    width: R.width,
    xOffset: 0,
    gapCenter,
    gapSize: gapSizeFor(level, index),
    centerMin,
    centerMax,
    columns,
    motion: chooseMotion(rng, level, index, gapCenter),
    gapPulse: level.gapPulse ? { min: level.gap.min, max: level.gap.max, phase: rng.range(0, Math.PI * 2) } : null,
    slidePhase: level.slide ? rng.range(0, Math.PI * 2) : null,
    widthPhase: level.widthPulse ? rng.range(0, Math.PI * 2) : null,
    glowfly: level.glowflies ? makeGlowfly(rng, columns, field) : null,
    passed: false,
    nearMissCounted: false,
  };
}

export function gapSizeFor(level: LevelConfig, index: number): number {
  if (level.progressive) return Math.max(level.gap.min, level.gap.max - index * R.gapShrinkPerRoot);
  if (level.gapPulse) return (level.gap.min + level.gap.max) / 2;
  return level.gap.min;
}

/** The pickup floating in the open space after a root, if any. */
export function makePickup(rng: Random, root: Root, index: number, level: LevelConfig, field: Field): Pickup | null {
  const kind = choosePickupKind(rng, index);
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

function choosePickupKind(rng: Random, index: number): PickupKind | null {
  const isDiamondSlot = index >= PK.diamondFirstRoot && (index - PK.diamondFirstRoot) % PK.diamondEveryRoots === 0;
  if (isDiamondSlot) return 'diamond';
  if (!rng.chance(PK.chance)) return null;
  const roll = rng.next();
  if (roll < PK.shieldShare) return 'shield';
  if (roll < PK.shieldShare + PK.magnetShare) return 'magnet';
  return 'coin';
}

function chooseColumns(level: LevelConfig, index: number): ColumnSet {
  if (level.columns === 'both') return 'both';
  return index % 2 === 0 ? 'top' : 'bottom';
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
    case 'staggered':
      return field.height * (index % 2 === 0 ? R.staggered.highFraction : R.staggered.lowFraction);
    case 'random': {
      if (previous === null) return rng.range(min, max);
      const low = Math.max(min, previous - R.maxCenterStep);
      const high = Math.min(max, previous + R.maxCenterStep);
      return rng.range(low, high);
    }
  }
}

function chooseMotion(rng: Random, level: LevelConfig, index: number, center: number): RootMotion {
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

/** Swarms hover on the open side: near the ground under a ceiling root, near the top over a ground root. */
function makeGlowfly(rng: Random, columns: ColumnSet, field: Field): Root['glowfly'] {
  if (columns === 'both') return null;
  const distance = G.minDistance + rng.range(0, G.extraDistance);
  const baseY = columns === 'top' ? field.groundY - distance : distance;
  return { baseY, phase: rng.range(0, Math.PI * 2) };
}
