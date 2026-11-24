import { sin } from '../core/fmath';
import { rootCount, type LevelConfig, type Schedule } from '../config/levels';
import { TUNING } from '../config/tuning';
import type { Random } from '../core/random';
import { freePickup, type Pickup, type PickupKind } from './pickups';
import type { Root, RootMotion } from './roots';
import type { WindZone } from './wind';

const R = TUNING.roots;
const PK = TUNING.pickups;
const WD = TUNING.wind;
const WV = TUNING.waves;
const LC = TUNING.levelCurve;

/** Where a root sits in the rhythm of tension and release. Calm roots are still and wider; surges are tighter. */
export type WavePhase = 'calm' | 'normal' | 'surge';

/**
 * Endless runs in repeating waves. An adventure level follows one interest
 * curve: an easy opening, a breather halfway, and a climax before the gate.
 */
export function wavePhase(level: LevelConfig, index: number): WavePhase {
  if (level.progressive) {
    const position = index % WV.length;
    if (position >= WV.length - WV.surgeRoots) return 'surge';
    if (index >= WV.length && position < WV.calmRoots) return 'calm';
    return 'normal';
  }
  const total = rootCount(level);
  const half = Math.floor(total / 2);
  if (index < LC.openingRoots) return 'calm';
  if (index >= half && index < half + LC.breatherRoots) return 'calm';
  if (index >= total - LC.climaxRoots) return 'surge';
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
  const motion = chooseMotion(rng, level, index, gapCenter);

  return {
    index,
    x,
    width: R.width,
    xOffset: 0,
    gapCenter,
    gapSize: gapSizeFor(level, index) + movingGapBonus(level, motion),
    centerMin,
    centerMax,
    motion,
    gapPulse: level.gapPulse
      ? { min: level.gap.min + gapBonus(level, index), max: level.gap.max + gapBonus(level, index), phase: rng.range(0, Math.PI * 2) }
      : null,
    slidePhase: level.slide ? rng.range(0, Math.PI * 2) : null,
    vein: onSchedule(level.veins, index) ? { side: rng.chance(0.5) ? 'top' : 'bottom', hits: 0 } : null,
    passed: false,
    nearMissCounted: false,
  };
}

export function gapSizeFor(level: LevelConfig, index: number): number {
  const base = level.progressive
    ? Math.max(level.gap.min, level.gap.max - index * R.gapShrinkPerRoot)
    : (level.gap.min + level.gap.max) / 2;
  return base + gapBonus(level, index);
}

/** Endless: a gap that moves opens wider, so it stays manageable to fly through. */
function movingGapBonus(level: LevelConfig, motion: RootMotion): number {
  if (!level.progressive) return 0;
  const M = R.endlessMovingGap;
  switch (motion.kind) {
    case 'drift':
      return M.drift + motion.speed * M.perDriftSpeed;
    case 'sway':
      return M.sway;
    case 'still':
      return 0;
  }
}

/** Extra gap from the rhythm: positive on calm roots, negative in a surge. */
function gapBonus(level: LevelConfig, index: number): number {
  const phase = wavePhase(level, index);
  if (!level.progressive) {
    if (phase === 'calm') return LC.calmGapBonus;
    return phase === 'surge' ? -LC.climaxGapShrink : 0;
  }
  const wave = Math.floor(index / WV.length);
  switch (phase) {
    case 'surge':
      return -Math.min(WV.surgeGapShrinkMax, WV.surgeGapShrink + wave * WV.surgeGapShrinkPerWave);
    case 'calm':
      return WV.calmGapBonus;
    case 'normal':
      return 0;
  }
}

/** The pickup floating in the open space after a root, if any. */
export function makePickup(rng: Random, root: Root, index: number, level: LevelConfig, field: Field): Pickup | null {
  const chance = wavePhase(level, index) === 'calm' ? PK.chance * WV.calmPickupFactor : PK.chance;
  const kind = choosePickupKind(rng, level, index, chance);
  if (kind === null) return null;

  const wantedY = root.gapCenter + rng.sign() * rng.range(PK.minVerticalOffset, PK.maxVerticalOffset);
  const y = Math.min(field.height - PK.bottomMargin, Math.max(PK.minY, wantedY));
  // Halfway through the open space between this root and the next.
  const offsetX = root.width + (level.spacing - root.width) / 2;
  return { kind, root, offsetX, offsetY: y - root.gapCenter, vx: 0, vy: 0, collected: false };
}

/**
 * Whether the next slot is a clearing: no root, just a cluster of coins.
 * Never in a surge and never twice in a row.
 */
export function isClearing(rng: Random, level: LevelConfig, index: number, afterClearing: boolean): boolean {
  const c = level.clearings;
  if (!c || afterClearing || index < c.fromRoot || wavePhase(level, index) === 'surge') return false;
  return rng.chance(c.chance);
}

/** The coins of a clearing: a gentle hump near the last gap's height, so it can be reached. */
export function makeCoinCluster(field: Field, x: number, nearY: number): Pickup[] {
  const C = PK.cluster;
  const top = PK.minY + C.height;
  const centerY = Math.min(field.height - PK.bottomMargin, Math.max(top, nearY));
  return Array.from({ length: C.coins }, (_, i) =>
    freePickup('coin', x + i * C.spacing, centerY - sin((i / (C.coins - 1)) * Math.PI) * C.height),
  );
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

function choosePickupKind(rng: Random, level: LevelConfig, index: number, chance: number): PickupKind | null {
  if (onSchedule(level.diamonds, index)) return 'diamond';
  const magnetAllowed = index >= level.magnetFromRoot;
  if (!rng.chance(chance)) return null;
  const roll = rng.next();
  if (roll < PK.shieldShare) return 'shield';
  if (roll < PK.shieldShare + PK.magnetShare && magnetAllowed) return 'magnet';
  // Only levels with golden coins roll for one, so fixed layouts stay the same.
  if (level.goldenCoinChance > 0 && rng.chance(level.goldenCoinChance)) return 'goldCoin';
  return 'coin';
}

function onSchedule(schedule: Schedule | null, index: number): boolean {
  if (!schedule || index < schedule.first) return false;
  return schedule.every === null ? index === schedule.first : (index - schedule.first) % schedule.every === 0;
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
      return field.height * t.centerFraction + sin(index * t.stepPerRoot) * field.height * t.amplitudeFraction;
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
