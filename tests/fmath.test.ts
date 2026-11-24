import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { atan2, cos, hypot, sin } from '../src/core/fmath';

describe('device-independent maths', () => {
  it('matches Math closely', () => {
    for (let x = -50; x <= 50; x += 0.0137) {
      expect(Math.abs(sin(x) - Math.sin(x))).toBeLessThan(1e-12);
      expect(Math.abs(cos(x) - Math.cos(x))).toBeLessThan(1e-12);
    }
    for (let a = -3; a <= 3; a += 0.11) {
      for (let b = -3; b <= 3; b += 0.13) {
        expect(Math.abs(atan2(a, b) - Math.atan2(a, b))).toBeLessThan(1e-12);
        expect(Math.abs(hypot(a, b) - Math.hypot(a, b))).toBeLessThan(1e-12);
      }
    }
  });

  // Replays on the server must match every phone exactly, so the flight rules
  // may only use maths that is exact on every engine.
  it('the flight rules use no device-dependent maths', () => {
    const dir = new URL('../src/gameplay/', import.meta.url);
    const forbidden = /Math\.(sin|cos|tan|asin|acos|atan|atan2|hypot|pow|exp|expm1|log|log2|log10|cbrt|sinh|cosh|tanh)\b|[\w)\]]\s*\*\*\s*[\w(]|Math\.random/;
    for (const file of readdirSync(dir)) {
      const code = readFileSync(new URL(file, dir), 'utf8')
        .split('\n')
        .filter((line) => !/^\s*(\/\*\*|\*|\/\/)/.test(line));
      for (const line of code) expect(line, `${file}: ${line.trim()}`).not.toMatch(forbidden);
    }
  });
});
