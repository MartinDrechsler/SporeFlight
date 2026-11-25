import { ADVENTURE_UNLOCK_COST, ENDLESS_LEVEL_ID } from '../config/levels';
import { SKINS, type Price } from '../config/skins';
import { TRAILS } from '../config/trails';
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
 * After a crash: adds the round's rewards, records the crash spot and takes a
 * life (every crash costs one, in endless and in Adventure). Returns true when
 * the round set a new endless best.
 */
export function bankRound(save: SaveData, result: RoundResult): boolean {
  save.coins += result.coins;
  save.diamonds += result.diamonds;
  save.lives = Math.max(0, save.lives - 1);
  const key = String(result.levelId);
  save.deathMarks[key] = [...(save.deathMarks[key] ?? []), result.distance].slice(-TUNING.session.deathMarks);

  if (result.levelId !== ENDLESS_LEVEL_ID || result.score <= save.bestScore) return false;
  save.bestScore = result.score;
  return true;
}

export type PurchaseResult = 'bought' | 'owned' | 'tooExpensive';

/** The two kinds of looks: cap colours and glow trails. */
export type LookKind = 'skin' | 'trail';

function catalog(kind: LookKind): readonly { id: string; price: Price }[] {
  return kind === 'skin' ? SKINS : TRAILS;
}

function owned(save: SaveData, kind: LookKind): string[] {
  return kind === 'skin' ? save.ownedSkins : save.ownedTrails;
}

export function ownsLook(save: SaveData, kind: LookKind, id: string): boolean {
  return owned(save, kind).includes(id);
}

/** True when the player has enough coins or diamonds. Badge looks cannot be bought. */
export function canAfford(save: SaveData, price: Price): boolean {
  if ('coins' in price) return save.coins >= price.coins;
  if ('diamonds' in price) return save.diamonds >= price.diamonds;
  return false;
}

/** Buys a look and wears it straight away. */
export function buyLook(save: SaveData, kind: LookKind, id: string): PurchaseResult {
  const look = catalog(kind).find((item) => item.id === id);
  if (!look) return 'tooExpensive';
  if (ownsLook(save, kind, id)) return 'owned';
  if (!canAfford(save, look.price)) return 'tooExpensive';
  if ('coins' in look.price) save.coins -= look.price.coins;
  if ('diamonds' in look.price) save.diamonds -= look.price.diamonds;
  owned(save, kind).push(id);
  selectLook(save, kind, id);
  return 'bought';
}

export function selectLook(save: SaveData, kind: LookKind, id: string): boolean {
  if (!ownsLook(save, kind, id)) return false;
  if (kind === 'skin') save.activeSkin = id;
  else save.activeTrail = id;
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

/** Out of lives, the player chose to rest: the countdown starts (only once; a running rest goes on). */
export function startRest(save: SaveData): void {
  if (save.lives === 0 && save.restSecondsLeft <= 0) save.restSecondsLeft = TUNING.session.restSeconds;
}

/** Out of lives, not resting and not yet chosen how to get lives back. */
export function awaitingChoice(save: SaveData): boolean {
  return save.lives === 0 && save.restSecondsLeft <= 0;
}

/** Share of the rest done, 0 to 1 (1 also when not resting). */
export function restProgress(save: SaveData): number {
  if (save.restSecondsLeft <= 0) return save.lives > 0 ? 1 : 0;
  return 1 - save.restSecondsLeft / TUNING.session.restSeconds;
}

/**
 * Resting counts down while the game is open, once the player has chosen to
 * rest. Returns true when lives are back.
 */
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
