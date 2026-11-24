import { describe, expect, it } from 'vitest';
import { SOUNDS } from '../src/audio/sounds';

describe('sound effects', () => {
  it('every sound is short, gentle and audible', () => {
    for (const [name, voices] of Object.entries(SOUNDS)) {
      expect(voices.length, name).toBeGreaterThan(0);
      for (const voice of voices) {
        expect(voice.seconds, name).toBeGreaterThan(0);
        expect(voice.seconds + (voice.delay ?? 0), name).toBeLessThanOrEqual(1.5);
        expect(voice.volume, name).toBeGreaterThan(0);
        expect(voice.volume, name).toBeLessThanOrEqual(0.3);
        expect(voice.from, name).toBeGreaterThan(20);
      }
    }
  });
});

import { SPRITES } from '../src/config/sprites';

describe('pixel sprites', () => {
  it('every row is the same width and every letter has a colour', () => {
    for (const [name, sprite] of Object.entries(SPRITES)) {
      const width = sprite.rows[0]!.length;
      for (const row of sprite.rows) {
        expect(row.length, name).toBe(width);
        for (const key of row) if (key !== '.') expect(sprite.palette[key], `${name} ${key}`).toBeDefined();
      }
    }
  });
});
