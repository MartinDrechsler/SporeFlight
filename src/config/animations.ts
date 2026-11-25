import type { ExpressionId } from './expressions';

/**
 * The avatar's little performances, as data. Each one is a list of moves
 * (hop, squash, spin, ...) and which face to show when. A new animation is a
 * new entry here, not new code; render/timeline.ts turns it into a pose for
 * any moment.
 *
 * Times are seconds from the start; amounts are in mushroom radii or turns.
 */
export type MoveKind =
  /** Jump up `amount` radii and come back down. */
  | 'hop'
  /** Squash wide and short by `amount` (negative: stretch tall), then back. */
  | 'squash'
  /** Turn round `amount` times about the upright axis; the face hides while the back shows. */
  | 'spin'
  /** Glow white all over, strongest halfway. */
  | 'flash'
  /** Rock side to side by `amount` radians, dying out. */
  | 'wobble'
  /** Tremble on the spot by `amount` radii. */
  | 'shiver'
  /** Lean by `amount` radians (negative: back) and stay leaning. */
  | 'lean'
  /** Lie down on its side (`amount` 1, the default) or get back up (`amount` 0), and stay so. */
  | 'lie'
  /** Sink into a slumped sit, shorter and wider by `amount`, and stay so (negative: straighten up again). */
  | 'slump'
  /** Sway the head round in a circle, dazed, by `amount` radians. */
  | 'daze'
  /** Cartoon stars circle above the head. */
  | 'stars'
  /** A glass of water with a straw stands beside it and empties. */
  | 'drink'
  /** One slow breath: swell by `amount` and settle. */
  | 'breathe'
  /** Spores and rays of light burst out from the mushroom. */
  | 'burst'
  /** "z z" floats up from the head. */
  | 'zzz'
  /** From this moment on the new look (skin or trail) is shown. */
  | 'reveal';

export interface Move {
  move: MoveKind;
  at: number;
  /** Seconds the move takes; 0 for an instant. */
  for: number;
  amount?: number;
}

export interface FaceCue {
  at: number;
  face: ExpressionId;
}

export interface Timeline {
  /** Seconds. */
  length: number;
  /** Starts over at the end; otherwise it holds its last pose (or hands over to `then`). */
  loop: boolean;
  /** Played once this one ends, if set (an id in ANIMATIONS; a test checks it). */
  then?: string;
  moves: readonly Move[];
  /** Must start with a cue at 0. */
  faces: readonly FaceCue[];
}

/** `count` gulps (a quick stretch as the water goes down), `every` seconds apart from `start`. */
function gulps(start: number, count: number, every: number): Move[] {
  return Array.from({ length: count }, (_, i) => ({ move: 'squash' as const, at: start + i * every, for: 0.22, amount: -0.05 }));
}

