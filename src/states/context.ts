import type { Audio } from '../audio/audio';
import type { Skin, Theme } from '../config/theme';
import type { KeyValueStore, SaveData } from '../core/save';
import type { World } from '../gameplay/world';
import type { Effects } from '../render/effects';

export type StateName = 'start' | 'playing' | 'roundOver' | 'gameOver';

/**
 * What the states share. A state reads and changes this, then switches to
 * another state with `go`. Nothing outside the states mutates it.
 */
export interface GameContext {
  world: World;
  save: SaveData;
  store: KeyValueStore;
  audio: Audio;
  effects: Effects;
  theme: Theme;
  skin: Skin;
  /** Switch to another screen. */
  go(name: StateName): void;
  /** Builds a fresh round sized to the current screen. */
  newWorld(): World;
  /** Score of the round that just ended, shown on the start screen. */
  lastScore: number | null;
  /** Wall-clock time in ms. Injectable so tests can fast-forward resting. */
  now(): number;
}
