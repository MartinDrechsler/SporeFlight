import type { RewardedAds } from '../ads/ads';
import type { Audio } from '../audio/audio';
import type { Random } from '../core/random';
import type { SaveData } from '../core/save';
import type { World } from '../gameplay/world';
import type { Effects } from '../render/effects';

export type StateName =
  | 'username' | 'start' | 'playing' | 'roundOver' | 'gameOver' | 'ad' | 'adventureOver'
  | 'shop' | 'badges' | 'quests' | 'levels' | 'unlock';

/**
 * What the states share. A state reads and changes this, then switches to
 * another state with `go`. Nothing outside the states changes it.
 */
export interface GameContext {
  world: World;
  save: SaveData;
  audio: Audio;
  effects: Effects;
  ads: RewardedAds;
  /** Random numbers for meta-game choices (daily quests). */
  rng: Random;
  /** Level of the current or last round. */
  levelId: number;
  /** Score of the round that just ended, shown on the start screen. */
  lastScore: number | null;
  /** Builds a fresh round of the given level, sized to the screen. */
  newWorld(levelId: number): World;
  /** Switch to another screen. */
  go(name: StateName): void;
  current(): StateName | null;
  /** Writes the save to storage. */
  persist(): void;
  /** Wall-clock time in ms. Injectable so tests can control dates. */
  now(): number;
}
