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
    /** Pull while rising: a soft, rounded arc after each tap. */
    gravity: 1368,
    /** Pull while falling: stronger, so hesitation is punished (Flappy-style). */
    fallGravity: 2190,
    flapVelocity: -390,
    maxFallSpeed: 660,
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
    gapPulseSpeed: 2.4,
    slideAmplitude: 45,
    slideSpeed: 2.1,
    tunnel: { centerFraction: 0.43, amplitudeFraction: 0.18, stepPerRoot: 0.55 },
    sway: { minAmplitude: 55, maxAmplitude: 80, minFrequency: 1.5, maxFrequency: 2.4 },
  },

  pickups: {
    radius: 9,
    /** A golden coin: drawn bigger, worth 10. */
    goldenRadius: 14,
    goldenCoinValue: 10,
    /** Chance that a pickup floats after a root (diamond slots aside). */
    chance: 0.3,
    /** Of those: share of shields and magnets; the rest are coins. */
    shieldShare: 0.12,
    magnetShare: 0.12,
    /** A clearing's coins: a hump of coins in the empty space where a root was left out. */
    cluster: { coins: 7, spacing: 34, height: 40 },
    /** Collection is a little stricter than touching, so it feels earned. */
    collectRadiusFactor: 0.7,
    minVerticalOffset: 45,
    maxVerticalOffset: 65,
    /** Keep pickups away from the screen edges. */
    minY: 60,
    bottomMargin: 130,
    /** A sporeling waits inside a root's gap, this share of the gap's height away from its middle: near an edge. */
    sporelingEdge: 0.28,
  },


  /** A near miss is pure feedback (sparks, a glow ring, a sound); it never changes time and pays nothing. */
  nearMiss: {
    /** Gap between mushroom and root edge that counts as a near miss. */
    distance: 12,
    /** Horizontal reach beyond the root's sides. */
    horizontalMargin: 10,
  },

  audio: {
    /** Music loudness for a new player, 0 to 1 (the settings slider). */
    defaultMusicVolume: 0.7,
  },

  shield: {
    /** Invulnerable time after the shield pops. */
    graceSeconds: 1.5,
  },

  /** The Stone Thrower: a monster on the right that throws rocks. Every throw is announced first. */
  boss: {
    /** Distance of its centre from the right edge, px. */
    insetFromRight: 58,
    bodyRadius: 62,
    enterSeconds: 1.2,
    firstThrowAfter: 2,
    /** Eyes flare and the body shakes this long before each throw, s. */
    warnSeconds: 0.55,
    /** Time between throws at the start and at the end of the fight, s. */
    startInterval: 1.8,
    endInterval: 1.0,
    /** A pause halfway through the fight, s. */
    breatherSeconds: 2.6,
    rockRadius: 15,
    startRockSpeed: 240,
    endRockSpeed: 300,
    /** Angle between rocks in a fan of three, radians. */
    fanSpread: 0.3,
    /** Open space in a wall of rocks, px. */
    wallGap: 160,
    wallSpacing: 44,
    coinEverySeconds: 3.5,
    bobAmplitude: 70,
    bobSpeed: 1.1,
  },

  /** Crystal veins on root caps: every bounce off one cracks out a diamond; the third breaks it open. */
  veins: {
    hitsToBreak: 3,
    bounceSpeed: 300,
    /** A vein above pushes down more gently than one below throws up. */
    downBounceFactor: 0.6,
    /** One hit per touch: no second crack for this long, s. */
    cooldownSeconds: 0.3,
    crystalHeight: 14,
    /** The crystal reaches past the column's sides, px. */
    overhang: 4,
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

  /** Scores celebrated with a big moment. They pay nothing: the moment is the reward. */
  milestones: [10, 20, 30, 50, 75, 100],

  gate: {
    /** Width of the finish gate's glow, px. */
    width: 60,
  },

  /** Inside an adventure level: easy opening, a breather halfway, a climax before the gate. */
  levelCurve: {
    openingRoots: 3,
    breatherRoots: 2,
    climaxRoots: 5,
    calmGapBonus: 16,
    climaxGapShrink: 8,
  },

  /**
   * Endless runs in waves of `length` roots. The gaps never change, so a wave
   * only shapes rewards: no clearing during the last `surgeRoots`, then the
   * first `calmRoots` of the next wave are a breather with more pickups.
   */
  waves: {
    length: 10,
    surgeRoots: 4,
    calmRoots: 2,
    calmPickupFactor: 3,
  },

  /** Endless scores sent to the world leaderboard are replayed on the server to check them. */
  leaderboard: {
    /**
     * Raise this whenever a change to the flight rules would make old runs
     * replay differently; the server then only accepts runs from the new rules.
     */
    rulesVersion: 2,
    /** Longest run the server will replay: 45 minutes of steps. */
    maxSteps: 60 * 60 * 45,
    /** Screen sizes a run may come from, CSS px. */
    width: { min: 240, max: 1200 },
    height: { min: 400, max: 1600 },
  },

  session: {
    startLives: 5,
    /** Lives refilled by resting (game open) or by watching an ad. */
    refillLives: 5,
    restSeconds: 60,
    /** The ad can be skipped after this long and still refills lives. */
    adSkippableAfterSeconds: 3,
    /** Hearts always shown, even when fewer lives remain. */
    heartSlots: 5,
    /** How many past crash spots are remembered per level and grown as mushroom clumps. */
    deathMarks: 15,
    /** Crashes closer than this (px) grow into one bigger clump. */
    clumpRadius: 40,
    usernameMaxLength: 12,
    defaultUsername: 'SPORE',
  },

  roundOver: {
    /** Longest wait after a crash before the next screen (the mushroom normally lands sooner). */
    seconds: 3.0,
    /** Time after landing for the mushroom clump to grow, s. */
    afterLandingSeconds: 0.9,
    /** How long a new clump takes to grow, s. */
    clumpGrowSeconds: 0.7,
  },
} as const;
