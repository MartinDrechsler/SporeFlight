import { describe, expect, it } from 'vitest';
import { ANIMATIONS, recoveryStep, type Timeline } from '../src/config/animations';
import { blendExpressions, EXPRESSIONS } from '../src/config/expressions';
import { AvatarPlayer, frameAt } from '../src/render/timeline';

const all = Object.entries(ANIMATIONS) as [string, Timeline][];

describe('avatar animations as data', () => {
  it.each(all)('%s starts with a face, keeps its moves inside its length, and hands over to a real animation', (_, timeline) => {
    expect(timeline.faces[0]?.at).toBe(0);
    for (const move of timeline.moves) expect(move.at + move.for).toBeLessThanOrEqual(timeline.length + 1e-9);
    for (let i = 1; i < timeline.faces.length; i++) expect(timeline.faces[i]!.at).toBeGreaterThan(timeline.faces[i - 1]!.at);
    if (timeline.then) expect(Object.keys(ANIMATIONS)).toContain(timeline.then);
  });

  it.each(all)('%s never jumps between frames', (_, timeline) => {
    let last = frameAt(timeline, 0);
    for (let t = 1 / 60; t < timeline.length; t += 1 / 60) {
      const frame = frameAt(timeline, t);
      expect(Math.abs(frame.y - last.y)).toBeLessThan(0.25);
      expect(Math.abs(frame.rotation - last.rotation)).toBeLessThan(0.2);
      last = frame;
    }
  });
});

describe('scenes', () => {
  it('knocked out (before choosing): sitting, crossed eyes, head swaying round, stars circling', () => {
    const ko = ANIMATIONS.knockedOut;
    const frames = Array.from({ length: 120 }, (_, i) => frameAt(ko, (i / 120) * ko.length));
    expect(frames.every((f) => f.lie === 0 && f.stars !== null && f.face.eyes === 'cross')).toBe(true);
    expect(Math.max(...frames.map((f) => f.rotation))).toBeGreaterThan(0.1);
    expect(Math.min(...frames.map((f) => f.rotation))).toBeLessThan(-0.1);
  });

  it('resting gets better step by step: knocked out, sitting up with eyes open, drinking, standing, jumping', () => {
    expect([0, 0.2, 0.3, 0.6, 0.8, 1].map(recoveryStep)).toEqual(['restFall', 'restFall', 'restSitUp', 'restDrink', 'restStand', 'restJump']);
    const out = frameAt(ANIMATIONS.restOut, 1);
    expect([out.lie, out.face.eyes, out.stars !== null]).toEqual([1, 'cross', true]);
    const sat = frameAt(ANIMATIONS.restSitUp, ANIMATIONS.restSitUp.length);
    expect(sat.lie).toBeCloseTo(0);
    expect(sat.face.eyes).toBe('open');
    expect(frameAt(ANIMATIONS.restDrink, 5).drink).not.toBeNull();
    const stood = frameAt(ANIMATIONS.restReady, 0);
    expect(stood.scaleY).toBeCloseTo(1, 1);
    expect(Math.min(...Array.from({ length: 60 }, (_, i) => frameAt(ANIMATIONS.restJump, i / 40).y))).toBeLessThan(-0.9);
  });

  it('getting up undoes lying down', () => {
    expect(frameAt(ANIMATIONS.restSitUp, 0).lie).toBe(1);
    expect(frameAt(ANIMATIONS.restSitUp, 1.2).lie).toBe(0);
  });

  it('reveal: the new look appears at the brightest flash, with a burst, and ends happy', () => {
    const reveal = ANIMATIONS.reveal;
    const at = reveal.moves.find((m) => m.move === 'reveal')!.at;
    expect(frameAt(reveal, at - 0.01).revealed).toBe(false);
    const moment = frameAt(reveal, at);
    expect(moment.revealed).toBe(true);
    expect(moment.flash).toBeGreaterThan(0.95);
    expect(frameAt(reveal, at + 0.2).burst).not.toBeNull();
    expect(frameAt(reveal, reveal.length).face.mouth).toBe('grin');
  });

  it('a spin hides the face while the back is turned', () => {
    const frames = Array.from({ length: 100 }, (_, i) => frameAt(ANIMATIONS.reveal, 0.3 + i * 0.011));
    expect(frames.some((f) => !f.faceVisible)).toBe(true);
    expect(frames.some((f) => f.faceVisible)).toBe(true);
  });

  it('after the reveal the player moves on to celebrating, still in the new look', () => {
    const player = new AvatarPlayer();
    player.play('reveal');
    let frame = player.update(0);
    for (let i = 0; i < 60 * 5; i++) frame = player.update(1 / 60);
    expect(frame.revealed).toBe(true);
    expect(frame.face.eyes).toBe('happy');
  });

  it('proud leans back with a smirk for a while, then stands straight and calm again', () => {
    const held = frameAt(ANIMATIONS.proud, 2);
    expect(held.rotation).toBeLessThan(-0.1);
    expect(held.face.mouth).toBe('smirk');
    const end = frameAt(ANIMATIONS.proud, 10);
    expect(Math.abs(end.rotation)).toBeLessThan(1e-9);
    expect(end.face).toBe(frameAt(ANIMATIONS.idle, 0).face);
  });
});

describe('faces', () => {
  it('ease from one to the next instead of popping', () => {
    const half = blendExpressions(EXPRESSIONS.neutral, EXPRESSIONS.exhausted, 0.5);
    expect(half.lid).toBeCloseTo(0.3);
    expect(blendExpressions(EXPRESSIONS.neutral, EXPRESSIONS.exhausted, 0)).toBe(EXPRESSIONS.neutral);
    expect(blendExpressions(EXPRESSIONS.neutral, EXPRESSIONS.exhausted, 1)).toBe(EXPRESSIONS.exhausted);
  });
});
