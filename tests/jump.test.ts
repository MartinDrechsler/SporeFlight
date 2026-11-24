import { describe, expect, it } from 'vitest';
import { jumpShape } from '../src/render/jump';

/** A flap as the flight rules make it: -390 px/s up, rise gravity 1368, fall gravity 2190. */
function flapAt(t: number): number {
  const apex = 390 / 1368;
  return t < apex ? -390 + 1368 * t : (t - apex) * 2190;
}

describe('jump look', () => {
  const frames = Array.from({ length: 90 }, (_, i) => i / 60).map((t) => ({ t, ...jumpShape(t, flapAt(t)) }));

  it('never leans back (left): upright or leaning right, the way it travels', () => {
    for (let vy = -600; vy <= 900; vy += 50) {
      for (let t = 0; t < 2; t += 0.01) expect(jumpShape(t, vy).tilt).toBeGreaterThanOrEqual(0);
    }
    expect(jumpShape(Infinity, 0).tilt).toBe(0);
  });

  it('squeezes on the very frame of the tap, and only for an instant', () => {
    expect(frames[0]!.scaleX).toBeGreaterThan(1.15);
    expect(frames[0]!.scaleY).toBeLessThan(0.85);
    const squeezed = frames.filter((f) => f.scaleY < 0.97);
    expect(Math.max(...squeezed.map((f) => f.t))).toBeLessThan(0.1);
  });

  it('then stretches long and leans forward, and is upright again near the top of the arc', () => {
    const stretched = frames.find((f) => f.t > 0.05 && f.t < 0.15 && f.scaleY > 1.2);
    expect(stretched).toBeDefined();
    expect(stretched!.tilt).toBeGreaterThan(0.25);
    const top = frames.find((f) => Math.abs(f.t - 0.28) < 0.01)!;
    expect(top.tilt).toBeLessThan(0.15);
    expect(Math.abs(top.scaleY - 1)).toBeLessThan(0.05);
  });

  it('dives nose-down (further right) as the fall speeds up, up to 75 degrees', () => {
    expect(jumpShape(1, 300).tilt).toBeGreaterThan(jumpShape(1, 100).tilt);
    expect(jumpShape(1, 5000).tilt).toBeCloseTo((75 * Math.PI) / 180);
  });

  it('changes smoothly after the squeeze', () => {
    const after = frames.filter((f) => f.t >= 0.05);
    for (let i = 1; i < after.length; i++) {
      expect(Math.abs(after[i]!.tilt - after[i - 1]!.tilt)).toBeLessThan(0.12);
      expect(Math.abs(after[i]!.scaleY - after[i - 1]!.scaleY)).toBeLessThan(0.2);
    }
  });
});
