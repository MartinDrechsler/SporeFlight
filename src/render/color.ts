import type { Theme } from '../config/theme';

/** Mixes two '#rrggbb' colours; t = 0 gives a, t = 1 gives b. */
export function mixColor(a: string, b: string, t: number): string {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const channel = (shift: number): number => {
    const ca = (pa >> shift) & 255;
    const cb = (pb >> shift) & 255;
    return Math.round(ca + (cb - ca) * t);
  };
  return `#${((channel(16) << 16) | (channel(8) << 8) | channel(0)).toString(16).padStart(6, '0')}`;
}

/** Every colour of two themes mixed, for a smooth change from one look to the next. */
export function mixTheme(a: Theme, b: Theme, t: number): Theme {
  if (t <= 0) return a;
  if (t >= 1) return b;
  return {
    sky: [mixColor(a.sky[0], b.sky[0], t), mixColor(a.sky[1], b.sky[1], t), mixColor(a.sky[2], b.sky[2], t)],
    hillsFar: mixColor(a.hillsFar, b.hillsFar, t),
    hillsNear: mixColor(a.hillsNear, b.hillsNear, t),
    ground: mixColor(a.ground, b.ground, t),
    accent: mixColor(a.accent, b.accent, t),
    rootDark: mixColor(a.rootDark, b.rootDark, t),
    rootLight: mixColor(a.rootLight, b.rootLight, t),
    rootVein: mixColor(a.rootVein, b.rootVein, t),
  };
}

/** 'r, g, b' of a '#rrggbb' colour, for rgba() strings. */
export function rgbOf(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

/** A stable pseudo-random number in [0, 1) for drawing details; never used by gameplay. */
export function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
