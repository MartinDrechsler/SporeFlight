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
  /** Distance where the round ended (endless crash markers). */
  distance: number;
}

/** Adds a round's rewards and records bests. Endless rounds also cost a life. */
export function bankRound(save: SaveData, result: RoundResult): void {
  save.coins += result.coins;
  save.diamonds += result.diamonds;
  if (result.levelId === ENDLESS_LEVEL_ID) {
    save.bestScore = Math.max(save.bestScore, result.score);
    save.lives = Math.max(0, save.lives - 1);
    save.deathMarks = [...save.deathMarks, result.distance].slice(-TUNING.session.deathMarks);
  } else {
    save.levelBest[result.levelId] = Math.max(save.levelBest[result.levelId] ?? 0, result.score);
  }
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

/** Reward for watching an ad: lives are refilled to the ad amount. */
export function grantAdLives(save: SaveData): void {
  save.lives = Math.max(save.lives, TUNING.session.adLives);
}
