import type { ThemeId } from './theme';

/**
 * One part of a level, played in order. A level ends with a finish gate once
 * its last stage is done; endless is a single roots stage with no end.
 */
export type Stage =
  /** Roots to fly through; `count: null` never ends. */
  | { kind: 'roots'; count: number | null }
  /** No roots: the Stone Thrower attacks until the time is survived. */
  | { kind: 'boss'; seconds: number; boss: BossId };

/** Which monster a boss stage is (gameplay/boss.ts): the Stone Thrower ends chapter 1, the Bat Queen chapter 2. */
export type BossId = 'stoneThrower' | 'batQueen';

/** What a tap does (gameplay/modes.ts): flap, or glide (a steady climb or dive that a tap turns). */
export type FlightMode = 'flap' | 'glide';

/** Cave hazards placed between roots (gameplay/hazards.ts). */
export type HazardKind = 'bat' | 'stalactite';

/** The distant world behind an adventure level, drawn in the level's theme colours. */
export type Backdrop = 'forest' | 'peaks' | 'skyline' | 'towers' | 'ruins' | 'castle' | 'windmills' | 'caverns';

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
  /** Adventure: what stands on the horizon. Endless (null) travels through its biomes instead. */
  backdrop: Backdrop | null;
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
  /** Adventure chapter (1 to 5); endless is 0. */
  chapter: number;
  /** Fork sections: from root `first`, the next `roots` roots each have a second, tighter gap with a coin. */
  forks: readonly { first: number; roots: number }[];
  /** A secret gap at root `root`: flying through it finishes the level and opens secret level `levelId`. */
  secret: { root: number; levelId: number } | null;
  /** Root index of a halfway checkpoint (null: none). A crash after it may restart from there. */
  checkpoint: number | null;
  /** A secret level: found through the secret gap of this level id (null: an ordinary level). */
  secretOf: number | null;
  /** A dark cave: only the mushroom's glow and a few lights cut through (drawing only; the rules are the same). */
  dark: boolean;
  /** Fireflies hover in the next gaps, showing the way through the dark. */
  fireflies: boolean;
  /** Portals after the given roots switch the flight mode; a level starts in `startMode`. */
  portals: readonly { root: number; mode: FlightMode }[];
  startMode: FlightMode;
  /** Hazards after the given roots, midway to the next. */
  hazards: readonly { root: number; kind: HazardKind }[];
  /** Sporelings to rescue, spread through the level's roots, each near a gap's edge. */
  sporelings: number;
  /** Chance that a coin is a huge golden one worth 10 (a surprise, so endless only). */
  goldenCoinChance: number;
  /** Endless only: the run never ends, speed keeps rising, the backdrop changes with progress. Gaps stay the same. */
  progressive: boolean;
  /**
   * Twist levels mirror the picture, never the rules: 'upsideDown' (fall up,
   * a tap pushes you down) or 'backwards' (fly from right to left).
   */
  view: 'normal' | 'upsideDown' | 'backwards';
}

type Defaults =
  | 'fixedLayout' | 'gapPulse' | 'layout' | 'drift' | 'sway' | 'slide'
  | 'windFromRoot' | 'magnetFromRoot' | 'clearings' | 'diamonds' | 'veins' | 'goldenCoinChance' | 'progressive' | 'view'
  | 'sporelings' | 'forks' | 'secret' | 'checkpoint' | 'secretOf' | 'dark' | 'fireflies' | 'portals' | 'startMode' | 'hazards';

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
    sporelings: 0,
    forks: [],
    secret: null,
    // Long levels get a checkpoint halfway.
    checkpoint: roots >= 28 ? Math.floor(roots / 2) : null,
    secretOf: null,
    dark: false,
    fireflies: false,
    portals: [],
    startMode: 'flap',
    hazards: [],
    progressive: false,
    view: 'normal',
    ...config,
  };
};

export const ENDLESS_LEVEL_ID = 0;

