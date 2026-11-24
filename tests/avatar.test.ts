import { describe, expect, it } from 'vitest';
import { avatarScale, idleLook, NEUTRAL_POSE, relaxPose, type Pose } from '../src/render/avatar';

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

  it('settles back to the normal look once the home screen is left', () => {
    let pose: Pose = { shiftX: 150, scale: 1.7, gaze: 1, blink: 1, act: null };
    for (let i = 0; i < 60; i++) pose = relaxPose(pose, 1 / 60);
    expect(pose.shiftX).toBe(0);
    expect(pose.scale).toBeCloseTo(NEUTRAL_POSE.scale, 3);
    expect(Math.abs(pose.gaze)).toBeLessThan(0.01);
    expect(pose.blink).toBe(0);
  });
});

describe('avatar size', () => {
  it('grows into the room the home screen has, within limits', () => {
    expect(avatarScale(1000, 16)).toBe(1.7);
    expect(avatarScale(10, 16)).toBe(1);
    expect(avatarScale(16 * 3.2 * 1.3, 16)).toBeCloseTo(1.3);
  });
});
