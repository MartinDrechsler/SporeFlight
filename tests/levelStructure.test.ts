import { describe, expect, it } from 'vitest';
import { ANIMATIONS } from '../src/config/animations';
import { levelById, secretLevels } from '../src/config/levels';
import { STORIES } from '../src/config/story';
import { defaultSave, migrate } from '../src/core/save';
import { playerHitsRoot } from '../src/gameplay/collision';
import { extraGap, gapBottom, gapTop, rootLeft, solidSpans } from '../src/gameplay/roots';
import { startFromCheckpoint, stepWorld, type World } from '../src/gameplay/world';
import { findSecret, isLevelOpen, nextLevelId } from '../src/meta/adventure';
import { newWorld } from './helpers';

/** Flies a level invulnerably, keeping the mushroom in the middle of the next gap, until `until` says stop. */
function flyThrough(world: World, until: (w: World) => boolean, maxSeconds = 300): void {
  world.invulnerableTime = Infinity;
  for (let i = 0; i < maxSeconds * 60 && !until(world) && !world.course.finished; i++) {
    const next = world.roots.find((r) => rootLeft(r) + r.width > world.player.x - world.player.radius);
    if (next) world.player.y = next.gapCenter;
    world.player.vy = 0;
    stepWorld(world, 1 / 60);
  }
}

describe('forks', () => {
  it('fork roots get a second, tighter gap past a pillar, with a coin in it', () => {
    const level = levelById(3);
    const world = newWorld(1, level);
    flyThrough(world, (w) => w.roots.some((r) => r.extra !== null));
    const root = world.roots.find((r) => r.extra !== null)!;
    const gap = extraGap(root)!;
    expect(gap.bottom - gap.top).toBeLessThan(root.gapSize);
    expect(solidSpans(root, world.groundY)).toHaveLength(3);
    // The pillar between the gaps is solid; the second gap is open.
    const pillarY = root.extra!.offset > 0 ? (gapBottom(root) + gap.top) / 2 : (gap.bottom + gapTop(root)) / 2;
    const player = { ...world.player, x: rootLeft(root) + root.width / 2 };
    expect(playerHitsRoot({ ...player, y: pillarY }, root, world.groundY)).toBe(true);
    expect(playerHitsRoot({ ...player, y: (gap.top + gap.bottom) / 2 }, root, world.groundY)).toBe(false);
    expect(world.pickups.some((p) => p.root === root && p.kind === 'coin' && p.offsetY === root.extra!.offset)).toBe(true);
  });
});

describe('the secret gap', () => {
  it('flying through it finishes the level as a secret; the secret level opens', () => {
    const level = levelById(6);
    const world = newWorld(1, level);
    world.invulnerableTime = Infinity;
    for (let i = 0; i < 300 * 60 && !world.course.finished; i++) {
      const next = world.roots.find((r) => rootLeft(r) + r.width > world.player.x - world.player.radius);
      const gap = next && next.extra?.secret ? extraGap(next) : null;
      if (next) world.player.y = gap ? (gap.top + gap.bottom) / 2 : next.gapCenter;
      world.player.vy = 0;
      stepWorld(world, 1 / 60);
    }
    expect([world.course.finished, world.course.secret]).toEqual([true, true]);
    const save = defaultSave();
    expect(isLevelOpen(save, 11)).toBe(false);
    expect(findSecret(save, 6)).toBe(11);
    expect(findSecret(save, 6)).toBeNull();
    expect(isLevelOpen(save, 11)).toBe(true);
    expect(nextLevelId(11)).toBeNull();
  });

  it('flying past it through the main gap is an ordinary root', () => {
    const world = newWorld(1, levelById(6));
    flyThrough(world, (w) => w.rootsPassed > 14);
    expect(world.course.secret).toBe(false);
  });

  it('every secret level belongs to a level whose secret gap leads there', () => {
    for (const secret of secretLevels()) expect(levelById(secret.secretOf!).secret?.levelId).toBe(secret.id);
  });
});

describe('checkpoints', () => {
  it('long levels have one halfway; passing it keeps what was earned so far', () => {
    const level = levelById(8);
    expect(level.checkpoint).toBe(15);
    const world = newWorld(1, level);
    flyThrough(world, (w) => w.checkpoint !== null);
    expect(world.checkpoint?.root).toBe(16);
    expect(world.events.some((e) => e.type === 'checkpoint')).toBe(true);
  });

  it('restarting from it rebuilds exactly the same level ahead, with the earnings restored', () => {
    const level = levelById(8);
    const first = newWorld(1, level);
    flyThrough(first, (w) => w.checkpoint !== null);
    const checkpoint = first.checkpoint!;
    const restart = newWorld(2, level);
    startFromCheckpoint(restart, checkpoint);
    const ahead = (w: World) => w.roots.filter((r) => !r.passed).map((r) => [r.index, Math.round(r.gapCenter)]);
    expect(ahead(restart)).toEqual(ahead(first));
    expect(restart.stats).toEqual(checkpoint.stats);
    expect(restart.rootsPassed).toBe(checkpoint.root);
    expect(restart.invulnerableTime).toBeGreaterThan(0);
  });
});

describe('save and story', () => {
  it('secrets found and story scenes seen are kept, and start empty in older saves', () => {
    expect(migrate({ version: 8 })).toMatchObject({ secrets: [], storySeen: [] });
    expect(migrate({ version: 8, secrets: [11, 11, 'x'], storySeen: ['opening'] })).toMatchObject({ secrets: [11], storySeen: ['opening'] });
  });

  it('every story panel acts out an animation that exists', () => {
    for (const panels of Object.values(STORIES)) for (const panel of panels) expect(ANIMATIONS[panel.animation]).toBeDefined();
  });
});
