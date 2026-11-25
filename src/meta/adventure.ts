import { ADVENTURE_LEVELS, levelById } from '../config/levels';
import type { LevelProgress, SaveData } from '../core/save';

/**
 * Progress through Adventure, as pure functions on SaveData: stars, which
 * levels are open, and banking a finished level. Each level opens when the
 * one before it has been finished; a chapter opens with its previous boss.
 *
 * A level has three stars, each its own goal, kept once earned (they can be
 * earned on different runs): finishing, rescuing every sporeling, and
 * collecting every coin. Its diamonds pay out only once, whatever the run.
 */
export interface LevelRun {
  levelId: number;
  coins: number;
  /** Coins that appeared in the level, collected or not. */
  coinsOffered: number;
  diamonds: number;
  sporelings: number;
  sporelingsOffered: number;
}

/** The goals a run reached, besides finishing. */
export function goalsReached(run: LevelRun): { sporelings: boolean; coins: boolean } {
  return { sporelings: run.sporelings >= run.sporelingsOffered, coins: run.coins >= run.coinsOffered };
}

export function levelProgress(save: SaveData, levelId: number): LevelProgress | null {
  return save.levels[String(levelId)] ?? null;
}

/** Stars earned on a level so far: 0 until finished, then 1 plus one per goal reached. */
export function levelStars(save: SaveData, levelId: number): number {
  const progress = levelProgress(save, levelId);
  if (!progress) return 0;
  return 1 + (progress.sporelings ? 1 : 0) + (progress.coins ? 1 : 0);
}

/** A level's number as players see it: its place in Adventure, counting from 1 (0: a secret level). */
export function levelNumber(levelId: number): number {
  return ADVENTURE_LEVELS.findIndex((level) => level.id === levelId) + 1;
}

/** "3. DRIFTING CANOPY", or "SECRET: HIDDEN GROVE". */
export function levelTitle(levelId: number): string {
  const level = levelById(levelId);
  const number = levelNumber(levelId);
  return number > 0 ? `${number}. ${level.name}` : `SECRET: ${level.name}`;
}

export function isLevelOpen(save: SaveData, levelId: number): boolean {
  if (levelById(levelId).secretOf !== null) return save.secrets.includes(levelId);
  const index = ADVENTURE_LEVELS.findIndex((level) => level.id === levelId);
  if (index < 0) return false;
  const before = ADVENTURE_LEVELS[index - 1];
  // A level already finished stays open even if the order around it changed.
  return before === undefined || levelStars(save, before.id) > 0 || levelStars(save, levelId) > 0;
}

/** The level after this one, or null after the last. */
export function nextLevelId(levelId: number): number | null {
  const index = ADVENTURE_LEVELS.findIndex((level) => level.id === levelId);
  if (index < 0) return null;
  return ADVENTURE_LEVELS[index + 1]?.id ?? null;
}

/** The secret level found through this level's secret gap; returns it if it was new. */
export function findSecret(save: SaveData, levelId: number): number | null {
  const secret = levelById(levelId).secret;
  if (!secret || save.secrets.includes(secret.levelId)) return null;
  save.secrets.push(secret.levelId);
  return secret.levelId;
}

/** The furthest level the player may fly: the first open level without stars, else the last. */
export function currentLevelId(save: SaveData): number {
  const open = ADVENTURE_LEVELS.filter((level) => isLevelOpen(save, level.id));
  return (open.find((level) => levelStars(save, level.id) === 0) ?? open.at(-1) ?? ADVENTURE_LEVELS[0]!).id;
}

/**
 * Diamonds a run of a level actually pays: only those its earlier runs did
 * not already pay, so replaying a level never farms diamonds. Records them.
 * Endless (no progress entry) is not limited; callers pass Adventure levels only.
 */
export function claimLevelDiamonds(save: SaveData, levelId: number, diamonds: number): number {
  const key = String(levelId);
  const taken = save.levelDiamonds[key] ?? 0;
  const paid = Math.max(0, diamonds - taken);
  if (diamonds > taken) save.levelDiamonds[key] = diamonds;
  return paid;
}

export interface FinishResult {
  /** The level's stars now, this run's goals added to earlier ones. */
  stars: number;
  /** True when this run added a star. */
  improved: boolean;
  /** Goals this run reached. */
  goals: { sporelings: boolean; coins: boolean };
  /** Diamonds this run paid (0 when the level paid them before). */
  diamondsPaid: number;
  /** The level this finish opened for the first time, if any. */
  opened: number | null;
}

/** Banks what the run collected and records its goals. Finishing costs no life. */
export function finishLevel(save: SaveData, run: LevelRun): FinishResult {
  const next = nextLevelId(run.levelId);
  const wasOpen = next !== null && isLevelOpen(save, next);
  const before = levelStars(save, run.levelId);
  const goals = goalsReached(run);
  const previous = levelProgress(save, run.levelId);
  save.levels[String(run.levelId)] = {
    sporelings: goals.sporelings || (previous?.sporelings ?? false),
    coins: goals.coins || (previous?.coins ?? false),
  };
  save.coins += run.coins;
  const diamondsPaid = claimLevelDiamonds(save, run.levelId, run.diamonds);
  save.diamonds += diamondsPaid;
  const stars = levelStars(save, run.levelId);
  return { stars, improved: stars > before, goals, diamondsPaid, opened: next !== null && !wasOpen ? next : null };
}

/** Highest star count on any level, for the badge. */
export function bestLevelStars(save: SaveData): number {
  return Math.max(0, ...Object.keys(save.levels).map((id) => levelStars(save, Number(id))));
}
