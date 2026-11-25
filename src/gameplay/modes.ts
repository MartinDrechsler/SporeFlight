import { TUNING } from '../config/tuning';
import type { Player } from './player';

const P = TUNING.player;

/**
 * Flight modes: what a tap does and how the mushroom moves between taps.
 * Adventure chapters add new ones (glide, bounce, flip, swing); a portal in a
 * level switches the mode. Each mode is one entry here, nothing else changes.
 */
export type FlightMode = 'flap';

interface ModeRules {
  /** A tap. */
  tap(player: Player): void;
  /** One step of `dt` seconds between taps. */
  step(player: Player, dt: number): void;
}

export const MODES: Record<FlightMode, ModeRules> = {
  /** A flap always sets the same upward speed; rising is soft and round, falling pulls harder (Flappy-style). */
  flap: {
    tap(player) {
      player.vy = P.flapVelocity;
    },
    step(player, dt) {
      const pull = player.vy < 0 ? P.gravity : P.fallGravity;
      player.vy = Math.min(player.vy + pull * dt, P.maxFallSpeed);
      player.y += player.vy * dt;
    },
  },
};
