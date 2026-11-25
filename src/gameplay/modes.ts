import { TUNING } from '../config/tuning';
import type { FlightMode } from '../config/levels';
import type { Player } from './player';

const P = TUNING.player;

/**
 * Flight modes: what a tap does and how the mushroom moves between taps.
 * Adventure chapters add new ones (bounce, flip, swing to come); a portal in a
 * level switches the mode. Each mode is one entry here, nothing else changes.
 */
export type { FlightMode };

interface ModeRules {
  /** A tap. */
  tap(player: Player): void;
  /** One step of `dt` seconds between taps. */
  step(player: Player, dt: number): void;
  /** Switching into this mode, keeping the motion's feel (a dive stays a dive). */
  enter(player: Player): void;
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
    enter() {},
  },
  /**
   * A dandelion seed: no gravity, a steady climb or a steady dive. A tap turns
   * it the other way, so the path is a zigzag through winding tunnels.
   */
  glide: {
    tap(player) {
      player.climbing = !player.climbing;
    },
    step(player, dt) {
      const target = player.climbing ? -P.glideSpeed : P.glideSpeed;
      const change = P.glideTurn * dt;
      player.vy = player.vy < target ? Math.min(target, player.vy + change) : Math.max(target, player.vy - change);
      player.y += player.vy * dt;
    },
    enter(player) {
      player.climbing = player.vy < 0;
    },
  },
};

/** Switches the mushroom to another flight mode. */
export function setMode(player: Player, mode: FlightMode): void {
  if (player.mode === mode) return;
  player.mode = mode;
  MODES[mode].enter(player);
}
