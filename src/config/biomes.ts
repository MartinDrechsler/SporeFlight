import type { Theme } from './theme';

/**
 * Endless is a journey: the world changes as the score grows, so a better run
 * takes you somewhere new. A biome changes only the look and sound; the rules
 * stay the same, which keeps the leaderboard fair.
 */

/** The distant layers behind the action. */
export type Scenery = 'darkForest' | 'twilight' | 'woodland' | 'meadow' | 'savanna' | 'canyon' | 'highland' | 'peaks';

/** What the obstacles are made of. */
export type ObstacleStyle = 'glow' | 'mossy' | 'trunk' | 'post' | 'branch' | 'sandstone' | 'spire' | 'ice';

/** Small life in the air. */
export type Life = 'spores' | 'fireflies' | 'birds' | 'butterflies' | 'haze' | 'dust' | 'snow';

export interface Biome {
  id: string;
  name: string;
  /** Endless score at which this biome has arrived. */
  fromScore: number;
  /** Colours of sky, hills, ground and obstacles. */
  colors: Theme;
  scenery: Scenery;
  obstacles: ObstacleStyle;
  life: Life;
}

const colors = (
  sky: [string, string, string],
  hillsFar: string,
  hillsNear: string,
  ground: string,
  accent: string,
  rootDark: string,
  rootLight: string,
  rootVein: string,
): Theme => ({ sky, hillsFar, hillsNear, ground, accent, rootDark, rootLight, rootVein });

export const BIOMES: readonly Biome[] = [
  {
    id: 'dark_forest', name: 'DARK ENCHANTED FOREST', fromScore: 0, scenery: 'darkForest', obstacles: 'glow', life: 'spores',
    colors: colors(['#020a08', '#06201a', '#0b3326'], '#08241b', '#0d2f23', '#03100d', '#00f2c3', '#0f2a22', '#1d4a3c', '#00c49d'),
  },
  {
    id: 'twilight', name: 'TWILIGHT WOODS', fromScore: 20, scenery: 'twilight', obstacles: 'mossy', life: 'fireflies',
    colors: colors(['#1a1030', '#40305a', '#a0607a'], '#2a2440', '#1e2a30', '#121a1c', '#ffcf70', '#2a2a24', '#4d5a3a', '#9fcf5a'),
  },
  {
    id: 'woodland', name: 'MORNING WOODLAND', fromScore: 40, scenery: 'woodland', obstacles: 'trunk', life: 'birds',
    colors: colors(['#5aa0d8', '#9fd0ea', '#e8f4e0'], '#4f8a58', '#3a6e40', '#2e4a26', '#ffe066', '#4a3424', '#7a5636', '#5f9a3a'),
  },
  {
    id: 'meadow', name: 'SUNLIT MEADOW', fromScore: 60, scenery: 'meadow', obstacles: 'post', life: 'butterflies',
    colors: colors(['#3f9cf0', '#8ccaf5', '#f2f8d8'], '#7ab85a', '#5a9e3e', '#4a7a2c', '#fff27a', '#6a4a2c', '#a8814f', '#3f8a2a'),
  },
  {
    id: 'savanna', name: 'DRY SAVANNA', fromScore: 80, scenery: 'savanna', obstacles: 'branch', life: 'haze',
    colors: colors(['#e8a050', '#f2c878', '#f8e6b0'], '#c8a050', '#b08a40', '#8a6a30', '#ff9a3c', '#6a4a2a', '#b89060', '#e0b070'),
  },
  {
    id: 'canyon', name: 'DESERT CANYON', fromScore: 100, scenery: 'canyon', obstacles: 'sandstone', life: 'dust',
    colors: colors(['#f6efe0', '#f2d6a8', '#e8b080'], '#c8643c', '#a84a2c', '#d89a5a', '#ff7a3c', '#9a4a2a', '#d88a50', '#f0c080'),
  },
  {
    id: 'highland', name: 'HIGHLAND PASS', fromScore: 120, scenery: 'highland', obstacles: 'spire', life: 'birds',
    colors: colors(['#2a2a50', '#7a5a7a', '#e8a07a'], '#4a4a62', '#3a3a4e', '#2a2a38', '#ffb38a', '#3e3e4a', '#6e6e7e', '#c8c8d8'),
  },
  {
    id: 'peaks', name: 'FROZEN PEAKS', fromScore: 140, scenery: 'peaks', obstacles: 'ice', life: 'snow',
    colors: colors(['#040818', '#0c1a3a', '#1e3a5a'], '#c8d8f0', '#a8c0e0', '#e8f2ff', '#7fe6ff', '#6a9ac8', '#cfe8ff', '#ffffff'),
  },
];

/** The biome a score belongs to. */
export function biomeAt(score: number): Biome {
  return BIOMES.filter((biome) => score >= biome.fromScore).at(-1) ?? BIOMES[0]!;
}

/** Roots over which one biome blends into the next, ending where the new one arrives. */
export const BLEND_ROOTS = 5;

/**
 * Where the journey stands at a (fractional) score: the biome being left, the
 * one arriving, and how far the change is (0 to 1). Outside a change both are
 * the same biome.
 */
export function biomeBlend(progress: number): { from: Biome; to: Biome; t: number } {
  const to = biomeAt(progress + BLEND_ROOTS);
  const index = BIOMES.indexOf(to);
  const from = BIOMES[Math.max(0, index - 1)]!;
  if (from === to) return { from, to, t: 1 };
  const t = Math.min(1, Math.max(0, (progress - (to.fromScore - BLEND_ROOTS)) / BLEND_ROOTS));
  return t >= 1 ? { from: to, to, t: 1 } : { from, to, t };
}