export const LEVELS: readonly LevelConfig[] = [
  level({
    id: 0, chapter: 0, name: 'ENDLESS MODE', theme: 'classic', backdrop: null, description: 'Survive as long as you can in the deep forest.',
    stages: [{ kind: 'roots', count: null }], fixedLayout: false,
    // Every gap the same size and still: only the speed rises. Moving and tighter gaps belong to adventure.
    speed: 120, speedMultiplier: 1, spacing: 290, gap: { min: 132, max: 132 },
    magnetFromRoot: 40, clearings: { fromRoot: 4, chance: 0.14 },
    diamonds: { first: 12, every: 20 }, veins: { first: 20, every: 30 }, goldenCoinChance: 0.05, progressive: true,
  }),
  // Regular levels add one new thing each; twist levels change a rule you know by heart and keep the gaps simple.
  level({
    id: 1, chapter: 1, sporelings: 3, name: 'FIRST LIGHT', theme: 'dawn', backdrop: 'forest', description: 'Plain, generous gaps. Find your rhythm.',
    stages: [{ kind: 'roots', count: 20 }], speed: 120, speedMultiplier: 1, spacing: 300, gap: { min: 150, max: 150 },
  }),
  level({
    id: 2, chapter: 1, sporelings: 3, name: 'NARROW PASSAGE', theme: 'ice', backdrop: 'peaks', description: 'Tighter gaps. Every flap counts.',
    stages: [{ kind: 'roots', count: 22 }], speed: 124, speedMultiplier: 1, spacing: 290, gap: { min: 128, max: 128 },
  }),
  level({
    id: 3, chapter: 1, sporelings: 3, name: 'DRIFTING CANOPY', theme: 'amber', backdrop: 'skyline', description: 'The gaps slowly move. Aim where they will be.',
    stages: [{ kind: 'roots', count: 24 }], speed: 124, speedMultiplier: 1.05, spacing: 290, gap: { min: 145, max: 145 },
    drift: { chance: 1, speed: 40 },
    forks: [{ first: 9, roots: 3 }],
  }),
  level({
    id: 4, chapter: 1, sporelings: 4, name: 'BREATHING HOLLOW', theme: 'purple', backdrop: 'towers', description: 'The gaps breathe. Slip through as they open.',
    stages: [{ kind: 'roots', count: 26 }], speed: 128, speedMultiplier: 1.05, spacing: 290, gap: { min: 112, max: 172 },
    gapPulse: true,
    forks: [{ first: 6, roots: 3 }, { first: 17, roots: 3 }],
  }),
  level({
    id: 5, chapter: 1, name: 'THE STONE THROWER', theme: 'crimson', backdrop: 'ruins', description: 'No roots. Something in the dark throws rocks. Survive.',
    stages: [{ kind: 'boss', seconds: 45, boss: 'stoneThrower' }], speed: 120, speedMultiplier: 1, spacing: 290, gap: { min: 150, max: 150 },
  }),
  level({
    id: 6, chapter: 1, sporelings: 4, name: 'CREEPING ROOTS', theme: 'red', backdrop: 'castle', description: 'Roots slide sideways. Watch the spacing.',
    stages: [{ kind: 'roots', count: 28 }], speed: 128, speedMultiplier: 1.1, spacing: 290, gap: { min: 140, max: 140 },
    slide: true,
    forks: [{ first: 6, roots: 3 }, { first: 18, roots: 3 }],
    // The chapter's secret: a small gap high above, halfway through.
    secret: { root: 13, levelId: 11 },
  }),
  level({
    id: 7, chapter: 1, sporelings: 3, name: 'UPSIDE-DOWN GROVE', theme: 'green', backdrop: 'forest', description: 'Gravity is reversed: you fall up, a tap pushes you down.',
    stages: [{ kind: 'roots', count: 24 }], speed: 124, speedMultiplier: 1, spacing: 300, gap: { min: 148, max: 148 },
    view: 'upsideDown',
    forks: [{ first: 12, roots: 3 }],
  }),
  level({
    id: 8, chapter: 1, sporelings: 5, name: 'FOREST EDGE', theme: 'canopy', backdrop: 'windmills',
    description: 'Wind and moving gaps together: everything the woods taught you.',
    stages: [{ kind: 'roots', count: 30 }], speed: 128, speedMultiplier: 1.05, spacing: 290, gap: { min: 145, max: 145 },
    windFromRoot: 0, drift: { chance: 0.5, speed: 34 },
    forks: [{ first: 5, roots: 4 }, { first: 16, roots: 4 }],
  }),
  level({
    id: 9, chapter: 5, sporelings: 4, name: 'THE WAY HOME', theme: 'orange', backdrop: 'skyline', description: 'Fly back from right to left, through moving gaps.',
    stages: [{ kind: 'roots', count: 32 }], speed: 126, speedMultiplier: 1.05, spacing: 300, gap: { min: 145, max: 145 },
    drift: { chance: 0.6, speed: 36 }, view: 'backwards',
  }),
  level({
    id: 10, chapter: 4, sporelings: 5, name: 'HEART OF THE STORM', theme: 'biolume', backdrop: 'towers', description: 'A swinging tunnel, then the Stone Thrower returns.',
    stages: [{ kind: 'roots', count: 40 }, { kind: 'boss', seconds: 30, boss: 'stoneThrower' }], speed: 130, speedMultiplier: 1.1, spacing: 170,
    gap: { min: 138, max: 138 }, layout: 'tunnel', sway: true,
  }),
  // Secret levels: found only through a secret gap, outside the chapter's order.
  level({
    id: 11, chapter: 1, sporelings: 5, secretOf: 6, name: 'HIDDEN GROVE', theme: 'biolume', backdrop: 'forest',
    description: 'A secret grove full of light, coins and lost sporelings.',
    stages: [{ kind: 'roots', count: 18 }], speed: 120, speedMultiplier: 1, spacing: 280, gap: { min: 150, max: 150 },
    clearings: { fromRoot: 2, chance: 0.3 }, diamonds: { first: 8, every: null }, forks: [{ first: 4, roots: 3 }, { first: 12, roots: 3 }],
  }),
  // Chapter 2, Glowcap Caverns: darkness, bats, dripping stalactites, and gliding on a dandelion seed.
  level({
    id: 12, chapter: 2, sporelings: 3, name: 'INTO THE DARK', theme: 'cave', backdrop: 'caverns',
    description: 'Only your glow lights the way. Fireflies show the gaps.',
    stages: [{ kind: 'roots', count: 20 }], speed: 120, speedMultiplier: 1, spacing: 300, gap: { min: 155, max: 155 },
    dark: true, fireflies: true,
  }),
  level({
    id: 13, chapter: 2, sporelings: 3, name: 'LANTERN PATH', theme: 'cave', backdrop: 'caverns',
    description: 'No more fireflies. Follow the glowing tips of each gap.',
    stages: [{ kind: 'roots', count: 22 }], speed: 122, speedMultiplier: 1, spacing: 300, gap: { min: 148, max: 148 },
    dark: true, forks: [{ first: 9, roots: 3 }],
  }),
  level({
    id: 14, chapter: 2, sporelings: 4, name: 'DRIPPING HALLS', theme: 'glowcap', backdrop: 'caverns',
    description: 'A dripping stalactite drops when you pass below. Pass it low.',
    stages: [{ kind: 'roots', count: 24 }], speed: 122, speedMultiplier: 1, spacing: 310, gap: { min: 150, max: 150 },
    hazards: every('stalactite', 2, 3, 22), forks: [{ first: 13, roots: 3 }],
  }),
  level({
    id: 15, chapter: 2, sporelings: 4, name: 'BAT ROOST', theme: 'glowcap', backdrop: 'caverns',
    description: 'Bats flutter up and down between the roots. Learn their beat.',
    stages: [{ kind: 'roots', count: 26 }], speed: 124, speedMultiplier: 1, spacing: 320, gap: { min: 150, max: 150 },
    hazards: every('bat', 1, 2, 23), forks: [{ first: 16, roots: 3 }],
  }),
  level({
    id: 16, chapter: 2, sporelings: 4, name: 'SEED ON THE WIND', theme: 'cave', backdrop: 'caverns',
    description: 'Ride a dandelion seed: a tap turns between climbing and diving.',
    stages: [{ kind: 'roots', count: 28 }], speed: 124, speedMultiplier: 1, spacing: 300, gap: { min: 150, max: 150 },
    startMode: 'glide', drift: { chance: 0.4, speed: 30 },
    // Glide, then a stretch of flapping, then gliding again to the end.
    portals: [{ root: 9, mode: 'flap' }, { root: 17, mode: 'glide' }],
  }),
  level({
    id: 17, chapter: 2, sporelings: 4, name: 'ECHOING FORKS', theme: 'cave', backdrop: 'caverns',
    description: 'Many ways through the dark. One of them leads somewhere secret.',
    stages: [{ kind: 'roots', count: 28 }], speed: 126, speedMultiplier: 1.05, spacing: 310, gap: { min: 145, max: 145 },
    dark: true, fireflies: true,
    forks: [{ first: 4, roots: 4 }, { first: 16, roots: 4 }],
    hazards: [...every('bat', 9, 3, 15), ...every('stalactite', 21, 3, 25)],
    // The chapter's secret: a small gap high above, in the middle of the dark.
    secret: { root: 13, levelId: 20 },
  }),
  level({
    id: 18, chapter: 2, sporelings: 5, name: 'GLOW GAUNTLET', theme: 'glowcap', backdrop: 'caverns',
    description: 'Everything the caves taught you, in the dark, before the Queen.',
    stages: [{ kind: 'roots', count: 32 }], speed: 128, speedMultiplier: 1.05, spacing: 320, gap: { min: 148, max: 148 },
    dark: true, fireflies: true,
    hazards: [...every('stalactite', 2, 4, 14), ...every('bat', 4, 4, 14), ...every('bat', 25, 2, 29)],
    portals: [{ root: 15, mode: 'glide' }, { root: 22, mode: 'flap' }],
  }),
  level({
    id: 19, chapter: 2, name: 'THE BAT QUEEN', theme: 'glowcap', backdrop: 'caverns',
    description: 'She rules the dark. Her bats swoop, and her screech dims your light.',
    stages: [{ kind: 'boss', seconds: 45, boss: 'batQueen' }], speed: 120, speedMultiplier: 1, spacing: 290, gap: { min: 150, max: 150 },
    dark: true,
  }),
  level({
    id: 20, chapter: 2, sporelings: 5, secretOf: 17, name: 'CRYSTAL HOLLOW', theme: 'biolume', backdrop: 'caverns',
    description: 'A hidden hollow of crystal, glided through on a seed.',
    stages: [{ kind: 'roots', count: 18 }], speed: 120, speedMultiplier: 1, spacing: 290, gap: { min: 160, max: 160 },
    startMode: 'glide', clearings: { fromRoot: 2, chance: 0.3 }, diamonds: { first: 6, every: 6 },
  }),
];

