import type { ThemeId } from './theme';

/**
 * Every mode is described by data. Gameplay code reads these fields and never
 * checks a level's name or number, so a new level is a new entry here.
 */
export interface LevelConfig {
  id: number;
  name: string;
  description: string;
  theme: ThemeId;
  /** Starting scroll speed, px/s. */
  speed: number;
  /** Starting speed multiplier; grows with roots passed. */
  speedMultiplier: number;
  /** Distance between roots, px. */
  spacing: number;
  /** Gap height range, px. Equal values mean a fixed gap. */
  gap: { min: number; max: number };
  /** Gap breathes between min and max. */
  gapPulse: boolean;
  /** How gap centres are placed: random walk, waving tunnel, or high/low steps. */
  layout: 'random' | 'tunnel' | 'staggered';
  /** 'alternate' gives roots only from the ceiling, then only from the ground. */
  columns: 'both' | 'alternate';
  /** Gaps that slide up and down at constant speed. */
  drift: { chance: number; speed: number } | null;
  /** Gaps that swing smoothly (overrides drift). */
  sway: boolean;
  /** Roots slide left and right. */
  slide: boolean;
  /** Root width breathes. */
  widthPulse: boolean;
  /** Glowing swarms float in the open side of each root. */
  glowflies: boolean;
  /** Updraft and downdraft zones appear. */
  wind: boolean;
  /** Endless only: gap shrinks, drift and sway appear, backdrop changes with progress. */
  progressive: boolean;
}

const level = (config: Omit<LevelConfig, 'gapPulse' | 'layout' | 'columns' | 'drift' | 'sway' | 'slide' | 'widthPulse' | 'glowflies' | 'wind' | 'progressive'> & Partial<LevelConfig>): LevelConfig => ({
  gapPulse: false,
  layout: 'random',
  columns: 'both',
  drift: null,
  sway: false,
  slide: false,
  widthPulse: false,
  glowflies: false,
  wind: false,
  progressive: false,
  ...config,
});

export const ENDLESS_LEVEL_ID = 0;

export const LEVELS: readonly LevelConfig[] = [
  level({
    id: 0, name: 'ENDLESS MODE', theme: 'classic', description: 'Survive as long as you can in the deep forest.',
    speed: 120, speedMultiplier: 1, spacing: 290, gap: { min: 115, max: 140 }, wind: true, progressive: true,
  }),
  level({
    id: 1, name: 'GLOWFLY VALE', theme: 'glowfly',
    description: 'Dodge alternating breathing roots while weaving around floating glowfly swarms.',
    speed: 126, speedMultiplier: 1.1, spacing: 230, gap: { min: 125, max: 125 }, columns: 'alternate', widthPulse: true, glowflies: true,
  }),
  level({
    id: 2, name: 'CANOPY WINDS', theme: 'amber', description: 'Gaps drift up and down, and the wind pushes back. Time your flaps carefully.',
    speed: 126, speedMultiplier: 1.1, spacing: 290, gap: { min: 145, max: 145 }, drift: { chance: 1, speed: 48 }, wind: true,
  }),
  level({
    id: 3, name: 'CONSTRICTED PASSAGE', theme: 'ice', description: 'Extremely tight spaces. High precision required.',
    speed: 126, speedMultiplier: 1.05, spacing: 290, gap: { min: 120, max: 120 },
  }),
  level({
    id: 4, name: 'PULSATING SPORES', theme: 'purple', description: 'Gaps breathe! Shrinking and expanding corridors.',
    speed: 132, speedMultiplier: 1.1, spacing: 290, gap: { min: 110, max: 170 }, gapPulse: true,
  }),
  level({
    id: 5, name: 'CREEPING ROOTS', theme: 'red', description: 'Roots slide sideways, shifting the spacing.',
    speed: 132, speedMultiplier: 1.1, spacing: 290, gap: { min: 140, max: 140 }, slide: true,
  }),
  level({
    id: 6, name: 'STAGGERED STEPS', theme: 'orange', description: 'Extreme height changes. Climb and dive rapidly.',
    speed: 138, speedMultiplier: 1.15, spacing: 290, gap: { min: 135, max: 135 }, layout: 'staggered',
  }),
  level({
    id: 7, name: 'WINDING CANOPY TUNNEL', theme: 'green', description: 'Fly through a narrow, waving canopy tunnel.',
    speed: 132, speedMultiplier: 1.1, spacing: 170, gap: { min: 135, max: 135 }, layout: 'tunnel', sway: true,
  }),
  level({
    id: 8, name: 'MAZE OF VINES', theme: 'crimson', description: 'Swinging gaps and sliding roots. The vines close in.',
    speed: 138, speedMultiplier: 1.2, spacing: 290, gap: { min: 130, max: 130 }, sway: true, slide: true,
  }),
  level({
    id: 9, name: 'BIOLUME STORM', theme: 'biolume', description: 'The final trial: swinging, breathing and sliding roots in a storm of wind.',
    speed: 138, speedMultiplier: 1.15, spacing: 190, gap: { min: 130, max: 170 }, gapPulse: true, sway: true, slide: true, wind: true,
  }),
];

export function levelById(id: number): LevelConfig {
  return LEVELS.find((config) => config.id === id) ?? LEVELS[0]!;
}

export const ADVENTURE_LEVELS = LEVELS.filter((config) => config.id !== ENDLESS_LEVEL_ID);

/** Best score needed for 1, 2 and 3 stars on an adventure level. */
export const STAR_THRESHOLDS = [5, 12, 25] as const;

export function starsFor(bestScore: number): number {
  return STAR_THRESHOLDS.filter((needed) => bestScore >= needed).length;
}

/** Price to unlock adventure mode. The old game had 0/0 as a placeholder: a decision for Martin. */
export const ADVENTURE_UNLOCK_COST = { coins: 0, diamonds: 0 } as const;
