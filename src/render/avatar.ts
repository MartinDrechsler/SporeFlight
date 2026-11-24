import { hash } from './color';

/**
 * How the mushroom is shown, apart from where the flight rules put it: shifted
 * sideways, bigger, glancing and blinking. Only the drawing changes, so flights
 * and their replays are never affected.
 */
export interface Pose {
  /** Drawn this many px to the right of its real position. */
  shiftX: number;
  scale: number;
  /** Where the eyes look: -1 left, 0 ahead, 1 right. */
  gaze: number;
  /** 0 eyes open, 1 closed. */
  blink: number;
}

export const NEUTRAL_POSE: Pose = { shiftX: 0, scale: 1, gaze: 0, blink: 0 };

/** On the home screen the mushroom is the player's avatar: centred and up to this much bigger. */
const AVATAR_MAX_SCALE = 1.7;
/** The avatar's height, bob included, in mushroom radii at normal size. */
const AVATAR_HEIGHT_IN_RADII = 3.2;

/** As big as the avatar can be in a space `room` px tall: never bigger than the maximum, never smaller than in flight. */
export function avatarScale(room: number, radius: number): number {
  return Math.min(AVATAR_MAX_SCALE, Math.max(1, room / (radius * AVATAR_HEIGHT_IN_RADII)));
}

const BLINK_EVERY = 3.4;
const BLINK_SECONDS = 0.16;
const GAZE_EVERY = 2.2;

/**
 * The idle life of the avatar at `time` seconds: a blink every few seconds
 * (sometimes two quick ones), and now and then a glance to one side.
 */
export function idleLook(time: number): { gaze: number; blink: number } {
  return { gaze: gazeAt(time), blink: blinkAt(time) };
}

function blinkAt(time: number): number {
  const cycle = Math.floor(time / BLINK_EVERY);
  const into = time - cycle * BLINK_EVERY;
  const double = hash(cycle + 0.5) < 0.3;
  const blinkAtStart = (start: number): number => {
    const t = (into - start) / BLINK_SECONDS;
    return t >= 0 && t <= 1 ? 1 - Math.abs(t * 2 - 1) : 0;
  };
  return Math.max(blinkAtStart(0), double ? blinkAtStart(BLINK_SECONDS * 1.6) : 0);
}

/** Each stretch of time looks somewhere (mostly ahead), easing from the last place to the next. */
function gazeAt(time: number): number {
  const stretch = Math.floor(time / GAZE_EVERY);
  const target = (n: number): number => {
    const roll = hash(n * 7.3 + 1);
    if (roll < 0.25) return -1;
    if (roll < 0.5) return 1;
    return 0;
  };
  const t = Math.min(1, (time - stretch * GAZE_EVERY) / 0.25);
  const eased = t * t * (3 - 2 * t);
  return target(stretch - 1) + (target(stretch) - target(stretch - 1)) * eased;
}

/** Eases any pose back to the normal one; call every frame outside the home screen. */
export function relaxPose(pose: Pose, dt: number): Pose {
  const keep = Math.exp(-dt * 10);
  return {
    shiftX: Math.abs(pose.shiftX) < 0.5 ? 0 : pose.shiftX * keep,
    scale: 1 + (pose.scale - 1) * keep,
    gaze: pose.gaze * keep,
    blink: 0,
  };
}
