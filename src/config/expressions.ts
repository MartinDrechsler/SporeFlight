/**
 * The mushroom's faces, as data. Schell (Art of Game Design): faces carry the
 * most emotion, and simple eye shapes and brows give a lot of expression
 * cheaply. Every expression is a handful of numbers for the same few parts:
 * eyes, eyelids, brows, mouth and cheeks.
 *
 * Lengths are in mushroom radii; the drawing in render/face.ts scales them.
 */

/** How the eyes are drawn: open ovals, happy arcs (^ ^), shut lines, or dizzy crosses. */
export type EyeShape = 'open' | 'happy' | 'shut' | 'cross';
export type MouthShape = 'smile' | 'grin' | 'frown' | 'o' | 'tiny' | 'smirk' | 'wobbly' | 'tongue';

export interface Expression {
  eyes: EyeShape;
  /** How tall the open eyes are, 1 = normal. */
  open: number;
  /** Eye size overall, 1 = normal (surprise makes them bigger). */
  size: number;
  /** How far the upper eyelid hangs down over an open eye: 0 none, 1 closed. */
  lid: number;
  /** Where the eyes look up (-1) or down (1). */
  lookY: number;
  /** Brows: `raise` moves them up (negative) or down; `tilt` lifts the inner ends (worry) or lowers them (determination). Null: no brows. */
  brows: { raise: number; tilt: number } | null;
  mouth: MouthShape;
  /** Pink cheeks, 0 to 1. */
  blush: number;
  /** A drop of sweat on the cap. */
  sweat: boolean;
}

const BASE: Expression = {
  eyes: 'open', open: 1, size: 1, lid: 0, lookY: 0, brows: null, mouth: 'smile', blush: 0.6, sweat: false,
};

export const EXPRESSIONS = {
  neutral: BASE,
  happy: { ...BASE, eyes: 'happy', brows: { raise: -0.04, tilt: 0 }, mouth: 'grin', blush: 1 },
  sad: { ...BASE, open: 0.9, lid: 0.15, lookY: 0.4, brows: { raise: 0.01, tilt: 0.045 }, mouth: 'frown', blush: 0.2 },
  /** Out of lives: heavy, half-closed eyes and droopy brows. */
  exhausted: { ...BASE, lid: 0.6, lookY: 0.4, brows: { raise: 0.04, tilt: 0.02 }, mouth: 'tiny', blush: 0.15 },
  /** Exhausted, with the eyes falling shut for a moment. */
  dozing: { ...BASE, eyes: 'shut', brows: { raise: 0.045, tilt: 0.02 }, mouth: 'tiny', blush: 0.15 },
  surprised: { ...BASE, open: 1.15, size: 1.15, brows: { raise: -0.08, tilt: 0 }, mouth: 'o', blush: 0.5 },
  /** Chin up, eyes half lidded, a little smirk. */
  proud: { ...BASE, lid: 0.38, lookY: -0.3, brows: { raise: -0.03, tilt: -0.02 }, mouth: 'smirk', blush: 0.8 },
  nervous: { ...BASE, size: 1.05, brows: { raise: -0.02, tilt: 0.05 }, mouth: 'wobbly', blush: 0.3, sweat: true },
  /** Right after a crash. */
  dizzy: { ...BASE, eyes: 'cross', mouth: 'o', blush: 0 },
  /** Knocked out, cartoon style: crossed eyes, tongue hanging out. */
  knockedOut: { ...BASE, eyes: 'cross', mouth: 'tongue', blush: 0 },
  /** Coming round: eyes open but heavy. */
  tired: { ...BASE, lid: 0.35, brows: { raise: 0.03, tilt: 0.02 }, mouth: 'tiny', blush: 0.3 },
  /** Sipping water: eyes closed in bliss, cheeks pink. */
  sipping: { ...BASE, eyes: 'happy', mouth: 'tiny', blush: 0.9 },
} satisfies Record<string, Expression>;

export type ExpressionId = keyof typeof EXPRESSIONS;

/**
 * Halfway between two faces: numbers ease from one to the other, shapes
 * (eyes, mouth, brows on or off) switch at the middle. Lets a face change
 * smoothly instead of popping.
 */
export function blendExpressions(from: Expression, to: Expression, t: number): Expression {
  if (t <= 0) return from;
  if (t >= 1) return to;
  const mix = (a: number, b: number): number => a + (b - a) * t;
  const late = t >= 0.5;
  const browsFrom = from.brows ?? to.brows;
  const browsTo = to.brows ?? from.brows;
  const brows = late ? to.brows : from.brows;
  return {
    eyes: late ? to.eyes : from.eyes,
    open: mix(from.open, to.open),
    size: mix(from.size, to.size),
    lid: mix(from.lid, to.lid),
    lookY: mix(from.lookY, to.lookY),
    brows: brows && browsFrom && browsTo ? { raise: mix(browsFrom.raise, browsTo.raise), tilt: mix(browsFrom.tilt, browsTo.tilt) } : null,
    mouth: late ? to.mouth : from.mouth,
    blush: mix(from.blush, to.blush),
    sweat: late ? to.sweat : from.sweat,
  };
}
