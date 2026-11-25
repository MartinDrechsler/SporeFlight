import { describe, expect, it } from 'vitest';
import { chapterLevels, levelById, rootCount } from '../src/config/levels';
import { TUNING } from '../src/config/tuning';
import { setMode } from '../src/gameplay/modes';
import { rootLeft } from '../src/gameplay/roots';
import { flapPlayer, stepWorld, type World } from '../src/gameplay/world';
import { autopilot, emptyWorld, level, newWorld, run } from './helpers';

const H = TUNING.hazards;

/** Steers toward the next gap in either mode: flaps, or turns the seed when it heads the wrong way. */
function pilot(world: World): void {
  if (world.player.mode === 'flap') return autopilot(world);
  const next = world.roots.find((root) => rootLeft(root) + root.width > world.player.x - world.player.radius);
  const target = next ? next.gapCenter : world.height * 0.45;
  const wantClimb = world.player.y > target + 6;
  const wantDive = world.player.y < target - 6;
  if ((wantClimb && !world.player.climbing) || (wantDive && world.player.climbing)) flapPlayer(world);
}

describe('chapter 2: Glowcap Caverns', () => {
  it('has eight levels and ends with the Bat Queen', () => {
    const levels = chapterLevels(2);
    expect(levels).toHaveLength(8);
    const last = levels.at(-1)!.stages.at(-1)!;
    expect(last.kind === 'boss' && last.boss).toBe('batQueen');
  });

  it('places hazards and portals only on roots the level has, midway between roots', () => {
    for (const config of chapterLevels(2)) {
      for (const item of [...config.hazards, ...config.portals]) expect(item.root).toBeLessThan(rootCount(config) - 1);
      // Room on both sides of a hazard for the mushroom to pass without touching a root.
      if (config.hazards.length > 0) expect((config.spacing - TUNING.roots.width) / 2 - H.batRadius).toBeGreaterThan(TUNING.player.radius * 2);
    }
  });

  it('Seed on the Wind can be glided and flapped through to the gate', () => {
    const world = newWorld(1, level(16));
    expect(world.player.mode).toBe('glide');
    const modes = new Set<string>();
    run(world, 120, (w) => {
      modes.add(w.player.mode);
      pilot(w);
    });
    expect(world.crashed).toBe(false);
    expect(world.course.finished).toBe(true);
    expect([...modes].sort()).toEqual(['flap', 'glide']);
  });
});

describe('glide mode', () => {
  it('a tap turns between a steady climb and a steady dive; there is no gravity', () => {
    const world = emptyWorld(1, level(16));
    world.invulnerableTime = 99;
    run(world, 1);
    expect(world.player.vy).toBeCloseTo(TUNING.player.glideSpeed);
    flapPlayer(world);
    run(world, 1);
    expect(world.player.vy).toBeCloseTo(-TUNING.player.glideSpeed);
  });

  it('switching modes keeps the direction: a rise becomes a climb', () => {
    const world = emptyWorld();
    world.player.vy = -200;
    setMode(world.player, 'glide');
    expect(world.player.climbing).toBe(true);
  });
});

describe('portals', () => {
  it('passing one switches the mode and says so, once', () => {
    const world = emptyWorld();
    world.invulnerableTime = 99;
    world.portals.push({ x: world.player.x + 40, mode: 'glide', passed: false });
    const portals: string[] = [];
    run(world, 2, (w) => {
      autopilot(w);
      for (const event of w.events) if (event.type === 'portal') portals.push(event.mode);
      w.events.length = 0;
    });
    expect(world.player.mode).toBe('glide');
    expect(portals).toEqual(['glide']);
  });
});

describe('hazards', () => {
  const withHazard = (kind: 'bat' | 'stalactite', y: number): World => {
    const world = emptyWorld();
    world.player.y = y;
    if (kind === 'bat') world.hazards.push({ kind, x: world.player.x + 200, y, centre: y, phase: 0, time: 0 });
    else world.hazards.push({ kind, x: world.player.x + 300, y: 0, vy: 0, state: 'hanging' });
    return world;
  };
  /** Holds the mushroom at one height, so only the hazard decides. */
  const hold = (y: number) => (w: World) => {
    w.player.y = y;
    w.player.vy = 0;
  };

  it('a bat in the way is a hit; a shield takes it', () => {
    const world = withHazard('bat', 300);
    world.shield = true;
    // Follow the bat's height, so it cannot miss.
    run(world, 3, (w) => hold(w.hazards[0]?.y ?? 300)(w));
    expect(world.crashed).toBe(false);
    expect(world.shield).toBe(false);
  });

  it('bats flutter in a fixed pattern: the same level, the same beat', () => {
    const a = newWorld(1, level(15));
    const b = newWorld(99, level(15));
    run(a, 8, autopilot);
    run(b, 8, autopilot);
    expect(a.hazards.map((h) => [h.x, h.y])).toEqual(b.hazards.map((h) => [h.x, h.y]));
  });

  it('a stalactite drips as the mushroom comes near and drops when it is below', () => {
    const world = withHazard('stalactite', 400);
    const events: string[] = [];
    run(world, 3, (w) => {
      hold(400)(w);
      for (const event of w.events) if (event.type === 'drip') events.push(event.type);
      w.events.length = 0;
    });
    expect(events).toEqual(['drip']);
    expect(world.crashed).toBe(false);
  });

  it('flying high below a dropping stalactite is a hit', () => {
    const world = withHazard('stalactite', 100);
    run(world, 3, hold(110));
    expect(world.crashed).toBe(true);
  });
});

describe('the Bat Queen', () => {
  const fight = (seed: number): World => {
    const world = newWorld(seed, levelById(19));
    world.invulnerableTime = 1e9;
    return world;
  };

  it('sends bats, swoops and screeches that dim the light, the same way for the same seed', () => {
    const a = fight(3);
    const b = fight(3);
    let screeches = 0;
    let bats = 0;
    run(a, 44, (w) => {
      autopilot(w);
      for (const event of w.events) if (event.type === 'bossScreech') screeches += 1;
      bats = Math.max(bats, w.boss?.rocks.filter((r) => r.kind === 'bat').length ?? 0);
    });
    run(b, 44, autopilot);
    expect(a.boss!.id).toBe('batQueen');
    expect(bats).toBeGreaterThan(1);
    expect(screeches).toBeGreaterThan(0);
    expect(a.stats).toEqual(b.stats);
  });

  it('the Stone Thrower still throws rocks', () => {
    const world = newWorld(3, levelById(5));
    world.invulnerableTime = 1e9;
    run(world, 10, autopilot);
    expect(world.boss!.id).toBe('stoneThrower');
    expect(world.boss!.rocks.every((rock) => rock.kind === 'rock')).toBe(true);
  });

  it('a screech fades', () => {
    const world = fight(3);
    run(world, 2);
    world.boss!.dim = 1;
    stepWorld(world, 1.5);
    expect(world.boss!.dim).toBe(0);
  });
});
