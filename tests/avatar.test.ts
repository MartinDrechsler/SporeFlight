import { describe, expect, it } from 'vitest';
import { avatarScale, idleLook } from '../src/render/avatar';

describe('home screen avatar', () => {
  const samples = Array.from({ length: 2000 }, (_, i) => idleLook(i / 60));

  it('blinks now and then, but mostly has its eyes open', () => {
    const closed = samples.filter((look) => look.blink > 0.8).length;
    expect(closed).toBeGreaterThan(0);
    expect(closed / samples.length).toBeLessThan(0.05);
  });

  it('glances both ways, mostly looks ahead, and never jumps', () => {
    expect(samples.some((look) => look.gaze < -0.9)).toBe(true);
    expect(samples.some((look) => look.gaze > 0.9)).toBe(true);
    for (let i = 1; i < samples.length; i++) expect(Math.abs(samples[i]!.gaze - samples[i - 1]!.gaze)).toBeLessThan(0.3);
  });
});

describe('avatar size', () => {
  it('grows into the room the home screen has, within limits', () => {
    expect(avatarScale(1000, 16)).toBe(1.7);
    expect(avatarScale(10, 16)).toBe(1);
    expect(avatarScale(16 * 3.2 * 1.3, 16)).toBeCloseTo(1.3);
  });
});
