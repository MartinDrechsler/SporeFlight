import { TUNING } from '../config/tuning';

const C = TUNING.combo;
const MAX_MULTIPLIER = C.thresholds.length;

/** Chaining passes quickly raises the points multiplier; pausing too long resets it. */
export interface Combo {
  count: number;
  multiplier: number;
  /** Seconds left before the chain breaks. */
  timeLeft: number;
}

export function createCombo(): Combo {
  return { count: 0, multiplier: 1, timeLeft: 0 };
}

export function isFever(combo: Combo): boolean {
  return combo.multiplier === MAX_MULTIPLIER;
}

/** Points earned for one pass at the current combo. */
export function pointsForPass(combo: Combo): number {
  return combo.multiplier * (isFever(combo) ? C.feverPointFactor : 1);
}

/** Extends the chain. Returns true when this step entered fever. */
export function extendCombo(combo: Combo): boolean {
  const wasFever = isFever(combo);
  combo.count += 1;
  combo.timeLeft = C.windowSeconds;
  combo.multiplier = multiplierFor(combo.count);
  return !wasFever && isFever(combo);
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
