import type { AnimationId } from '../config/animations';
import type { StoryId } from '../config/story';
import type { Pose } from '../render/avatar';
import type { TreasurePiles, TreasurePlace } from '../render/treasure';
import type { RewardedAds } from '../ads/ads';
import type { Audio } from '../audio/audio';
import type { Random } from '../core/random';
import type { SaveData } from '../core/save';
import type { World } from '../gameplay/world';
import type { Effects } from '../render/effects';

export type StateName =
  | 'username' | 'start' | 'playing' | 'roundOver' | 'gameOver' | 'ad' | 'adventureOver' | 'levelComplete'
  | 'shop' | 'badges' | 'quests' | 'levels' | 'unlock' | 'ranks' | 'settings' | 'story';

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
  /** How the mushroom is shown: the home screen sets the avatar pose, other screens let it relax. */
  pose: Pose;
  /** What the home avatar acts out next time the home screen shows (proud after a new badge); null: just idle. */
  avatarMood: AnimationId | null;
  /** The story scene the story screen plays next, and the screen it returns to. */
  story: { id: StoryId; then: StateName };
  /** The coin and diamond piles beside the home avatar; they catch up with the save while home shows. */
  treasure: TreasurePiles;
  /** Where the piles stand this frame; null hides them (home sets it in its update). */
  treasureAt: TreasurePlace | null;
  /** A fresh round of a level; `startY` carries the hovering mushroom's height over. */
  newWorld(levelId: number, startY?: number): World;
  /** Switch to another screen. */
  go(name: StateName): void;
  current(): StateName | null;
  /** Writes the save to storage. */
  persist(): void;
  /** Wall-clock time in ms. Injectable so tests can control dates. */
  now(): number;
}