/** Hazards of one kind after every `step`th root from `first` up to `last`. */
function every(kind: HazardKind, first: number, step: number, last: number): { root: number; kind: HazardKind }[] {
  const out: { root: number; kind: HazardKind }[] = [];
  for (let root = first; root <= last; root += step) out.push({ root, kind });
  return out;
}

/** Levels found only through a secret gap. */
export function secretLevels(): readonly LevelConfig[] {
  return LEVELS.filter((config) => config.secretOf !== null);
}

export function levelById(id: number): LevelConfig {
  return LEVELS.find((config) => config.id === id) ?? LEVELS[0]!;
}

/**
 * The order Adventure is played in, chapter by chapter; each chapter ends with its boss. Levels that
 * belong to chapters not built yet (The Way Home, Heart of the Storm) wait outside it until then.
 */
const ADVENTURE_ORDER = [1, 2, 3, 7, 4, 6, 8, 5, 12, 13, 14, 15, 16, 17, 18, 19] as const;

export const ADVENTURE_LEVELS: readonly LevelConfig[] = ADVENTURE_ORDER.map(levelById);

/** A chapter's playable levels, in order (none yet: coming soon). */
export function chapterLevels(chapter: number): readonly LevelConfig[] {
  return ADVENTURE_LEVELS.filter((config) => config.chapter === chapter);
}

/** Roots in all of a level's stages (endless: 0, it never ends). */
export function rootCount(config: { stages: readonly Stage[] }): number {
  return config.stages.reduce((sum, stage) => sum + (stage.kind === 'roots' ? (stage.count ?? 0) : 0), 0);
}

/** Price to unlock adventure mode: a few good evenings of endless. */
export const ADVENTURE_UNLOCK_COST = { coins: 50, diamonds: 3 } as const;
