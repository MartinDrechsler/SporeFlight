import type { Loop } from './core/loop';
import type { StateMachine } from './core/stateMachine';
import { pickupPosition } from './gameplay/pickups';
import { gapBottom, gapTop, rootLeft } from './gameplay/roots';
import { flapPlayer } from './gameplay/world';
import type { GameContext, StateName } from './states/context';

/**
 * Hooks for automated phone tests, only installed with `?test=1` in the URL.
 * In test mode the loop does not run on its own: tests advance time exactly.
 */
declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => void;
    __test?: {
      flap(): void;
      tap(): void;
      go(state: StateName): void;
      seed(value: number): void;
      setSave(patch: Record<string, unknown>): void;
      invulnerable(on: boolean): void;
      skipAd(): void;
    };
  }
}

export function installTestHooks(
  ctx: GameContext,
  machine: StateMachine<StateName>,
  loop: Loop,
  reseed: (seed: number) => void,
): void {
  window.render_game_to_text = () => {
    const { world } = ctx;
    return JSON.stringify({
      coords: 'origin top-left, +y down, CSS pixels',
      state: machine.current,
      level: { id: world.level.id, name: world.level.name },
      field: { width: world.width, height: world.height, groundY: world.groundY },
      player: { x: round(world.player.x), y: round(world.player.y), vy: round(world.player.vy), radius: world.player.radius },
      roots: world.roots.map((r) => ({
        left: round(rootLeft(r)), right: round(rootLeft(r) + r.width), gapTop: round(gapTop(r)), gapBottom: round(gapBottom(r)),
        gapCenter: round(r.gapCenter), motion: r.motion.kind, vein: r.vein,
      })),
      pickups: world.pickups.map((p) => ({ kind: p.kind, ...pickupPosition(p) })),
      winds: world.winds.map((w) => ({ kind: w.kind, x: round(w.x), width: round(w.width) })),
      round: { ...world.stats, shield: world.shield, magnet: round(world.magnetTime), crashed: world.crashed, landedTime: world.landedTime },
      save: ctx.save,
    });
  };
  window.advanceTime = (ms) => loop.advance(ms / 1000);
  window.__test = {
    flap: () => flapPlayer(ctx.world),
    tap: () => machine.tap(),
    go: (state) => machine.go(state),
    seed: (value) => reseed(value),
    setSave: (patch) => {
      Object.assign(ctx.save, patch);
      ctx.persist();
    },
    invulnerable: (on) => {
      ctx.world.invulnerableTime = on ? Infinity : 0;
    },
    skipAd: () => document.getElementById('ad-skip')?.click(),
  };
  loop.advance(0);
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
