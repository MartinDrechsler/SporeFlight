/**
 * Every number that changes how the game plays lives here, and only here.
 * Units are CSS pixels and seconds. Values were converted from the original
 * per-frame game (60 fps): px/frame * 60 = px/s, px/frame^2 * 3600 = px/s^2.
 */
export const TUNING = {
  player: {
    radius: 18,
    startXFraction: 0.28,
    startYFraction: 0.45,
    gravity: 1368,
    flapVelocity: -390,
    maxFallSpeed: 540,
  },

  world: {
    groundHeight: 85,
    startSpeed: 120,
    maxSpeed: 216,
    /** Slow continuous speed-up, px/s gained per second of play. */
    acceleration: 0.36,
    /** Extra speed multiplier gained every `speedStepEvery` roots passed. */
    speedStepEvery: 10,
    speedStepAmount: 0.1,
    /** How fast the multiplier eases toward its target, per second. */
    speedEaseRate: 0.12,
  },

  roots: {
    width: 65,
    spacing: 290,
    /** Gap shrinks from `gapStart` by `gapShrinkPerRoot` for each root spawned, down to `gapMin`. */
    gapStart: 160,
    gapMin: 120,
    gapShrinkPerRoot: 1.6,
    /** Gap centre limits as fractions of the playfield height. */
    centerMinFraction: 0.22,
    centerMaxFraction: 0.65,
    /** Largest jump in gap centre between neighbouring roots. */
    maxCenterStep: 130,
    /** Difficulty follows roots spawned (skill), not points (which combos inflate). */
    drift: {
      fromRoot: 10,
      startChance: 0.25,
      chancePerRoot: 0.05,
      maxChance: 0.8,
      baseSpeed: 30,
      extraSpeedPerRoot: 2.4,
      maxSpeed: 120,
    },
    sway: {
      fromRoot: 15,
      minAmplitude: 55,
      maxAmplitude: 80,
      minFrequency: 1.5,
      maxFrequency: 2.4,
    },
  },

  pickups: {
    radius: 9,
    /** Chance that a coin floats in the space after a root. */
    coinChance: 0.15,
    diamondFirstRoot: 20,
    diamondEveryRoots: 10,
    /** Collection is a little stricter than touching, so it feels earned. */
    collectRadiusFactor: 0.7,
    minVerticalOffset: 45,
    maxVerticalOffset: 65,
  },

  combo: {
    windowSeconds: 3.5,
    /** Passes needed for each multiplier: index = multiplier - 1. */
    thresholds: [0, 2, 4, 6, 8],
    /** At max multiplier, points are doubled again. */
    feverPointFactor: 2,
  },

  session: {
    lives: 5,
    restSeconds: 60,
  },

  roundOver: {
    /** How long the falling animation plays before the next screen. */
    seconds: 1.0,
  },
} as const;
