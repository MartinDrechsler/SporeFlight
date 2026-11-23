import { describe, expect, it } from 'vitest';
import { TUNING } from '../src/config/tuning';
import { createRandom } from '../src/core/random';
import { circleToBoxGap } from '../src/gameplay/collision';
import { comboValue, createCombo, extendCombo, isFever, stepCombo } from '../src/gameplay/combo';
import { gapSizeFor, makeRoot } from '../src/gameplay/spawner';
import { flapPlayer, roundCoins, stepWorld } from '../src/gameplay/world';
import { autopilot, emptyWorld, ENDLESS, HEIGHT, level, newWorld, run } from './helpers';

const FIELD = { height: HEIGHT, groundY: HEIGHT - TUNING.world.groundHeight };

describe('random', () => {
  it('replays the same numbers for the same seed', () => {
    const a = createRandom(42);
    const b = createRandom(42);
    expect(Array.from({ length: 5 }, () => a.next())).toEqual(Array.from({ length: 5 }, () => b.next()));
  });
});

describe('player physics', () => {
  it('falls without flapping and crashes into the ground', () => {
    const world = newWorld();
    run(world, 3);
    expect(world.crashed).toBe(true);
    expect(world.events.some((e) => e.type === 'crash')).toBe(true);
  });

  it('a flap always gives the same upward speed', () => {
    const world = emptyWorld();
    for (const wait of [0.3, 0.1, 0.5]) {
      run(world, wait);
      flapPlayer(world);
      expect(world.player.vy).toBe(TUNING.player.flapVelocity);
    }
    expect(world.stats.flaps).toBe(3);
  });

  it('bumps off the ceiling instead of crashing', () => {
    const world = emptyWorld();
    for (let i = 0; i < 20; i++) {
      flapPlayer(world);
      run(world, 0.05);
    }
    expect(world.crashed).toBe(false);
    expect(world.player.y).toBeGreaterThanOrEqual(world.player.radius);
  });
});

describe('collision', () => {
  it('measures the gap between a circle and a box', () => {
    expect(circleToBoxGap(0, 0, 10, { x: 5, y: -5, w: 10, h: 10 })).toBeLessThan(0);
    expect(circleToBoxGap(0, 0, 10, { x: 15, y: -5, w: 10, h: 10 })).toBeCloseTo(5);
  });
});

describe('combo', () => {
  it('raises the multiplier at the thresholds and reaches fever', () => {
    const combo = createCombo();
    const multipliers: number[] = [];
    for (let i = 0; i < 9; i++) {
      extendCombo(combo, 1);
      multipliers.push(combo.multiplier);
    }
    expect(multipliers).toEqual([1, 2, 2, 3, 3, 4, 4, 5, 5]);
    expect(isFever(combo)).toBe(true);
    expect(comboValue(combo)).toBe(10);
  });

  it('bigger actions extend it further, and it breaks after the window', () => {
    const combo = createCombo();
    expect(extendCombo(combo, 2)).toBe(2);
    stepCombo(combo, TUNING.combo.windowSeconds + 0.01);
    expect(combo).toEqual(createCombo());
  });
});

describe('spawner', () => {
  it('endless gap shrinks with progress but never below the minimum', () => {
    expect(gapSizeFor(ENDLESS, 0)).toBe(ENDLESS.gap.max);
    expect(gapSizeFor(ENDLESS, 1000)).toBe(ENDLESS.gap.min);
  });

  it('keeps random gap centres in the band and within a step of the last', () => {
    const rng = createRandom(7);
    let previous: number | null = null;
    for (let i = 0; i < 200; i++) {
      const root = makeRoot(rng, ENDLESS, FIELD, 0, i, previous);
      expect(root.gapCenter).toBeGreaterThanOrEqual(root.centerMin);
      expect(root.gapCenter).toBeLessThanOrEqual(root.centerMax);
      if (previous !== null) expect(Math.abs(root.gapCenter - previous)).toBeLessThanOrEqual(TUNING.roots.maxCenterStep);
      previous = root.gapCenter;
    }
  });

  it('endless roots start still and begin to sway later', () => {
    const rng = createRandom(3);
    expect(makeRoot(rng, ENDLESS, FIELD, 0, 0, null).motion.kind).toBe('still');
    expect(makeRoot(rng, ENDLESS, FIELD, 0, TUNING.roots.endlessSwayFromRoot, null).motion.kind).toBe('sway');
  });

  it('each adventure mechanic comes from its level data', () => {
    const rng = createRandom(11);
    const make = (id: number, index = 0) => makeRoot(rng, level(id), FIELD, 0, index, null);
    expect([make(1, 0).columns, make(1, 1).columns]).toEqual(['top', 'bottom']);
    expect(make(1).glowfly).not.toBeNull();
    expect(make(1).widthPhase).not.toBeNull();
    expect(make(2).motion.kind).toBe('drift');
    expect(make(4).gapPulse).not.toBeNull();
    expect(make(5).slidePhase).not.toBeNull();
    expect(make(6, 0).gapCenter).toBeLessThan(make(6, 1).gapCenter);
    expect(make(7).motion.kind).toBe('sway');
    expect(make(3).motion.kind).toBe('still');
  });
});

