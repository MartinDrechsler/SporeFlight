import { TUNING } from '../config/tuning';
import type { FlightMode } from '../config/levels';
import { MODES } from './modes';

const P = TUNING.player;

export interface Player {
  x: number;
  y: number;
  /** Vertical speed in px/s, positive is down. */
  vy: number;
  readonly radius: number;
  /** Seconds since the last flap; drives the squash-and-stretch animation. */
  sinceFlap: number;
  /** What a tap does and how it moves between taps (gameplay/modes.ts). */
  mode: FlightMode;
  /** Glide mode: climbing (true) or diving. */
  climbing: boolean;
}

export function createPlayer(fieldWidth: number, fieldHeight: number): Player {
  return {
    x: fieldWidth * P.startXFraction,
    y: fieldHeight * P.startYFraction,
    vy: 0,
    radius: P.radius,
    sinceFlap: Infinity,
    mode: 'flap',
    climbing: false,
  };
}

/** A tap, as the current flight mode answers it. */
export function flap(player: Player): void {
  MODES[player.mode].tap(player);
  player.sinceFlap = 0;
}

/** One step of movement in the current flight mode. */
export function stepPlayer(player: Player, dt: number): void {
  MODES[player.mode].step(player, dt);
  player.sinceFlap += dt;
}
