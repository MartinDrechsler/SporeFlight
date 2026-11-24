/**
 * How the flying mushroom's body moves with its jumps: drawing only, so the
 * flight rules and replays never change.
 *
 * A flap squeezes it for an instant, then it stretches forward along the jump,
 * leaning right, the way it travels. It is upright at the top of the arc and
 * leans further right (nose down) as the fall speeds up. It never leans back.
 *
 * Schell: an interface must answer within a tenth of a second, and a crouch
 * before a jump "drives players crazy". So the squeeze starts on the very
 * frame of the tap, lasts 50 ms, and the jump itself is never delayed.
 */
const JUMP = {
  /** Seconds of the squeeze: the body flattens, then springs. */
  squeezeSeconds: 0.05,
  /** How flat at the moment of the tap: wider and shorter by this much. */
  squeeze: 0.24,
  /** How long and thin at the peak of the stretch. */
  stretch: 0.3,
  /** Seconds for the stretch to reach its peak after the squeeze. */
  stretchRise: 0.035,
  /** How fast the stretch settles (per second). */
  stretchSettle: 12,
  /** Forward lean of a jump, radians (about 22 degrees). */
  lean: 0.38,
  /** How fast the jump's lean fades as the rise slows (per second). */
  leanSettle: 6,
  /** Lean per px/s of falling speed, and the most it leans in a dive (75 degrees). */
  divePerSpeed: 0.0018,
  maxDive: (75 * Math.PI) / 180,
};

export interface JumpShape {
  /** Radians, clockwise: 0 upright, positive leaning right. Never negative. */
  tilt: number;
  scaleX: number;
  scaleY: number;
}

/** The body's lean and shape `sinceFlap` seconds after the last flap, falling at `vy` px/s (negative: rising). */
export function jumpShape(sinceFlap: number, vy: number): JumpShape {
  const dive = Math.min(JUMP.maxDive, Math.max(0, vy * JUMP.divePerSpeed));
  if (!Number.isFinite(sinceFlap)) return { tilt: dive, scaleX: 1, scaleY: 1 };

  const s = sinceFlap;
  let squash = 0;
  let stretch = 0;
  if (s < JUMP.squeezeSeconds) {
    squash = JUMP.squeeze * (1 - s / JUMP.squeezeSeconds);
  } else {
    const after = s - JUMP.squeezeSeconds;
    stretch = JUMP.stretch * Math.min(1, after / JUMP.stretchRise) * Math.exp(-Math.max(0, after - JUMP.stretchRise) * JUMP.stretchSettle);
  }
  // The lean comes in with the spring out of the squeeze, then fades towards the top of the arc.
  const leanIn = Math.min(1, s / JUMP.squeezeSeconds);
  const jumpLean = JUMP.lean * leanIn * Math.exp(-Math.max(0, s - JUMP.squeezeSeconds) * JUMP.leanSettle);

  return {
    tilt: Math.max(jumpLean, dive),
    scaleX: 1 + squash - stretch * 0.6,
    scaleY: 1 - squash + stretch,
  };
}
