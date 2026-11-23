import { LEVELS, levelById, type LevelConfig } from '../src/config/levels';
import { STEP_SECONDS } from '../src/core/loop';
import { createRandom } from '../src/core/random';
import { rootLeft } from '../src/gameplay/roots';
import { createWorld, flapPlayer, stepWorld, type World } from '../src/gameplay/world';

export const WIDTH = 390;
export const HEIGHT = 700;
export const ENDLESS = LEVELS[0]!;

export function newWorld(seed = 1, level: LevelConfig = ENDLESS): World {
  return createWorld(WIDTH, HEIGHT, level, createRandom(seed));
}

export function level(id: number): LevelConfig {
  return levelById(id);
}

export function run(world: World, seconds: number, onStep?: (w: World) => void): void {
  const steps = Math.round(seconds / STEP_SECONDS);
  for (let i = 0; i < steps && !world.crashed; i++) {
    onStep?.(world);
    stepWorld(world, STEP_SECONDS);
  }
}

/** Flaps whenever the mushroom drops below the centre of the next gap. */
export function autopilot(world: World): void {
  const next = world.roots.find((root) => rootLeft(root) + root.width > world.player.x - world.player.radius);
  const target = next ? next.gapCenter + 10 : world.height * 0.45;
  if (world.player.y > target && world.player.vy > 0) flapPlayer(world);
}

/** A world with no roots, pickups or wind, for testing one mechanic at a time. */
export function emptyWorld(seed = 1, level: LevelConfig = ENDLESS): World {
  const world = newWorld(seed, { ...level, wind: false });
  world.distanceSinceSpawn = -1e9;
  return world;
}
