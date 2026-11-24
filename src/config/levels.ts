import type { ThemeId } from './theme';

/**
 * One part of a level, played in order. A level ends with a finish gate once
 * its last stage is done; endless is a single roots stage with no end.
 */
export type Stage =
  /** Roots to fly through; `count: null` never ends. */
  | { kind: 'roots'; count: number | null }
  /** No roots: the Stone Thrower attacks until the time is survived. */
  | { kind: 'boss'; seconds: number };

/** Root indexes: the first, then one every `every` roots (null: just the first). */
export interface Schedule {
  first: number;
  every: number | null;
}

/**
 * Every mode is described by data. Gameplay code reads these fields and never
 * checks a level's name or number, so a new level is a new entry here.
 */
export interface LevelConfig {
  id: number;
  name: string;
  description: string;
  theme: ThemeId;
  stages: readonly Stage[];
  /** Same roots, gaps and pickups on every attempt, so the level can be learned. */
  fixedLayout: boolean;
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
  /** How gap centres are placed: random walk or a waving tunnel. */
  layout: 'random' | 'tunnel';
  /** Gaps that slide up and down at constant speed. */
  drift: { chance: number; speed: number } | null;
  /** Gaps that swing smoothly (overrides drift). */
  sway: boolean;
  /** Roots slide left and right. */
  slide: boolean;
  /** Updraft and downdraft zones appear once this many roots are passed; null = never. */
  windFromRoot: number | null;
  /** Magnets can appear from this root on (earlier rolls give a coin instead). */
  magnetFromRoot: number;
  /** Now and then a root is left out and a cluster of coins floats in the empty space (from this root on). */
  clearings: { fromRoot: number; chance: number } | null;
  /** Root index of the first diamond, then one every `every` roots (null: just the one). */
  diamonds: Schedule | null;
  /** Roots carrying a crystal vein, on the same kind of schedule. */
  veins: Schedule | null;
  /** Chance that a coin is a huge golden one worth 10 (a surprise, so endless only). */
  goldenCoinChance: number;
  /** Endless only: gap shrinks, drift and sway appear, backdrop changes with progress. */
  progressive: boolean;
  /**
   * Twist levels mirror the picture, never the rules: 'upsideDown' (fall up,
   * a tap pushes you down) or 'backwards' (fly from right to left).
   */
  view: 'normal' | 'upsideDown' | 'backwards';
}

type Defaults =
  | 'fixedLayout' | 'gapPulse' | 'layout' | 'drift' | 'sway' | 'slide'
  | 'windFromRoot' | 'magnetFromRoot' | 'clearings' | 'diamonds' | 'veins' | 'goldenCoinChance' | 'progressive' | 'view';

/** An adventure level: fixed layout, one crystal vein in the climax, everything else off unless set. */
const level = (config: Omit<LevelConfig, Defaults> & Partial<LevelConfig>): LevelConfig => {
  const roots = rootCount(config);
  return {
    fixedLayout: true,
    gapPulse: false,
    layout: 'random',
    drift: null,
    sway: false,
    slide: false,
    windFromRoot: null,
    magnetFromRoot: 0,
    clearings: null,
    diamonds: null,
    veins: roots > 0 ? { first: roots - 3, every: null } : null,
    goldenCoinChance: 0,
    progressive: false,
    view: 'normal',
    ...config,
  };
};

export const ENDLESS_LEVEL_ID = 0;

