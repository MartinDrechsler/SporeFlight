import { TUNING } from '../config/tuning';

const P = TUNING.player;

export interface Player {
  x: number;
  y: number;
  /** Vertical speed in px/s, positive is down. */
  vy: number;
  readonly radius: number;
  /** Seconds since the last flap; drives the squash-and-stretch animation. */
  sinceFlap: number;
}

export function createPlayer(fieldWidth: number, fieldHeight: number): Player {
  return {
    x: fieldWidth * P.startXFraction,
    y: fieldHeight * P.startYFraction,
    vy: 0,
    radius: P.radius,
    sinceFlap: Infinity,
  };
}

/** A flap always sets the same upward speed, so every jump has the same air time. */
export function flap(player: Player): void {
  player.vy = P.flapVelocity;
  player.sinceFlap = 0;
}

export function stepPlayer(player: Player, dt: number): void {
  player.vy = Math.min(player.vy + P.gravity * dt, P.maxFallSpeed);
  player.y += player.vy * dt;
  player.sinceFlap += dt;
}
