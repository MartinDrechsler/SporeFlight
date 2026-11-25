import { describe, expect, it } from 'vitest';
import { CHAPTERS } from '../src/config/chapters';
import { ADVENTURE_LEVELS, chapterLevels, levelById, LEVELS } from '../src/config/levels';
import { pickupPosition } from '../src/gameplay/pickups';
import { gapBottom, gapTop } from '../src/gameplay/roots';
import { sporelingSide } from '../src/gameplay/spawner';
import { stepWorld } from '../src/gameplay/world';
import { newWorld } from './helpers';

describe('chapters', () => {
  it('Adventure is played chapter by chapter; each built chapter ends with its boss', () => {
    expect(CHAPTERS.map((c) => c.id)).toEqual([1, 2, 3, 4, 5]);
    const order = CHAPTERS.flatMap((c) => chapterLevels(c.id));
    expect(order).toEqual(ADVENTURE_LEVELS);
    for (const chapter of CHAPTERS) {
      const levels = chapterLevels(chapter.id);
      if (levels.length === 0) continue;
      expect(levels.at(-1)!.stages.some((stage) => stage.kind === 'boss')).toBe(true);
      expect(levels.every((level) => level.chapter === chapter.id)).toBe(true);
    }
    expect(chapterLevels(1)).toHaveLength(8);
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(LEVELS.length);
  });
});

describe('sporelings', () => {
  it("each level places exactly its sporelings, alternating sides, never on the vein's root", () => {
    for (const level of ADVENTURE_LEVELS) {
      const sides = Array.from({ length: 200 }, (_, i) => sporelingSide(level, i)).filter((side) => side !== null);
      expect(sides).toHaveLength(level.sporelings);
      sides.forEach((side, k) => expect(side).toBe(k % 2 === 0 ? -1 : 1));
    }
    expect(sporelingSide(levelById(0), 5)).toBeNull();
  });

  it('wait inside a gap near its edge, and are rescued by touching them', () => {
    const level = levelById(1);
    const world = newWorld(1, level);
    world.invulnerableTime = Infinity;
    let sporeling = null;
    for (let i = 0; i < 60 * 60 && !sporeling; i++) {
      stepWorld(world, 1 / 60);
      sporeling = world.pickups.find((p) => p.kind === 'sporeling') ?? null;
    }
    expect(sporeling).not.toBeNull();
    const root = sporeling!.root!;
    const y = root.gapCenter + sporeling!.offsetY;
    expect(y).toBeGreaterThan(gapTop(root));
    expect(y).toBeLessThan(gapBottom(root));
    expect(Math.abs(sporeling!.offsetY)).toBeGreaterThan(root.gapSize * 0.2);
    expect(world.offered.sporelings).toBe(1);
    const at = pickupPosition(sporeling!);
    world.player.x = at.x;
    world.player.y = at.y;
    world.player.vy = 0;
    stepWorld(world, 1 / 60);
    expect([sporeling!.collected, world.stats.sporelings]).toEqual([true, 1]);
    expect(world.events.some((e) => e.type === 'pickup' && e.kind === 'sporeling')).toBe(true);
  });

  it('do not change the levels: the same roots and pickups as without them', () => {
    const level = levelById(3);
    const a = newWorld(7, level);
    const b = newWorld(7, { ...level, sporelings: 0 });
    for (const world of [a, b]) {
      world.invulnerableTime = Infinity;
      for (let i = 0; i < 60 * 30; i++) stepWorld(world, 1 / 60);
    }
    expect(a.roots.map((r) => r.gapCenter)).toEqual(b.roots.map((r) => r.gapCenter));
    expect(a.pickups.filter((p) => p.kind !== 'sporeling').map((p) => p.kind)).toEqual(b.pickups.map((p) => p.kind));
  });
});
