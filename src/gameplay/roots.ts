import { TUNING } from '../config/tuning';

const R = TUNING.roots;
const G = TUNING.glowflies;

/**
 * A root obstacle: a column from the ceiling and/or one from the ground with
 * a gap between them. Everything a root can do (move, breathe, slide) is
 * described by data on the root itself, and all of it is animated here.
 */
export type RootMotion =
  | { kind: 'still' }
  /** Moves up and down at constant speed, bouncing at the limits. */
  | { kind: 'drift'; speed: number; direction: -1 | 1 }
  /** Swings smoothly around a fixed centre. */
  | { kind: 'sway'; baseCenter: number; amplitude: number; frequency: number; phase: number };

/** Which columns exist: both, only the one hanging from the top, or only the one rising from the ground. */
export type ColumnSet = 'both' | 'top' | 'bottom';

export interface Root {
  x: number;
  width: number;
  /** Sideways offset while sliding; the root's real left edge is x + xOffset. */
  xOffset: number;
  gapCenter: number;
  gapSize: number;
  /** Limits the gap centre may move within. */
  centerMin: number;
  centerMax: number;
  columns: ColumnSet;
  motion: RootMotion;
  /** Gap breathing between min and max. */
  gapPulse: { min: number; max: number; phase: number } | null;
  slidePhase: number | null;
  widthPhase: number | null;
  /** A glowing swarm hovering in the open side of a one-column root. */
  glowfly: { baseY: number; phase: number } | null;
  passed: boolean;
  nearMissCounted: boolean;
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

export function glowflyPosition(root: Root): { x: number; y: number } | null {
  if (!root.glowfly) return null;
  return {
    x: rootLeft(root) + root.width / 2,
    y: root.glowfly.baseY + Math.sin(root.glowfly.phase) * G.bobAmplitude,
  };
}

export function stepRoot(root: Root, dt: number, scrollSpeed: number): void {
  root.x -= scrollSpeed * dt;

  if (root.gapPulse) {
    const pulse = root.gapPulse;
    pulse.phase += R.gapPulseSpeed * dt;
    const middle = (pulse.min + pulse.max) / 2;
    root.gapSize = middle + Math.sin(pulse.phase) * ((pulse.max - pulse.min) / 2);
  }
  if (root.widthPhase !== null) {
    root.widthPhase += R.widthPulseSpeed * dt;
    root.width = R.width + Math.sin(root.widthPhase) * R.widthPulseAmplitude;
  }
  if (root.slidePhase !== null) {
    root.slidePhase += R.slideSpeed * dt;
    root.xOffset = Math.sin(root.slidePhase) * R.slideAmplitude;
  }
  if (root.glowfly) root.glowfly.phase += G.bobSpeed * dt;

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
      root.gapCenter = motion.baseCenter + Math.sin(motion.phase) * motion.amplitude;
      break;
  }
  root.gapCenter = Math.min(root.centerMax, Math.max(root.centerMin, root.gapCenter));
}
