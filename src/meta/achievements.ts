import { BIOMES, biomeAt } from '../config/biomes';
import { CHAPTERS } from '../config/chapters';
import { chapterLevels } from '../config/levels';
import { ACHIEVEMENTS, type Achievement, type BadgeStat, type RunStats } from '../config/rewards';
import type { SaveData } from '../core/save';
import { bestLevelStars, levelStars } from './adventure';

/** The round just played; `endless` says whether its score counts for endless badges. */
export interface RunResult extends RunStats {
  endless: boolean;
}

/**
 * Unlocks every badge whose target is now met and returns the new ones so
 * the game can celebrate them. Badges pay nothing; a badge's trail becomes
 * the player's to wear.
 */
export function unlockAchievements(save: SaveData, run: RunResult): Achievement[] {
  const values = badgeValues(save, run);
  const unlocked = ACHIEVEMENTS.filter(
    (achievement) => !save.achievements.includes(achievement.id) && values[achievement.stat] >= achievement.target,
  );
  for (const achievement of unlocked) {
    save.achievements.push(achievement.id);
    if (achievement.trail && !save.ownedTrails.includes(achievement.trail)) save.ownedTrails.push(achievement.trail);
  }
  return unlocked;
}

function badgeValues(save: SaveData, run: RunResult): Record<BadgeStat, number> {
  const built = CHAPTERS.map((chapter) => chapterLevels(chapter.id)).filter((levels) => levels.length > 0);
  return {
    endlessScore: run.endless ? run.score : 0,
    biome: run.endless ? BIOMES.indexOf(biomeAt(run.score)) : 0,
    nearMisses: run.nearMisses,
    runDiamonds: run.diamonds,
    chaptersBeaten: built.filter((levels) => levelStars(save, levels.at(-1)!.id) > 0).length,
    bestLevelStars: bestLevelStars(save),
    perfectChapters: built.filter((levels) => levels.every((level) => levelStars(save, level.id) === 3)).length,
  };
}
