import { ADVENTURE_UNLOCK_COST, ENDLESS_LEVEL_ID } from '../config/levels';
import { SKINS } from '../config/skins';
import { TUNING } from '../config/tuning';
import type { SaveData } from '../core/save';

/**
 * Spending and earning outside of flight: banking a round, the shop,
 * unlocking adventure mode and refilling lives. Pure functions on SaveData.
 */
export interface RoundResult {
  levelId: number;
  score: number;
  coins: number;
  diamonds: number;
  /** Distance where the round ended; a mushroom clump grows there. */
  distance: number;
}

/**
 * Adds a round's rewards, records the best score and the crash spot, and
 * takes a life: every crash costs one, in endless and in Adventure.
 * Returns true when this round set a new best.
 */
export function bankRound(save: SaveData, result: RoundResult): boolean {
  save.coins += result.coins;
  save.diamonds += result.diamonds;
  save.lives = Math.max(0, save.lives - 1);
  const key = String(result.levelId);
  save.deathMarks[key] = [...(save.deathMarks[key] ?? []), result.distance].slice(-TUNING.session.deathMarks);
  if (save.lives === 0) save.restSecondsLeft = TUNING.session.restSeconds;

  const previous = result.levelId === ENDLESS_LEVEL_ID ? save.bestScore : (save.levelBest[result.levelId] ?? 0);
  if (result.score <= previous) return false;
  if (result.levelId === ENDLESS_LEVEL_ID) save.bestScore = result.score;
  else save.levelBest[result.levelId] = result.score;
  return true;
}

export type PurchaseResult = 'bought' | 'owned' | 'tooExpensive';

export function buySkin(save: SaveData, skinId: string): PurchaseResult {
  const skin = SKINS.find((s) => s.id === skinId);
  if (!skin) return 'tooExpensive';
  if (save.ownedSkins.includes(skinId)) return 'owned';
  if (save.coins < skin.cost) return 'tooExpensive';
  save.coins -= skin.cost;
  save.ownedSkins.push(skinId);
  save.activeSkin = skinId;
  return 'bought';
}

export function selectSkin(save: SaveData, skinId: string): boolean {
  if (!save.ownedSkins.includes(skinId)) return false;
  save.activeSkin = skinId;
  return true;
}

export function canUnlockAdventure(save: SaveData): boolean {
  return save.coins >= ADVENTURE_UNLOCK_COST.coins && save.diamonds >= ADVENTURE_UNLOCK_COST.diamonds;
}

export function unlockAdventure(save: SaveData): boolean {
  if (save.adventureUnlocked) return true;
  if (!canUnlockAdventure(save)) return false;
  save.coins -= ADVENTURE_UNLOCK_COST.coins;
  save.diamonds -= ADVENTURE_UNLOCK_COST.diamonds;
  save.adventureUnlocked = true;
  return true;
}

/** Out of lives: resting counts down while the game is open. Returns true when lives are back. */
export function rest(save: SaveData, dt: number): boolean {
  if (save.restSecondsLeft <= 0) return save.lives > 0;
  save.restSecondsLeft = Math.max(0, save.restSecondsLeft - dt);
  if (save.restSecondsLeft > 0) return false;
  refillLives(save);
  return true;
}

/** Lives come back by resting or by watching an ad; both refill the same amount. */
export function refillLives(save: SaveData): void {
  save.lives = Math.max(save.lives, TUNING.session.refillLives);
  save.restSecondsLeft = 0;
}
