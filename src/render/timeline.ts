import { ANIMATIONS, type AnimationId, type MoveKind, type Timeline } from '../config/animations';
import { blendExpressions, EXPRESSIONS, type Expression, type ExpressionId } from '../config/expressions';

/** How the avatar looks at one moment of an animation. Lengths in mushroom radii. */
export interface AvatarFrame {
  /** Offset from its standing place; negative y is up. */
  x: number;
  y: number;
  /** Radians; positive leans right. */
  rotation: number;
  scaleX: number;
  scaleY: number;
  /** 0 standing, 1 lying on its side. */
  lie: number;
  /** 0 to 1: glowing white. */
  flash: number;
  faceVisible: boolean;
  /** Progress of a burst of spores and light, or null. */
  burst: number | null;
  /** Progress of floating "z z", or null. */
  zzz: number | null;
  /** The new look is on. */
  revealed: boolean;
  face: Expression;
}

/** Seconds a face takes to change into the next. */
const FACE_BLEND = 0.15;

/**
 * What each move does to the frame, given its progress `p` (0 to 1) and its
 * amount. Moves that `hold` keep their end pose once they are over.
 */
const MOVES: Record<MoveKind, { holds: boolean; apply: (frame: AvatarFrame, p: number, amount: number) => void }> = {
  hop: { holds: false, apply: (f, p, a) => { f.y -= a * 4 * p * (1 - p); } },
  squash: {
    holds: false,
    apply: (f, p, a) => {
      const s = Math.sin(p * Math.PI) * a;
      f.scaleX *= 1 + s;
      f.scaleY *= 1 - s;
    },
  },
  spin: {
    holds: false,
    apply: (f, p, a) => {
      const c = Math.cos(p * a * Math.PI * 2);
      // Never quite flat: a sliver stays visible edge-on.
      f.scaleX *= Math.sign(c || 1) * Math.max(0.08, Math.abs(c));
      if (c < 0) f.faceVisible = false;
    },
  },
  flash: { holds: false, apply: (f, p) => { f.flash = Math.max(f.flash, Math.sin(p * Math.PI)); } },
  wobble: { holds: false, apply: (f, p, a) => { f.rotation += a * Math.sin(p * Math.PI * 6) * (1 - p); } },
  shiver: { holds: false, apply: (f, p, a) => { f.x += a * Math.sin(p * 97); } },
  lean: { holds: true, apply: (f, p, a) => { f.rotation += a * smooth(p); } },
  lie: { holds: true, apply: (f, p) => { f.lie = Math.max(f.lie, smooth(p)); } },
  breathe: {
    holds: false,
    apply: (f, p, a) => {
      const s = Math.sin(p * Math.PI) ** 2 * a;
      f.scaleY *= 1 + s;
      f.scaleX *= 1 + s * 0.4;
    },
  },
  burst: { holds: false, apply: (f, p) => { f.burst = p; } },
  zzz: { holds: false, apply: (f, p) => { f.zzz = p; } },
  reveal: { holds: true, apply: (f) => { f.revealed = true; } },
};

/** The frame of `timeline` at `time` seconds since it started. */
export function frameAt(timeline: Timeline, time: number): AvatarFrame {
  const t = timeline.loop ? ((time % timeline.length) + timeline.length) % timeline.length : Math.min(time, timeline.length);
  const frame: AvatarFrame = {
    x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, lie: 0, flash: 0,
    faceVisible: true, burst: null, zzz: null, revealed: false, face: faceAt(timeline, t),
  };
  for (const step of timeline.moves) {
    if (t < step.at) continue;
    const { holds, apply } = MOVES[step.move];
    const end = step.at + step.for;
    if (t > end && !holds) continue;
    const p = step.for === 0 ? 1 : Math.min(1, (t - step.at) / step.for);
    apply(frame, p, step.amount ?? 1);
  }
  return frame;
}

/** The face at `t`: the latest cue, eased in from the one before. */
function faceAt(timeline: Timeline, t: number): Expression {
  const cues = timeline.faces;
  let index = 0;
  for (let i = 0; i < cues.length; i++) if (cues[i]!.at <= t) index = i;
  const cue = cues[index]!;
  const face = EXPRESSIONS[cue.face];
  // In a loop the first face follows the last one.
  const before = index > 0 ? cues[index - 1] : timeline.loop ? cues[cues.length - 1] : undefined;
  if (!before || before === cue) return face;
  return blendExpressions(EXPRESSIONS[before.face], face, (t - cue.at) / FACE_BLEND);
}

/** Plays timelines one after the other: when one ends, its `then` starts. */
export class AvatarPlayer {
  private timeline: Timeline = ANIMATIONS.idle;
  private time = 0;

  /** Starts an animation by id, or any timeline built on the spot. */
  play(animation: AnimationId | Timeline): void {
    this.timeline = typeof animation === 'string' ? ANIMATIONS[animation] : animation;
    this.time = 0;
  }

  update(dt: number): AvatarFrame {
    this.time += dt;
    const { timeline } = this;
    if (!timeline.loop && timeline.then && this.time >= timeline.length) {
      this.time -= timeline.length;
      this.timeline = ANIMATIONS[timeline.then as AnimationId];
    }
    return frameAt(this.timeline, this.time);
  }
}

/** A timeline that only holds one face, still. */
export function holdFace(face: ExpressionId): Timeline {
  return { length: 1, loop: true, moves: [], faces: [{ at: 0, face }] };
}

function smooth(p: number): number {
  return p * p * (3 - 2 * p);
}
