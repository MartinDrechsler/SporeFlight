import { FREE, type Price } from './skins';

/**
 * Glow trails: particles the mushroom leaves behind while flying. Some are
 * bought; the rarest only come with a badge, so they show what you achieved.
 */
export interface Trail {
  id: string;
  name: string;
  price: Price;
  /** Particle colours, used in turn. Empty: no trail. */
  colors: readonly string[];
  /** Particles per second. */
  rate: number;
  size: number;
  /** Upward drift of each particle, px/s (negative sinks). */
  rise: number;
}

export const TRAILS: readonly Trail[] = [
  { id: 'none', name: 'NO TRAIL', price: FREE, colors: [], rate: 0, size: 0, rise: 0 },
  { id: 'spores', name: 'SPORE TRAIL', price: { coins: 60 }, colors: ['#00f2c3', '#8affe6'], rate: 26, size: 2, rise: 10 },
  { id: 'embers', name: 'EMBER TRAIL', price: { coins: 150 }, colors: ['#ff8a3d', '#ffd23f', '#ff4d2e'], rate: 32, size: 2.4, rise: 40 },
  { id: 'stardust', name: 'STARDUST', price: { diamonds: 3 }, colors: ['#ffffff', '#bfe9ff', '#fff2a8'], rate: 40, size: 1.8, rise: 0 },
  { id: 'gold', name: 'GOLDEN SPARKS', price: { badge: 'near_miss_master' }, colors: ['#ffd700', '#fff2a8'], rate: 36, size: 2.2, rise: -20 },
  { id: 'rainbow', name: 'RAINBOW', price: { badge: 'forest_legend' }, colors: ['#ff3c69', '#ff9f1c', '#ffe66d', '#2ec4b6', '#3a86ff', '#b26bff'], rate: 48, size: 2.6, rise: 0 },
  { id: 'lightning', name: 'STORM TRAIL', price: { badge: 'storm_rider' }, colors: ['#e6f7ff', '#7fd4ff', '#ffffff'], rate: 44, size: 2, rise: 0 },
  { id: 'aurora', name: 'AURORA', price: { badge: 'forest_master' }, colors: ['#3dffa8', '#3dd6ff', '#b26bff'], rate: 40, size: 3, rise: 25 },
];

export const DEFAULT_TRAIL_ID = 'none';

export function trailById(id: string): Trail {
  return TRAILS.find((trail) => trail.id === id) ?? TRAILS[0]!;
}
