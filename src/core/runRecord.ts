/**
 * Everything needed to play a deterministic round again, exactly: the same
 * seed, screen and inputs always give the same result.
 */
export interface RunRecord {
  /** Which version of the rules the round was played with. */
  rulesVersion: number;
  seed: number;
  width: number;
  height: number;
  startY: number;
  /** The step at which each tap happened, in order. */
  taps: number[];
}
