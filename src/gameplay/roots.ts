/**
 * A root obstacle: a column from the ceiling and one from the ground with a
 * gap between them. How a gap moves is described by data (`motion`), so new
 * kinds of movement are added here without touching any other module.
 */
export type RootMotion =
  | { kind: 'still' }
  /** Moves up and down at constant speed, bouncing at the limits. */
  | { kind: 'drift'; speed: number; direction: -1 | 1 }
  /** Swings smoothly around a fixed centre. */
  | { kind: 'sway'; baseCenter: number; amplitude: number; frequency: number; phase: number };

export interface Root {
  x: number;
  width: number;
  gapCenter: number;
  gapSize: number;
  /** Limits the gap centre may move within. */
  centerMin: number;
  centerMax: number;
  motion: RootMotion;
  /** Set once the player has flown past it. */
  passed: boolean;
}

export function gapTop(root: Root): number {
  return root.gapCenter - root.gapSize / 2;
}

export function gapBottom(root: Root): number {
  return root.gapCenter + root.gapSize / 2;
}

export function stepRoot(root: Root, dt: number, scrollSpeed: number): void {
  root.x -= scrollSpeed * dt;
  const motion = root.motion;

  switch (motion.kind) {
    case 'still':
      break;
    case 'drift': {
      root.gapCenter += motion.speed * motion.direction * dt;
      if (root.gapCenter <= root.centerMin) motion.direction = 1;
      if (root.gapCenter >= root.centerMax) motion.direction = -1;
      break;
    }
    case 'sway': {
      motion.phase += motion.frequency * dt;
      root.gapCenter = motion.baseCenter + Math.sin(motion.phase) * motion.amplitude;
      break;
    }
  }

  root.gapCenter = Math.min(root.centerMax, Math.max(root.centerMin, root.gapCenter));
}