export const LEVELS: readonly LevelConfig[] = [
  level({
    id: 0, name: 'ENDLESS MODE', theme: 'classic', description: 'Survive as long as you can in the deep forest.',
    stages: [{ kind: 'roots', count: null }], fixedLayout: false,
    speed: 120, speedMultiplier: 1, spacing: 290, gap: { min: 115, max: 140 },
    // New things arrive along the journey: magnets in the morning woods, wind up on the highland pass.
    magnetFromRoot: 40, windFromRoot: 120, clearings: { fromRoot: 4, chance: 0.14 },
    diamonds: { first: 12, every: 20 }, veins: { first: 20, every: 30 }, goldenCoinChance: 0.05, progressive: true,
  }),
  // Regular levels add one new thing each; twist levels change a rule you know by heart and keep the gaps simple.
  level({
    id: 1, name: 'FIRST LIGHT', theme: 'dawn', description: 'Plain, generous gaps. Find your rhythm.',
    stages: [{ kind: 'roots', count: 20 }], speed: 120, speedMultiplier: 1, spacing: 300, gap: { min: 150, max: 150 },
  }),
  level({
    id: 2, name: 'NARROW PASSAGE', theme: 'ice', description: 'Tighter gaps. Every flap counts.',
    stages: [{ kind: 'roots', count: 22 }], speed: 124, speedMultiplier: 1, spacing: 290, gap: { min: 128, max: 128 },
  }),
  level({
    id: 3, name: 'DRIFTING CANOPY', theme: 'amber', description: 'The gaps slowly move. Aim where they will be.',
    stages: [{ kind: 'roots', count: 24 }], speed: 124, speedMultiplier: 1.05, spacing: 290, gap: { min: 145, max: 145 },
    drift: { chance: 1, speed: 40 },
  }),
  level({
    id: 4, name: 'BREATHING HOLLOW', theme: 'purple', description: 'The gaps breathe. Slip through as they open.',
    stages: [{ kind: 'roots', count: 26 }], speed: 128, speedMultiplier: 1.05, spacing: 290, gap: { min: 112, max: 172 },
    gapPulse: true,
  }),
  level({
    id: 5, name: 'THE STONE THROWER', theme: 'crimson', description: 'No roots. Something in the dark throws rocks. Survive.',
    stages: [{ kind: 'boss', seconds: 45 }], speed: 120, speedMultiplier: 1, spacing: 290, gap: { min: 150, max: 150 },
  }),
  level({
    id: 6, name: 'CREEPING ROOTS', theme: 'red', description: 'Roots slide sideways. Watch the spacing.',
    stages: [{ kind: 'roots', count: 28 }], speed: 128, speedMultiplier: 1.1, spacing: 290, gap: { min: 140, max: 140 },
    slide: true,
  }),
  level({
    id: 7, name: 'UPSIDE-DOWN GROVE', theme: 'green', description: 'Gravity is reversed: you fall up, a tap pushes you down.',
    stages: [{ kind: 'roots', count: 24 }], speed: 124, speedMultiplier: 1, spacing: 300, gap: { min: 148, max: 148 },
    view: 'upsideDown',
  }),
  level({
    id: 8, name: 'CANOPY WINDS', theme: 'canopy', description: 'Updrafts lift you, downdrafts pull you down.',
    stages: [{ kind: 'roots', count: 30 }], speed: 128, speedMultiplier: 1.05, spacing: 290, gap: { min: 145, max: 145 },
    windFromRoot: 0,
  }),
  level({
    id: 9, name: 'THE WAY HOME', theme: 'orange', description: 'Fly back from right to left, through moving gaps.',
    stages: [{ kind: 'roots', count: 32 }], speed: 126, speedMultiplier: 1.05, spacing: 300, gap: { min: 145, max: 145 },
    drift: { chance: 0.6, speed: 36 }, view: 'backwards',
  }),
  level({
    id: 10, name: 'HEART OF THE STORM', theme: 'biolume', description: 'A swinging tunnel, then the Stone Thrower returns.',
    stages: [{ kind: 'roots', count: 40 }, { kind: 'boss', seconds: 30 }], speed: 130, speedMultiplier: 1.1, spacing: 170,
    gap: { min: 138, max: 138 }, layout: 'tunnel', sway: true,
  }),
];

export function levelById(id: number): LevelConfig {
  return LEVELS.find((config) => config.id === id) ?? LEVELS[0]!;
}

export const ADVENTURE_LEVELS = LEVELS.filter((config) => config.id !== ENDLESS_LEVEL_ID);

/** Roots in all of a level's stages (endless: 0, it never ends). */
export function rootCount(config: { stages: readonly Stage[] }): number {
  return config.stages.reduce((sum, stage) => sum + (stage.kind === 'roots' ? (stage.count ?? 0) : 0), 0);
}

/** Price to unlock adventure mode: a few good evenings of endless. */
export const ADVENTURE_UNLOCK_COST = { coins: 50, diamonds: 3 } as const;
