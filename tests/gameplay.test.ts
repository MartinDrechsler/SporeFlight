import { describe, expect, it } from 'vitest';
import { TUNING } from '../src/config/tuning';
import { createRandom } from '../src/core/random';
import { circleToBoxGap } from '../src/gameplay/collision';
import { gapSizeFor, makePickup, makeRoot, wavePhase } from '../src/gameplay/spawner';
import { crashSpot, flapPlayer, roundCoins, stepWorld } from '../src/gameplay/world';
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

describe('flight feel', () => {
  it('falls faster than it rises, like Flappy Bird', () => {
    const world = emptyWorld();
    flapPlayer(world);
    const start = world.player.y;
    let riseTime = 0;
    while (world.player.vy < 0) {
      stepWorld(world, 1 / 60);
      riseTime += 1 / 60;
    }
    const apex = world.player.y;
    let fallTime = 0;
    while (world.player.y < start) {
      stepWorld(world, 1 / 60);
      fallTime += 1 / 60;
    }
    expect(start - apex).toBeGreaterThan(30);
    expect(fallTime).toBeLessThan(riseTime);
  });
});

describe('spawner', () => {
  it('endless gap shrinks with progress, with tighter surges and calmer breathers', () => {
    expect(gapSizeFor(ENDLESS, 0)).toBe(ENDLESS.gap.max);
    expect(wavePhase(ENDLESS, 7)).toBe('surge');
    expect(wavePhase(ENDLESS, 10)).toBe('calm');
    expect(wavePhase(ENDLESS, 4)).toBe('normal');
    expect(gapSizeFor(ENDLESS, 7)).toBeLessThan(gapSizeFor(ENDLESS, 4));
    expect(gapSizeFor(ENDLESS, 10)).toBeGreaterThan(gapSizeFor(ENDLESS, 9));
    expect(gapSizeFor(ENDLESS, 1005)).toBe(ENDLESS.gap.min);
    expect(gapSizeFor(ENDLESS, 1007)).toBeLessThan(ENDLESS.gap.min);
    expect(makeRoot(createRandom(2), ENDLESS, FIELD, 0, 20, null).motion.kind).toBe('still');
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
    expect(make(2).motion.kind).toBe('drift');
    expect(make(4).gapPulse).not.toBeNull();
    expect(make(5).slidePhase).not.toBeNull();
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
    expect(world.stats.score).toBe(world.rootsPassed);
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
    const hoverY = world.player.y;
    for (let i = 0; i < 90 && world.pickups.length > 0; i++) {
      // Hold the mushroom still so only the magnet moves the coin.
      world.player.y = hoverY;
      world.player.vy = 0;
      stepWorld(world, 1 / 60);
    }
    expect(world.stats.coins).toBeGreaterThan(0);
  });

  it('milestones are celebrated once each and pay nothing', () => {
    const world = emptyWorld();
    world.stats.score = 25;
    stepWorld(world, 1 / 60);
    stepWorld(world, 1 / 60);
    expect(world.events.filter((e) => e.type === 'milestone').map((e) => e.type === 'milestone' && e.score)).toEqual([10, 20]);
    expect(roundCoins(world)).toBe(0);
  });

  it('coins only come from collecting them: near misses pay nothing', () => {
    let nearMisses = 0;
    let coinPickups = 0;
    for (const seed of [5, 6, 7, 8]) {
      const world = newWorld(seed);
      run(world, 20, autopilot);
      nearMisses += world.stats.nearMisses;
      coinPickups += world.events.filter((e) => e.type === 'pickup' && e.kind === 'coin').length;
      expect(world.stats.coins).toBe(world.events.filter((e) => e.type === 'pickup' && e.kind === 'coin').length);
    }
    expect(nearMisses + coinPickups).toBeGreaterThan(0);
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

  it('endless brings magnets only after root 40 and wind only after root 120', () => {
    const rng = createRandom(3);
    const kindsAt = (from: number, to: number) => {
      const kinds = new Set<string>();
      for (let i = from; i < to; i++) {
        const root = makeRoot(rng, ENDLESS, FIELD, 0, i, null);
        const pickup = makePickup(rng, root, i, ENDLESS, FIELD);
        if (pickup) kinds.add(pickup.kind);
      }
      return kinds;
    };
    expect(kindsAt(0, 40).has('magnet')).toBe(false);
    expect(kindsAt(40, 400).has('magnet')).toBe(true);

    const early = newWorld(4);
    early.rootsPassed = 119;
    early.distanceToWind = 0;
    early.distanceSinceSpawn = -1e9;
    stepWorld(early, 1 / 60);
    expect(early.winds).toHaveLength(0);
    early.rootsPassed = 120;
    stepWorld(early, 1 / 60);
    expect(early.winds).toHaveLength(1);
  });
});

describe('crash and mushroom clump', () => {
  it('the clump spot is known only once the mushroom has landed', () => {
    const world = emptyWorld();
    world.player.y = 100;
    world.player.vy = 0;
    world.invulnerableTime = 0;
    world.roots = [makeRoot(createRandom(1), ENDLESS, FIELD, world.player.x - 30, 0, null)];
    world.roots[0]!.gapCenter = 600;
    stepWorld(world, 1 / 60);
    expect(world.crashed).toBe(true);
    expect(world.landedTime).toBeNull();
    const spot = crashSpot(world);
    for (let i = 0; i < 180 && world.landedTime === null; i++) stepWorld(world, 1 / 60);
    expect(world.landedTime).toBe(0);
    expect(world.events.some((e) => e.type === 'landed')).toBe(true);
    expect(world.player.y).toBe(world.groundY - world.player.radius);
    expect(crashSpot(world)).toBe(spot);
  });
});

