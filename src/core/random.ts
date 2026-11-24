/**
 * Seedable random numbers (mulberry32). Gameplay uses this instead of
 * Math.random() so any run can be replayed exactly from its seed.
 */
export interface Random {
  /** Float in [0, 1). */
  next(): number;
  /** Float in [min, max). */
  range(min: number, max: number): number;
  /** True with the given probability (0..1). */
  chance(probability: number): boolean;
  /** -1 or 1 with equal odds. */
  sign(): -1 | 1;
}

export function createRandom(seed: number): Random {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    range: (min, max) => min + next() * (max - min),
    chance: (probability) => next() < probability,
    sign: () => (next() < 0.5 ? -1 : 1),
  };
}

/** A fresh seed drawn from another generator, so a session's rounds each get their own. */
export function nextSeed(rng: Random): number {
  return Math.floor(rng.next() * 4294967296);
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 32);
}
