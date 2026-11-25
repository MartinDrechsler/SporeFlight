import { sin } from '../core/fmath';
import { TUNING } from '../config/tuning';
import type { Vein } from './veins';

const R = TUNING.roots;

/**
 * A root obstacle: a column from the ceiling and one from the ground with
 * a gap between them. Everything a root can do (move, breathe, slide) is
 * described by data on the root itself, and all of it is animated here.
 */
export type RootMotion =
  | { kind: 'still' }
  /** Moves up and down at constant speed, bouncing at the limits. */
  | { kind: 'drift'; speed: number; direction: -1 | 1 }
  /** Swings smoothly around a fixed centre. */
  | { kind: 'sway'; baseCenter: number; amplitude: number; frequency: number; phase: number };

export interface Root {
  /** Its number in the round, counting from 0. */
  index: number;
  x: number;
  width: number;
  /** Sideways offset while sliding; the root's real left edge is x + xOffset. */
  xOffset: number;
  gapCenter: number;
  gapSize: number;
  /** Limits the gap centre may move within. */
  centerMin: number;
  centerMax: number;
  motion: RootMotion;
  /** Gap breathing between min and max. */
  gapPulse: { min: number; max: number; phase: number } | null;
  slidePhase: number | null;
  /** A crystal vein on one of the caps, if this root has one. */
  vein: Vein | null;
  /**
   * A fork's second gap, `offset` px from the main gap's centre (it moves with it), past a pillar. A secret
   * one leads to a secret level. Null: an ordinary root.
   */
  extra: { offset: number; size: number; secret: boolean } | null;
  /** The level's checkpoint stands just after this root. */
  checkpoint: boolean;
  passed: boolean;
  /** 'close' once the mushroom brushed it; it only becomes a near miss ('counted') when the mushroom gets past alive. */
  nearMiss: 'none' | 'close' | 'counted';
}

export function rootLeft(root: Root): number {
  return root.x + root.xOffset;
}

export function gapTop(root: Root): number {
  return root.gapCenter - root.gapSize / 2;
}

export function gapBottom(root: Root): number {
  return root.gapCenter + root.gapSize / 2;
}

/** The fork's second gap, top and bottom, or null. */
export function extraGap(root: Root): { top: number; bottom: number } | null {
  if (!root.extra) return null;
  const center = root.gapCenter + root.extra.offset;
  return { top: center - root.extra.size / 2, bottom: center + root.extra.size / 2 };
}

/**
 * The solid pieces of a root from top to ground, as [top, bottom] spans: two
 * columns, or three with a pillar between a fork's two gaps.
 */
export function solidSpans(root: Root, groundY: number): [number, number][] {
  const gaps = [{ top: gapTop(root), bottom: gapBottom(root) }];
  const extra = extraGap(root);
  if (extra) gaps.push(extra);
  gaps.sort((a, b) => a.top - b.top);
  const spans: [number, number][] = [];
  let from = 0;
  for (const gap of gaps) {
    spans.push([from, gap.top]);
    from = gap.bottom;
  }
  spans.push([from, groundY]);
  return spans;
}

export function stepRoot(root: Root, dt: number, scrollSpeed: number): void {
  root.x -= scrollSpeed * dt;

  if (root.gapPulse) {
    const pulse = root.gapPulse;
    pulse.phase += R.gapPulseSpeed * dt;
    const middle = (pulse.min + pulse.max) / 2;
    root.gapSize = middle + sin(pulse.phase) * ((pulse.max - pulse.min) / 2);
  }
  if (root.slidePhase !== null) {
    root.slidePhase += R.slideSpeed * dt;
    root.xOffset = sin(root.slidePhase) * R.slideAmplitude;
  }

  moveGap(root, dt);
}

function moveGap(root: Root, dt: number): void {
  const motion = root.motion;
  switch (motion.kind) {
    case 'still':
      return;
    case 'drift':
      root.gapCenter += motion.speed * motion.direction * dt;
      if (root.gapCenter <= root.centerMin) motion.direction = 1;
      if (root.gapCenter >= root.centerMax) motion.direction = -1;
      break;
    case 'sway':
      motion.phase += motion.frequency * dt;
      root.gapCenter = motion.baseCenter + sin(motion.phase) * motion.amplitude;
      break;
  }
  root.gapCenter = Math.min(root.centerMax, Math.max(root.centerMin, root.gapCenter));
}
