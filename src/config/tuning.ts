/**
 * Every number that changes how the game plays lives here, and only here
 * (level-specific values live in levels.ts). Units are CSS pixels and seconds.
 * Values were converted from the original per-frame game (60 fps):
 * px/frame * 60 = px/s, px/frame^2 * 3600 = px/s^2, rad/frame * 60 = rad/s.
 */
export const TUNING = {
  player: {
    radius: 18,
    startXFraction: 0.28,
    startYFraction: 0.45,
    gravity: 1368,
    flapVelocity: -390,
    maxFallSpeed: 540,
    /** Small upward bounce when crashing. */
    crashHopVelocity: -132,
  },

  world: {
    groundHeight: 85,
    /** Endless only: top speed reached by slow acceleration. */
    maxSpeed: 216,
    /** px/s gained per second of play. */
    acceleration: 0.36,
    /** Speed multiplier gained every `speedStepEvery` roots passed. */
    speedStepEvery: 10,
    speedStepAmount: 0.1,
    /** How fast the multiplier eases toward its target, per second. */
    speedEaseRate: 0.12,
  },

  roots: {
    width: 65,
    /** Gap centre limits as fractions of the playfield height. */
    centerMinFraction: 0.22,
    centerMaxFraction: 0.65,
    /** Largest jump in gap centre between neighbouring roots. */
    maxCenterStep: 130,
    /** Endless: gap shrinks from gap.max by this per root spawned, down to gap.min. */
    gapShrinkPerRoot: 1.6,
    gapPulseSpeed: 2.4,
    widthPulseAmplitude: 22,
    widthPulseSpeed: 2.4,
    slideAmplitude: 45,
    slideSpeed: 2.1,
    tunnel: { centerFraction: 0.43, amplitudeFraction: 0.18, stepPerRoot: 0.55 },
    staggered: { highFraction: 0.26, lowFraction: 0.61 },
    /** Endless difficulty: moving gaps appear with progress. Counted in roots spawned, not points. */
    endlessDrift: { fromRoot: 10, startChance: 0.25, chancePerRoot: 0.05, maxChance: 0.8, baseSpeed: 30, extraSpeedPerRoot: 2.4, maxSpeed: 120 },
    endlessSwayFromRoot: 15,
    sway: { minAmplitude: 55, maxAmplitude: 80, minFrequency: 1.5, maxFrequency: 2.4 },
  },

  glowflies: {
    radius: 13,
    /** Distance from the open side's edge (ground or ceiling). */
    minDistance: 130,
    extraDistance: 40,
    bobAmplitude: 20,
    bobSpeed: 3,
  },

  pickups: {
    radius: 9,
    /** Chance that a pickup floats after a root (diamond slots aside). */
    chance: 0.15,
    /** Of those: share of shields and magnets; the rest are coins. */
    shieldShare: 0.2,
    magnetShare: 0.24,
    diamondFirstRoot: 20,
    diamondEveryRoots: 10,
    /** Collection is a little stricter than touching, so it feels earned. */
    collectRadiusFactor: 0.7,
    minVerticalOffset: 45,
    maxVerticalOffset: 65,
    /** Keep pickups away from the screen edges. */
    minY: 60,
    bottomMargin: 130,
  },

  combo: {
    windowSeconds: 3.5,
    /** Combo count needed for each multiplier: index = multiplier - 1. */
    thresholds: [0, 2, 4, 6, 8],
    /** At max multiplier (fever), points and coins are doubled again. */
    feverFactor: 2,
    /** How much each action extends the combo. */
    gain: { pass: 1, coin: 1, nearMiss: 2, diamond: 2 },
  },

  nearMiss: {
    /** Gap between mushroom and root edge that counts as a near miss. */
    distance: 12,
    /** Horizontal reach beyond the root's sides. */
    horizontalMargin: 10,
    slowMotionFactor: 0.4,
    slowMotionSeconds: 0.15,
  },

  shield: {
    /** Invulnerable time after the shield pops. */
    graceSeconds: 1.5,
  },

  magnet: {
    seconds: 10,
    range: 100,
    pull: 792,
    /** Velocity kept per 1/60 s. */
    damping: 0.85,
  },

  wind: {
    minInterval: 550,
    maxInterval: 800,
    minWidth: 80,
    maxWidth: 120,
    force: 540,
    warningCooldownSeconds: 1,
  },

  /** Endless: one-time coin rewards per round for reaching these scores. */
  benchmarks: [
    { score: 25, reward: 5 },
    { score: 50, reward: 10 },
    { score: 75, reward: 15 },
    { score: 100, reward: 20 },
  ],

  /** Endless: the painted forest fades in behind the hills as the score grows. */
  backdrops: [
    { fromScore: 20, image: 'forest-1' },
    { fromScore: 40, image: 'forest-2' },
  ],

  session: {
    startLives: 5,
    /** Lives granted by watching a rewarded ad. */
    adLives: 10,
    /** Hearts always shown, even when fewer lives remain. */
    heartSlots: 5,
    /** How many past crash spots are remembered and shown on the ground. */
    deathMarks: 15,
    usernameMaxLength: 12,
    defaultUsername: 'SPORE',
  },

  roundOver: {
    /** How long the falling animation plays before the next screen. */
    seconds: 1.0,
  },
} as const;
