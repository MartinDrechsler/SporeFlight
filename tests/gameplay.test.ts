import { describe, expect, it } from 'vitest';
import { toScreen } from '../src/render/view';
import { freePickup, pickupPosition, type Pickup } from '../src/gameplay/pickups';
import { gapBottom, gapTop } from '../src/gameplay/roots';
import { TUNING } from '../src/config/tuning';
import { createRandom } from '../src/core/random';
import { circleToBoxGap } from '../src/gameplay/collision';
import { gapSizeFor, isClearing, makeCoinCluster, makePickup, makeRoot, wavePhase } from '../src/gameplay/spawner';
import { ADVENTURE_LEVELS, rootCount } from '../src/config/levels';
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
    // Index 5 is past the calm opening, where roots are always still.
    const make = (id: number, index = 5) => makeRoot(rng, level(id), FIELD, 0, index, null);
    expect(make(1).motion.kind).toBe('still');
    expect(make(3).motion.kind).toBe('drift');
    expect(make(4).gapPulse).not.toBeNull();
    expect(make(6).slidePhase).not.toBeNull();
    expect(make(10).motion.kind).toBe('sway');
  });

  it('a level follows an interest curve: easy opening, breather halfway, tight climax', () => {
    const first = level(1); // 20 roots
    expect([0, 1, 2].map((i) => wavePhase(first, i))).toEqual(['calm', 'calm', 'calm']);
    expect([10, 11].map((i) => wavePhase(first, i))).toEqual(['calm', 'calm']);
    expect([15, 19].map((i) => wavePhase(first, i))).toEqual(['surge', 'surge']);
    expect(wavePhase(first, 6)).toBe('normal');
    expect(gapSizeFor(first, 0)).toBeGreaterThan(gapSizeFor(first, 6));
    expect(gapSizeFor(first, 18)).toBeLessThan(gapSizeFor(first, 6));
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

  // Difficulty itself is judged by playing; this only proves every level can be flown to its gate.
  it('every adventure level runs to its finish gate and keeps its roots inside the playfield', () => {
    for (const config of ADVENTURE_LEVELS) {
      const world = newWorld(21, config);
      world.invulnerableTime = Infinity;
      for (let i = 0; i < 60 * 200 && !world.course.finished; i++) {
        autopilot(world);
        stepWorld(world, 1 / 60);
        for (const root of world.roots) {
          expect(root.gapCenter).toBeGreaterThanOrEqual(root.centerMin);
          expect(root.gapCenter).toBeLessThanOrEqual(root.centerMax);
          expect(root.gapSize).toBeGreaterThanOrEqual(config.gap.min - TUNING.levelCurve.climaxGapShrink - 1e-9);
        }
      }
      expect(world.course.finished, `level ${config.id}`).toBe(true);
      expect(world.rootsPassed, `level ${config.id}`).toBe(rootCount(config));
      expect(world.events.some((e) => e.type === 'finish')).toBe(true);
    }
  });

  it('a fixed layout is the same on every attempt, whatever the run seed', () => {
    const layout = (seed: number) => {
      const world = newWorld(seed, level(3));
      world.invulnerableTime = Infinity;
      run(world, 12);
      return [...world.roots.map((root) => `${Math.round(root.gapCenter)} ${root.motion.kind}`), ...world.pickups.map((p) => p.kind)];
    };
    expect(layout(1)).toEqual(layout(2));
    const endless = (seed: number) => {
      const world = newWorld(seed);
      world.invulnerableTime = Infinity;
      run(world, 6);
      return world.roots.map((root) => Math.round(root.gapCenter));
    };
    expect(endless(1)).not.toEqual(endless(2));
  });

  it('counts the coins and the diamond a level offers, for its stars', () => {
    const world = newWorld(3, level(2));
    world.invulnerableTime = Infinity;
    for (let i = 0; i < 60 * 120 && !world.course.finished; i++) stepWorld(world, 1 / 60);
    expect(world.offered.diamonds).toBe(1);
    expect(world.offered.coins).toBeGreaterThan(0);
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


describe('the Stone Thrower', () => {
  const fight = (seed = 4) => {
    const world = newWorld(seed, level(5));
    world.invulnerableTime = Infinity;
    return world;
  };

  it('announces every throw before it comes', () => {
    const world = fight();
    const times: { type: string; t: number }[] = [];
    for (let i = 0; i < 60 * 30; i++) {
      stepWorld(world, 1 / 60);
      for (const e of world.events) if (e.type === 'bossWarn' || e.type === 'bossThrow') times.push({ type: e.type, t: i / 60 });
      world.events.length = 0;
    }
    const throws = times.filter((e) => e.type === 'bossThrow');
    expect(throws.length).toBeGreaterThan(8);
    for (const thrown of throws) {
      const warned = times.filter((e) => e.type === 'bossWarn' && e.t <= thrown.t).at(-1);
      expect(warned).toBeDefined();
      expect(thrown.t - warned!.t).toBeGreaterThanOrEqual(TUNING.boss.warnSeconds - 0.02);
    }
  });

  it('dodged rocks score, and the fight ends with the finish gate', () => {
    const world = fight();
    for (let i = 0; i < 60 * 70 && !world.course.finished; i++) {
      // Hover in place: invulnerable, so rocks fly past and count as dodged.
      world.player.y = world.height * 0.42;
      world.player.vy = 0;
      stepWorld(world, 1 / 60);
    }
    expect(world.course.finished).toBe(true);
    expect(world.stats.score).toBeGreaterThan(10);
    expect(world.offered.diamonds).toBe(1);
    expect(world.offered.coins).toBeGreaterThan(8);
  });

  it('a rock hit ends the round, unless a shield takes it', () => {
    const world = newWorld(4, level(5));
    run(world, 0.5);
    world.boss!.rocks.push({ x: world.player.x, y: world.player.y, vx: -200, vy: 0, spin: 0, passed: false });
    world.shield = true;
    stepWorld(world, 1 / 60);
    expect([world.crashed, world.shield, world.boss!.rocks.length]).toEqual([false, false, 0]);
    world.invulnerableTime = 0;
    world.boss!.rocks.push({ x: world.player.x, y: world.player.y, vx: -200, vy: 0, spin: 0, passed: false });
    stepWorld(world, 1 / 60);
    expect(world.crashed).toBe(true);
  });
});

describe('twist levels', () => {
  it('mirror the picture, never the rules', () => {
    for (const id of [7, 9]) {
      const twisted = newWorld(8, level(id));
      const plain = newWorld(8, { ...level(id), view: 'normal' });
      run(twisted, 10, autopilot);
      run(plain, 10, autopilot);
      expect([twisted.stats.score, twisted.player.y, twisted.crashed]).toEqual([plain.stats.score, plain.player.y, plain.crashed]);
    }
    expect(level(7).view).toBe('upsideDown');
    expect(level(9).view).toBe('backwards');
  });

  it('upside down puts the ground on top; backwards puts the mushroom on the right', () => {
    expect(toScreen('upsideDown', 400, 800, 100, 700)).toEqual({ x: 100, y: 100 });
    expect(toScreen('backwards', 400, 800, 100, 700)).toEqual({ x: 300, y: 700 });
    expect(toScreen('normal', 400, 800, 100, 700)).toEqual({ x: 100, y: 700 });
  });
});

describe('missed pickups', () => {
  it('drift off the screen with the forest, even after their root is gone', () => {
    const world = emptyWorld();
    world.invulnerableTime = Infinity;
    const root = makeRoot(createRandom(1), ENDLESS, FIELD, 30, 5, null);
    const coin: Pickup = { kind: 'coin', root, offsetX: 200, offsetY: -150, vx: 0, vy: 0, collected: false };
    world.roots = [root];
    world.pickups = [coin];
    let last = pickupPosition(coin).x;
    for (let i = 0; i < 60 * 6 && world.pickups.includes(coin); i++) {
      world.player.y = 600;
      world.player.vy = 0;
      stepWorld(world, 1 / 60);
      const x = pickupPosition(coin).x;
      expect(x).toBeLessThan(last);
      last = x;
    }
    expect(world.roots).not.toContain(root);
    expect(world.pickups).not.toContain(coin);
  });
});

describe('more coins, fairer moving gaps', () => {
  it('endless leaves a root out now and then for a cluster of 7 coins, never in a surge', () => {
    const rng = createRandom(9);
    let clearings = 0;
    let after = false;
    for (let i = 0; i < 400; i++) {
      after = isClearing(rng, ENDLESS, i, after);
      if (!after) continue;
      clearings += 1;
      expect(i).toBeGreaterThanOrEqual(ENDLESS.clearings!.fromRoot);
      expect(wavePhase(ENDLESS, i)).not.toBe('surge');
    }
    expect(clearings).toBeGreaterThan(10);
    expect(isClearing(createRandom(1), level(2), 10, false)).toBe(false);
    const coins = makeCoinCluster(FIELD, 400, 300);
    expect(coins).toHaveLength(7);
    expect(coins.every((c) => c.kind === 'coin' && c.root === null)).toBe(true);
  });

  it('a clearing in a round: no root in that slot, its coins count as offered', () => {
    const world = newWorld(9);
    world.invulnerableTime = Infinity;
    run(world, 120, autopilot);
    expect(world.offered.coins).toBeGreaterThan(world.rootsSpawned * 0.25);
  });

  it('in endless a moving gap is wider than a still one at the same place', () => {
    const rng = () => createRandom(4);
    const still = makeRoot(rng(), { ...ENDLESS, progressive: true }, FIELD, 0, 5, null);
    const moving = makeRoot(rng(), ENDLESS, FIELD, 0, 45, null);
    expect(still.motion.kind).toBe('still');
    expect(moving.motion.kind).not.toBe('still');
    expect(moving.gapSize - gapSizeFor(ENDLESS, 45)).toBeGreaterThanOrEqual(TUNING.roots.endlessMovingGap.drift);
  });
});

describe('crystal veins', () => {
  /** A world with one still root right at the mushroom, its vein on the given side. */
  const veinWorld = (side: 'top' | 'bottom') => {
    const world = emptyWorld();
    world.invulnerableTime = 0;
    const root = makeRoot(createRandom(1), ENDLESS, FIELD, world.player.x - 30, 5, null);
    root.motion = { kind: 'still' };
    root.gapCenter = 400;
    root.gapSize = 150;
    root.vein = { side, hits: 0 };
    world.roots = [root];
    world.player.vy = 0;
    world.player.y = side === 'bottom' ? gapBottom(root) - world.player.radius + 4 : gapTop(root) + world.player.radius - 4;
    return { world, root };
  };

  it('bounces the mushroom off instead of killing it, one crack per touch', () => {
    const { world, root } = veinWorld('bottom');
    stepWorld(world, 1 / 60);
    expect(world.crashed).toBe(false);
    expect(world.player.vy).toBeLessThan(0);
    expect(root.vein!.hits).toBe(1);
    expect(world.events.some((e) => e.type === 'veinHit')).toBe(true);
    stepWorld(world, 1 / 60);
    expect(root.vein!.hits).toBe(1);
  });

  it('a vein above pushes the mushroom down', () => {
    const { world, root } = veinWorld('top');
    stepWorld(world, 1 / 60);
    expect([world.crashed, root.vein!.hits]).toEqual([false, 1]);
    expect(world.player.vy).toBeGreaterThan(0);
  });

  it('breaks open on the third hit and gives a diamond; then the cap is deadly again', () => {
    const { world, root } = veinWorld('bottom');
    root.vein!.hits = 2;
    stepWorld(world, 1 / 60);
    expect([world.stats.diamonds, world.stats.veins]).toEqual([1, 1]);
    expect(world.events.some((e) => e.type === 'veinBreak')).toBe(true);
    world.veinCooldown = 0;
    world.player.y = gapBottom(root) - world.player.radius + 4;
    world.player.vy = 0;
    stepWorld(world, 1 / 60);
    expect(world.crashed).toBe(true);
  });

  it('flying into the side of the cap still crashes', () => {
    const { world, root } = veinWorld('bottom');
    world.player.y = gapBottom(root) + 12;
    stepWorld(world, 1 / 60);
    expect(world.crashed).toBe(true);
  });

  it('endless has veins at root 20, then every 30; a level has one in its climax and no diamond pickups', () => {
    const rng = createRandom(3);
    const veins = Array.from({ length: 90 }, (_, i) => makeRoot(rng, ENDLESS, FIELD, 0, i, null).vein !== null);
    expect(veins.flatMap((v, i) => (v ? [i] : []))).toEqual([20, 50, 80]);
    const two = level(2);
    const rng2 = createRandom(3);
    const levelVeins = Array.from({ length: rootCount(two) }, (_, i) => makeRoot(rng2, two, FIELD, 0, i, null).vein !== null);
    expect(levelVeins.filter(Boolean)).toHaveLength(1);
    expect(two.diamonds).toBeNull();
  });
});

describe('golden coins', () => {
  it('appear now and then in endless, never in a fixed level, and are worth 10', () => {
    const kinds = (config: typeof ENDLESS) => {
      const rng = createRandom(12);
      const found: string[] = [];
      for (let i = 0; i < 2000; i++) {
        const pickup = makePickup(rng, makeRoot(rng, config, FIELD, 0, 5, null), 5, config, FIELD);
        if (pickup) found.push(pickup.kind);
      }
      return found;
    };
    expect(kinds(ENDLESS)).toContain('goldCoin');
    expect(kinds(level(3))).not.toContain('goldCoin');

    const world = emptyWorld();
    world.pickups = [freePickup('goldCoin', world.player.x, world.player.y)];
    stepWorld(world, 1 / 60);
    expect(world.stats.coins).toBe(10);
  });
});
