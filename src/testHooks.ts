import type { Loop } from './core/loop';
import type { StateMachine } from './core/stateMachine';
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
      seed(value: number): void;
      finishRest(): void;
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
      field: { width: world.width, height: world.height, groundY: world.groundY },
      player: { x: round(world.player.x), y: round(world.player.y), vy: round(world.player.vy) },
      roots: world.roots.map((r) => ({ x: round(r.x), gapCenter: round(r.gapCenter), gapSize: round(r.gapSize), motion: r.motion.kind })),
      pickups: world.pickups.map((p) => ({ kind: p.kind, x: round(p.x), y: round(p.y) })),
      round: { score: world.score, coins: world.coins, diamonds: world.diamonds, combo: world.combo.multiplier, crashed: world.crashed },
      save: ctx.save,
    });
  };
  window.advanceTime = (ms) => loop.advance(ms / 1000);
  window.__test = {
    flap: () => flapPlayer(ctx.world),
    tap: () => machine.tap(),
    seed: (value) => reseed(value),
    finishRest: () => {
      ctx.save.restUntil = 1;
    },
  };
  loop.advance(0);
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