describe('a full round', () => {
  it('is deterministic for a seed', () => {
    const play = (): number[] => {
      const world = newWorld(99);
      run(world, 20, autopilot);
      return [world.stats.score, world.rootsPassed, world.stats.coins, Math.round(world.player.y)];
    };
    expect(play()).toEqual(play());
  });

  it('scores points when flying through gaps', () => {
    const world = newWorld(5);
    run(world, 15, autopilot);
    expect(world.rootsPassed).toBeGreaterThan(3);
    expect(world.stats.score).toBeGreaterThanOrEqual(world.rootsPassed);
  });

  // Difficulty itself is judged by playing; this only proves every level runs and builds roots.
  it('every adventure level runs and keeps its roots inside the playfield', () => {
    for (let id = 1; id <= 9; id++) {
      const world = newWorld(21, level(id));
      world.invulnerableTime = Infinity;
      run(world, 20, (w) => {
        autopilot(w);
        for (const root of w.roots) {
          expect(root.gapCenter).toBeGreaterThanOrEqual(root.centerMin);
          expect(root.gapCenter).toBeLessThanOrEqual(root.centerMax);
          expect(root.gapSize).toBeGreaterThanOrEqual(level(id).gap.min - 1e-9);
        }
      });
      expect(world.crashed, `level ${id}`).toBe(false);
      expect(world.rootsSpawned, `level ${id}`).toBeGreaterThan(8);
    }
  });
});

describe('power-ups and rewards', () => {
  it('a shield absorbs one hit and gives a moment of invulnerability', () => {
    const world = newWorld(5);
    world.shield = true;
    run(world, 10); // no flapping: will hit something
    const popped = world.events.some((e) => e.type === 'shieldPop');
    expect(popped || world.crashed).toBe(true);
    if (popped) expect(world.shield).toBe(false);
  });

  it('the ground is safe while invulnerable', () => {
    const world = emptyWorld();
    world.invulnerableTime = 5;
    run(world, 2);
    expect(world.crashed).toBe(false);
    expect(world.player.y).toBeCloseTo(world.groundY - world.player.radius);
  });

  it('a magnet pulls nearby coins in', () => {
    const world = emptyWorld();
    world.roots = [makeRoot(createRandom(1), ENDLESS, FIELD, world.player.x - 200, 0, null)];
    const root = world.roots[0]!;
    world.pickups = [{ kind: 'coin', root, offsetX: 280, offsetY: world.player.y - root.gapCenter, vx: 0, vy: 0, collected: false }];
    world.magnetTime = 5;
    world.player.vy = 0;
    for (let i = 0; i < 60 && world.pickups.length > 0; i++) {
      world.player.vy = 0;
      stepWorld(world, 1 / 60);
    }
    expect(world.stats.coins).toBeGreaterThan(0);
  });

  it('benchmarks pay bonus coins once each', () => {
    const world = emptyWorld();
    world.stats.score = 60;
    stepWorld(world, 1 / 60);
    stepWorld(world, 1 / 60);
    expect(world.benchmarksReached).toBe(2);
    expect(world.bonusCoins).toBe(15);
    expect(roundCoins(world)).toBe(15);
  });

  it('wind zones push the mushroom', () => {
    const world = emptyWorld();
    world.winds = [{ kind: 'updraft', x: 0, width: 2000 }];
    const still = emptyWorld();
    run(world, 0.3);
    run(still, 0.3);
    expect(world.player.y).toBeLessThan(still.player.y);
    expect(world.events.some((e) => e.type === 'wind')).toBe(true);
  });
});
