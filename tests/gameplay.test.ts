import { describe, expect, it } from 'vitest';
import { TUNING } from '../src/config/tuning';
import { createRandom } from '../src/core/random';
import { STEP_SECONDS } from '../src/core/loop';
import { circleHitsRect } from '../src/gameplay/collision';
import { createCombo, extendCombo, isFever, pointsForPass, stepCombo } from '../src/gameplay/combo';
import { gapSizeFor, makeRoot } from '../src/gameplay/spawner';
import { createWorld, flapPlayer, stepWorld, type World } from '../src/gameplay/world';

const WIDTH = 390;
const HEIGHT = 700;

function run(world: World, seconds: number, onStep?: (w: World) => void): void {
  const steps = Math.round(seconds / STEP_SECONDS);
  for (let i = 0; i < steps; i++) {
    stepWorld(world, STEP_SECONDS);
    onStep?.(world);
  }
}

/** Flaps whenever the mushroom drops below the centre of the next gap. */
function autopilot(world: World): void {
  const next = world.roots.find((root) => root.x + root.width > world.player.x - world.player.radius);
  const target = next ? next.gapCenter + 10 : world.height * 0.45;
  if (world.player.y > target && world.player.vy > 0) flapPlayer(world);
}

describe('random', () => {
  it('replays the same numbers for the same seed', () => {
    const a = createRandom(42);
    const b = createRandom(42);
    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());
    expect(seqA).toEqual(seqB);
    seqA.forEach((n) => expect(n).toBeGreaterThanOrEqual(0));
    seqA.forEach((n) => expect(n).toBeLessThan(1));
  });
});

describe('player physics', () => {
  it('falls without flapping and crashes into the ground', () => {
    const world = createWorld(WIDTH, HEIGHT, createRandom(1));
    run(world, 3);
    expect(world.crashed).toBe(true);
    expect(world.events.some((e) => e.type === 'crash')).toBe(true);
  });

  it('a flap always gives the same upward speed', () => {
    const world = createWorld(WIDTH, HEIGHT, createRandom(1));
    run(world, 0.3);
    flapPlayer(world);
    expect(world.player.vy).toBe(TUNING.player.flapVelocity);
    run(world, 0.1);
    flapPlayer(world);
    expect(world.player.vy).toBe(TUNING.player.flapVelocity);
  });

  it('bumps off the ceiling instead of crashing', () => {
    const world = createWorld(WIDTH, HEIGHT, createRandom(1));
    world.roots = [];
    world.distanceSinceSpawn = -1e9; // no roots in this test
    for (let i = 0; i < 20; i++) {
      flapPlayer(world);
      run(world, 0.05);
    }
    expect(world.crashed).toBe(false);
    expect(world.player.y).toBeGreaterThanOrEqual(world.player.radius);
  });
});

describe('collision', () => {
  it('detects circle overlapping a rectangle edge', () => {
    expect(circleHitsRect(0, 0, 10, 5, -5, 10, 10)).toBe(true);
    expect(circleHitsRect(0, 0, 10, 11, -5, 10, 10)).toBe(false);
  });
});

describe('combo', () => {
  it('raises the multiplier at the thresholds and enters fever once', () => {
    const combo = createCombo();
    const multipliers: number[] = [];
    let feverEntries = 0;
    for (let i = 0; i < 10; i++) {
      if (extendCombo(combo)) feverEntries += 1;
      multipliers.push(combo.multiplier);
    }
    expect(multipliers).toEqual([1, 2, 2, 3, 3, 4, 4, 5, 5, 5]);
    expect(feverEntries).toBe(1);
    expect(isFever(combo)).toBe(true);
    expect(pointsForPass(combo)).toBe(10);
  });

  it('breaks after the window runs out', () => {
    const combo = createCombo();
    extendCombo(combo);
    extendCombo(combo);
    stepCombo(combo, TUNING.combo.windowSeconds + 0.01);
    expect(combo).toEqual(createCombo());
  });
});

describe('spawner', () => {
  it('shrinks the gap with progress but never below the minimum', () => {
    expect(gapSizeFor(0)).toBe(TUNING.roots.gapStart);
    expect(gapSizeFor(1000)).toBe(TUNING.roots.gapMin);
  });

  it('keeps gap centres inside the allowed band', () => {
    const rng = createRandom(7);
    let previous: number | null = null;
    for (let i = 0; i < 200; i++) {
      const root = makeRoot(rng, 0, HEIGHT, i, previous);
      expect(root.gapCenter).toBeGreaterThanOrEqual(root.centerMin);
      expect(root.gapCenter).toBeLessThanOrEqual(root.centerMax);
      if (previous !== null) {
        expect(Math.abs(root.gapCenter - previous)).toBeLessThanOrEqual(TUNING.roots.maxCenterStep);
      }
      previous = root.gapCenter;
    }
  });

  it('starts moving gaps only after enough roots', () => {
    const rng = createRandom(3);
    expect(makeRoot(rng, 0, HEIGHT, 0, null).motion.kind).toBe('still');
    expect(makeRoot(rng, 0, HEIGHT, TUNING.roots.sway.fromRoot, null).motion.kind).toBe('sway');
  });
});

describe('a full round', () => {
  it('is deterministic for a seed', () => {
    const play = (): number[] => {
      const world = createWorld(WIDTH, HEIGHT, createRandom(99));
      run(world, 20, autopilot);
      return [world.score, world.rootsPassed, world.coins, Math.round(world.player.y)];
    };
    expect(play()).toEqual(play());
  });

  it('scores points when flying through gaps', () => {
    const world = createWorld(WIDTH, HEIGHT, createRandom(5));
    run(world, 15, autopilot);
    expect(world.rootsPassed).toBeGreaterThan(3);
    expect(world.score).toBeGreaterThanOrEqual(world.rootsPassed);
  });
});
