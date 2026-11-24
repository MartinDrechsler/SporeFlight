import { ADVENTURE_LEVELS } from '../config/levels';
import type { SaveData } from '../core/save';

/**
 * Progress through Adventure, as pure functions on SaveData: stars, which
 * levels are open, and banking a finished level. Each level opens when the
 * one before it has been finished.
 */
export interface LevelRun {
  levelId: number;
  coins: number;
  /** Coins that appeared in the level, collected or not. */
  coinsOffered: number;
  diamonds: number;
  diamondsOffered: number;
}

/** Share of a level's coins needed for the second star. */
export const TWO_STAR_COIN_SHARE = 0.8;

/** 1 star for finishing, 2 for most of the coins, 3 for every coin and the diamond. */
export function starsFor(run: LevelRun): number {
  const allCoins = run.coins >= run.coinsOffered;
  if (allCoins && run.diamonds >= run.diamondsOffered) return 3;
  if (run.coins >= run.coinsOffered * TWO_STAR_COIN_SHARE) return 2;
  return 1;
}

export function levelStars(save: SaveData, levelId: number): number {
  return save.levelStars[String(levelId)] ?? 0;
}

export function isLevelOpen(save: SaveData, levelId: number): boolean {
  const index = ADVENTURE_LEVELS.findIndex((level) => level.id === levelId);
  if (index < 0) return false;
  const before = ADVENTURE_LEVELS[index - 1];
  return before === undefined || levelStars(save, before.id) > 0;
}

/** The level after this one, or null after the last. */
export function nextLevelId(levelId: number): number | null {
  const index = ADVENTURE_LEVELS.findIndex((level) => level.id === levelId);
  return ADVENTURE_LEVELS[index + 1]?.id ?? null;
}

/** The furthest level the player may fly: the first open level without stars, else the last. */
export function currentLevelId(save: SaveData): number {
  const open = ADVENTURE_LEVELS.filter((level) => isLevelOpen(save, level.id));
  return (open.find((level) => levelStars(save, level.id) === 0) ?? open.at(-1) ?? ADVENTURE_LEVELS[0]!).id;
}

export interface FinishResult {
  stars: number;
  /** True when this run beat the level's previous star count. */
  improved: boolean;
  /** The level this finish opened for the first time, if any. */
  opened: number | null;
}

/** Banks what the run collected and records its stars. Finishing costs no life. */
export function finishLevel(save: SaveData, run: LevelRun): FinishResult {
  const next = nextLevelId(run.levelId);
  const wasOpen = next !== null && isLevelOpen(save, next);
  save.coins += run.coins;
  save.diamonds += run.diamonds;
  const stars = starsFor(run);
  const previous = levelStars(save, run.levelId);
  if (stars > previous) save.levelStars[String(run.levelId)] = stars;
  return { stars, improved: stars > previous, opened: next !== null && !wasOpen ? next : null };
}

/** Highest star count on any level, for the badge. */
export function bestLevelStars(save: SaveData): number {
  return Math.max(0, ...Object.values(save.levelStars));
}
