import { TUNING } from '../config/tuning';

const C = TUNING.combo;
export const MAX_MULTIPLIER = C.thresholds.length;

/** Chaining actions quickly raises the multiplier; pausing too long resets it. */
export interface Combo {
  count: number;
  multiplier: number;
  /** Seconds left before the chain breaks. */
  timeLeft: number;
}

export function createCombo(): Combo {
  return { count: 0, multiplier: 1, timeLeft: 0 };
}

/** Fever is the top multiplier: points and coins are doubled again. */
export function isFever(combo: Combo): boolean {
  return combo.multiplier === MAX_MULTIPLIER;
}

/** Value of one point or coin at the current combo. */
export function comboValue(combo: Combo): number {
  return combo.multiplier * (isFever(combo) ? C.feverFactor : 1);
}

/** Extends the chain. Returns the new multiplier if it went up, otherwise null. */
export function extendCombo(combo: Combo, amount: number): number | null {
  const before = combo.multiplier;
  combo.count += amount;
  combo.timeLeft = C.windowSeconds;
  combo.multiplier = multiplierFor(combo.count);
  return combo.multiplier > before ? combo.multiplier : null;
}

export function stepCombo(combo: Combo, dt: number): void {
  if (combo.count === 0) return;
  combo.timeLeft -= dt;
  if (combo.timeLeft <= 0) Object.assign(combo, createCombo());
}

function multiplierFor(count: number): number {
  let multiplier = 1;
  C.thresholds.forEach((needed, index) => {
    if (count >= needed) multiplier = index + 1;
  });
  return multiplier;
}