export const ANIMATIONS = {
  /** The home screen and anything calm: just being there. */
  idle: { length: 4, loop: true, moves: [], faces: [{ at: 0, face: 'neutral' }] },

  // Out of lives and resting one minute: the mushroom gets better step by step (see RECOVERY below).

  /** Out of lives: lying knocked out, tongue out, stars circling, a twitch now and then. Also the start of a rest. */
  restOut: {
    length: 2.6,
    loop: true,
    moves: [
      { move: 'lie', at: 0, for: 0 },
      { move: 'stars', at: 0, for: 2.6 },
      { move: 'breathe', at: 0, for: 2.6, amount: 0.03 },
      { move: 'squash', at: 1.8, for: 0.14, amount: 0.06 },
    ],
    faces: [{ at: 0, face: 'knockedOut' }],
  },
  /** It sits up and opens its eyes. */
  restSitUp: {
    length: 1.8,
    loop: false,
    then: 'restSit',
    moves: [
      { move: 'lie', at: 0, for: 0 },
      { move: 'lie', at: 0.3, for: 0.7, amount: 0 },
      { move: 'slump', at: 0.3, for: 0.7, amount: 0.1 },
      { move: 'wobble', at: 1, for: 0.6, amount: 0.08 },
    ],
    faces: [
      { at: 0, face: 'knockedOut' },
      { at: 0.9, face: 'dozing' },
      { at: 1.4, face: 'tired' },
    ],
  },
  /** Sitting, still tired, breathing slowly. */
  restSit: {
    length: 3.5,
    loop: true,
    moves: [
      { move: 'slump', at: 0, for: 0, amount: 0.1 },
      { move: 'breathe', at: 0, for: 3.5, amount: 0.04 },
    ],
    faces: [{ at: 0, face: 'tired' }],
  },
  /** A long drink of water through a straw, gulp by gulp. */
  restDrink: {
    length: 13,
    loop: false,
    then: 'restSit',
    moves: [
      { move: 'slump', at: 0, for: 0, amount: 0.1 },
      { move: 'drink', at: 0, for: 12 },
      ...gulps(1.2, 7, 1.5),
    ],
    faces: [
      { at: 0, face: 'tired' },
      { at: 0.9, face: 'sipping' },
      { at: 11.6, face: 'neutral' },
    ],
  },
  /** It gets up, stretches tall, and smiles. */
  restStand: {
    length: 1.6,
    loop: false,
    then: 'restReady',
    moves: [
      { move: 'slump', at: 0, for: 0, amount: 0.1 },
      { move: 'squash', at: 0.1, for: 0.3, amount: 0.08 },
      { move: 'slump', at: 0.3, for: 0.4, amount: -0.1 },
      { move: 'squash', at: 0.6, for: 0.8, amount: -0.16 },
    ],
    faces: [
      { at: 0, face: 'tired' },
      { at: 0.6, face: 'sipping' },
      { at: 1.3, face: 'neutral' },
    ],
  },
  /** Standing, nearly ready, bouncing lightly on the spot. */
  restReady: {
    length: 1.2,
    loop: true,
    moves: [{ move: 'squash', at: 0, for: 0.6, amount: 0.04 }],
    faces: [{ at: 0, face: 'neutral' }],
  },
  /** Lives are back: a big jump for joy, then happy hops. */
  restJump: {
    length: 1.4,
    loop: false,
    then: 'celebrate',
    moves: [
      { move: 'squash', at: 0, for: 0.2, amount: 0.14 },
      { move: 'hop', at: 0.15, for: 0.75, amount: 1.1 },
      { move: 'burst', at: 0.3, for: 0.9 },
      { move: 'squash', at: 0.9, for: 0.22, amount: 0.16 },
    ],
    faces: [
      { at: 0, face: 'surprised' },
      { at: 0.2, face: 'happy' },
    ],
  },

  /** An Adventure crash: sitting up a bit dazed, then a sad sigh. */
  dazed: {
    length: 3.4,
    loop: true,
    moves: [
      { move: 'wobble', at: 0, for: 1.4, amount: 0.12 },
      { move: 'breathe', at: 1.8, for: 1.4, amount: 0.04 },
    ],
    faces: [
      { at: 0, face: 'dizzy' },
      { at: 1.2, face: 'sad' },
    ],
  },

  /** A new skin or trail: crouch, jump into a spin, a burst of spores and light, the new look, a happy hop. */
  reveal: {
    length: 2.9,
    loop: false,
    then: 'celebrate',
    moves: [
      { move: 'squash', at: 0, for: 0.3, amount: 0.14 },
      { move: 'hop', at: 0.25, for: 1.3, amount: 0.9 },
      { move: 'spin', at: 0.3, for: 1.1, amount: 2 },
      { move: 'flash', at: 0.75, for: 0.55 },
      // At the flash's brightest, so the old look is never seen turning into the new one.
      { move: 'reveal', at: 1.02, for: 0 },
      { move: 'burst', at: 1.02, for: 1 },
      { move: 'squash', at: 1.55, for: 0.25, amount: 0.18 },
      { move: 'hop', at: 1.8, for: 0.5, amount: 0.5 },
      { move: 'squash', at: 2.3, for: 0.22, amount: 0.14 },
      { move: 'wobble', at: 2.4, for: 0.5, amount: 0.1 },
    ],
    faces: [
      { at: 0, face: 'surprised' },
      { at: 1.15, face: 'happy' },
    ],
  },

  /** Sad, with a slow sigh. */
  sad: {
    length: 3.2,
    loop: true,
    moves: [{ move: 'breathe', at: 0.4, for: 2.4, amount: 0.04 }],
    faces: [{ at: 0, face: 'sad' }],
  },

  /** Happy little hops, after a reveal or a win. */
  celebrate: {
    length: 1.6,
    loop: true,
    moves: [
      { move: 'reveal', at: 0, for: 0 },
      { move: 'hop', at: 0, for: 0.45, amount: 0.35 },
      { move: 'squash', at: 0.45, for: 0.2, amount: 0.1 },
    ],
    faces: [{ at: 0, face: 'happy' }],
  },

  /** Level complete: big cheering jumps. */
  cheer: {
    length: 1.5,
    loop: true,
    moves: [
      { move: 'squash', at: 0, for: 0.15, amount: 0.12 },
      { move: 'hop', at: 0.12, for: 0.55, amount: 0.8 },
      { move: 'squash', at: 0.67, for: 0.2, amount: 0.15 },
      { move: 'wobble', at: 0.8, for: 0.55, amount: 0.14 },
    ],
    faces: [{ at: 0, face: 'happy' }],
  },

  /** A new badge: a hop, then chest out and chin up for a few seconds, then calm again. */
  proud: {
    length: 4,
    loop: false,
    then: 'idle',
    moves: [
      { move: 'squash', at: 0, for: 0.3, amount: 0.1 },
      { move: 'hop', at: 0.2, for: 0.4, amount: 0.3 },
      { move: 'lean', at: 0.6, for: 0.4, amount: -0.12 },
      { move: 'squash', at: 0.6, for: 3, amount: -0.04 },
      { move: 'lean', at: 3.5, for: 0.5, amount: 0.12 },
    ],
    faces: [
      { at: 0, face: 'happy' },
      { at: 0.65, face: 'proud' },
      { at: 3.6, face: 'neutral' },
    ],
  },

  /** The boss appears: leaning away, trembling, sweating. */
  nervous: {
    length: 1.6,
    loop: true,
    moves: [
      { move: 'lean', at: 0, for: 0, amount: 0.1 },
      { move: 'shiver', at: 0, for: 1.6, amount: 0.025 },
    ],
    faces: [{ at: 0, face: 'nervous' }],
  },
} satisfies Record<string, Timeline>;

export type AnimationId = keyof typeof ANIMATIONS;

/**
 * Resting one minute, out of lives: what the avatar does as the rest goes
 * on, by the share of the rest done. It starts as it lay while the player
 * chose (knocked out), then sits up and
 * opening its eyes, a drink of water, standing up, and a jump when the
 * lives are back.
 */
export const RECOVERY: readonly { from: number; play: AnimationId }[] = [
  { from: 0, play: 'restOut' },
  { from: 0.25, play: 'restSitUp' },
  { from: 0.5, play: 'restDrink' },
  { from: 0.75, play: 'restStand' },
  { from: 1, play: 'restJump' },
];

/** The recovery step for a share of the rest done. */
export function recoveryStep(done: number): AnimationId {
  let play: AnimationId = RECOVERY[0]!.play;
  for (const step of RECOVERY) if (done >= step.from) play = step.play;
  return play;
}
