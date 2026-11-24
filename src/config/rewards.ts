/**
 * Achievements (one-time badges) and daily quests. Both are pure data:
 * each names a statistic and a target, and the meta-game code checks them.
 */

/** Numbers tracked during one round. */
export interface RunStats {
  score: number;
  flaps: number;
  coins: number;
  diamonds: number;
  nearMisses: number;
}

export type AchievementStat = keyof RunStats | 'bestAdventureScore';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  stat: AchievementStat;
  target: number;
  reward: number;
}

export const ACHIEVEMENTS: readonly Achievement[] = [
  { id: 'fledgling_flapper', name: 'FLEDGLING FLAPPER', description: 'Score 10 points in a single run', stat: 'score', target: 10, reward: 5 },
  { id: 'near_miss_master', name: 'NEAR-MISS MASTER', description: 'Perform 5 near-misses in a single run', stat: 'nearMisses', target: 5, reward: 10 },
  { id: 'spore_collector', name: 'SPORE COLLECTOR', description: 'Collect 20 coins in a single run', stat: 'coins', target: 20, reward: 10 },
  { id: 'diamond_hunter', name: 'DIAMOND HUNTER', description: 'Collect 3 diamonds in a single run', stat: 'diamonds', target: 3, reward: 15 },
  { id: 'perfect_explorer', name: 'PERFECT EXPLORER', description: 'Earn 3 stars (25 points) on any adventure level', stat: 'bestAdventureScore', target: 25, reward: 20 },
];

/** What a quest counts. Progress adds up across all rounds of the day. */
export type QuestKind = 'flaps' | 'coins' | 'nearMisses' | 'adventureRuns' | 'score';

export interface QuestTemplate {
  kind: QuestKind;
  text: string;
  target: number;
  reward: number;
}

export const QUEST_POOL: readonly QuestTemplate[] = [
  { kind: 'flaps', text: 'Flap 60 times', target: 60, reward: 20 },
  { kind: 'coins', text: 'Collect 80 gold coins', target: 80, reward: 25 },
  { kind: 'nearMisses', text: 'Perform 6 near-misses', target: 6, reward: 30 },
  { kind: 'adventureRuns', text: 'Complete an Adventure run', target: 1, reward: 30 },
  { kind: 'score', text: 'Score 150 points in total', target: 150, reward: 25 },
];

export const QUESTS_PER_DAY = 3;
