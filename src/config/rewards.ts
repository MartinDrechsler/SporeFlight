import { BIOMES } from './biomes';

/**
 * Badges (one-time honours) and daily quests. Both are pure data: each names
 * a statistic and a target, and the meta-game code checks them.
 */

/** Numbers tracked during one round. */
export interface RunStats {
  score: number;
  flaps: number;
  coins: number;
  diamonds: number;
  nearMisses: number;
  /** Crystal veins broken open. */
  veins: number;
}

/** What a badge measures: the round just played, or progress kept in the save. */
export type BadgeStat =
  | 'endlessScore'
  /** Number of the furthest biome reached in an endless run (0 = the first). */
  | 'biome'
  | 'nearMisses'
  | 'runDiamonds'
  | 'highestLevel'
  | 'bestLevelStars'
  | 'perfectLevels';

/**
 * A badge is pure honour: it pays no coins (coins only come from collecting
 * and quests). Some unlock a glow trail only badge holders have.
 */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  stat: BadgeStat;
  target: number;
  /** Trail that comes with this badge, by id. */
  trail?: string;
}

export const ACHIEVEMENTS: readonly Achievement[] = [
  { id: 'sprout', name: 'SPROUT', description: 'Reach 10 in endless', stat: 'endlessScore', target: 10 },
  { id: 'sky_wanderer', name: 'SKY WANDERER', description: 'Reach 20 in endless', stat: 'endlessScore', target: 20 },
  { id: 'forest_legend', name: 'FOREST LEGEND', description: 'Reach 50 in endless', stat: 'endlessScore', target: 50, trail: 'rainbow' },
  // One badge for arriving in each new biome.
  ...BIOMES.slice(1).map((biome, i) => ({
    id: `biome_${biome.id}`,
    name: biome.name,
    description: `Reach the ${titleCase(biome.name)} in endless`,
    stat: 'biome' as const,
    target: i + 1,
  })),
  { id: 'near_miss_master', name: 'NEAR-MISS MASTER', description: '5 near misses in one run', stat: 'nearMisses', target: 5, trail: 'gold' },
  { id: 'diamond_hunter', name: 'DIAMOND HUNTER', description: 'Collect 3 diamonds in one run', stat: 'runDiamonds', target: 3 },
  { id: 'stone_breaker', name: 'STONE BREAKER', description: 'Beat the Stone Thrower (level 5)', stat: 'highestLevel', target: 5 },
  { id: 'storm_rider', name: 'STORM RIDER', description: 'Finish Heart of the Storm (level 10)', stat: 'highestLevel', target: 10, trail: 'lightning' },
  { id: 'perfect_explorer', name: 'PERFECT EXPLORER', description: '3 stars on any adventure level', stat: 'bestLevelStars', target: 3 },
  { id: 'forest_master', name: 'FOREST MASTER', description: '3 stars on every adventure level', stat: 'perfectLevels', target: 10, trail: 'aurora' },
];

function titleCase(text: string): string {
  return text.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/** What a quest counts. */
export type QuestKind = 'endlessScore' | 'runCoins' | 'coins' | 'levelsFinished' | 'veins' | 'nearMisses' | 'flaps';

export interface QuestTemplate {
  kind: QuestKind;
  text: string;
  target: number;
  /** Coins paid when claimed: small and earned. */
  reward: number;
  /** 'total' adds up over the day; 'best' is the best single run of the day. */
  mode: 'total' | 'best';
  /** Only offered once Adventure is unlocked. */
  needsAdventure?: boolean;
}

export const QUEST_POOL: readonly QuestTemplate[] = [
  { kind: 'endlessScore', text: 'Reach 15 in endless', target: 15, reward: 10, mode: 'best' },
  { kind: 'runCoins', text: 'Collect 5 coins in one run', target: 5, reward: 8, mode: 'best' },
  { kind: 'coins', text: 'Collect 20 coins today', target: 20, reward: 10, mode: 'total' },
  { kind: 'levelsFinished', text: 'Finish an Adventure level', target: 1, reward: 15, mode: 'total', needsAdventure: true },
  { kind: 'veins', text: 'Crack open a crystal vein', target: 1, reward: 15, mode: 'total' },
  { kind: 'nearMisses', text: 'Make 6 near misses', target: 6, reward: 8, mode: 'total' },
  { kind: 'flaps', text: 'Flap 100 times', target: 100, reward: 5, mode: 'total' },
];

export const QUESTS_PER_DAY = 3;
