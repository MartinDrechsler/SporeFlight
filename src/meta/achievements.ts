import { ACHIEVEMENTS, type Achievement, type RunStats } from '../config/rewards';
import type { SaveData } from '../core/save';

/** Best score on any adventure level (index 0 is endless and is skipped). */
export function bestAdventureScore(save: SaveData): number {
  return Math.max(0, ...save.levelBest.slice(1));
}

/**
 * Unlocks every achievement whose target is now met, pays its reward and
 * returns the newly unlocked ones so the game can celebrate them.
 */
export function unlockAchievements(save: SaveData, stats: RunStats): Achievement[] {
  const values: Record<Achievement['stat'], number> = { ...stats, bestAdventureScore: bestAdventureScore(save) };
  const unlocked = ACHIEVEMENTS.filter(
    (achievement) => !save.achievements.includes(achievement.id) && values[achievement.stat] >= achievement.target,
  );
  for (const achievement of unlocked) {
    save.achievements.push(achievement.id);
    save.coins += achievement.reward;
  }
  return unlocked;
}
