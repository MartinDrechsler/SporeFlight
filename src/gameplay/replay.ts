import { ENDLESS_LEVEL_ID, levelById } from '../config/levels';
import { TUNING } from '../config/tuning';
import { STEP_SECONDS } from '../core/loop';
import { createWorld, flapPlayer, stepWorld, type World } from './world';

const LB = TUNING.leaderboard;

/**
 * Everything needed to play an endless round again, exactly: the rules are
 * deterministic, so the same seed, screen and taps always give the same score.
 */
export interface RunRecord {
  rulesVersion: number;
  seed: number;
  width: number;
  height: number;
  startY: number;
  /** The step at which each flap happened, in order. */
  taps: number[];
}

/** The record of an endless round, for sending to the leaderboard. */
export function runRecord(world: World): RunRecord {
  return {
    rulesVersion: LB.rulesVersion,
    seed: world.seed,
    width: world.width,
    height: world.height,
    startY: world.startY,
    taps: [...world.taps],
  };
}

/** Why a record cannot be replayed, or null when it is well formed. */
export function recordProblem(record: RunRecord): string | null {
  if (record.rulesVersion !== LB.rulesVersion) return 'old game version';
  if (!Number.isInteger(record.seed) || record.seed < 0 || record.seed >= 4294967296) return 'bad seed';
  if (!within(record.width, LB.width) || !within(record.height, LB.height)) return 'bad screen size';
  if (!Number.isFinite(record.startY) || record.startY < 0 || record.startY > record.height) return 'bad start';
  const taps = record.taps;
  if (taps.length === 0 || taps.length > LB.maxSteps) return 'bad taps';
  for (let i = 0; i < taps.length; i++) {
    const tap = taps[i]!;
    if (!Number.isInteger(tap) || tap < 0 || tap > LB.maxSteps || (i > 0 && tap < taps[i - 1]!)) return 'bad taps';
  }
  return null;
}

/**
 * Plays the record's round again from the start, with its taps at the same
 * steps, until the mushroom crashes. Returns the score it really reached.
 */
export function replayScore(record: RunRecord): number {
  const world = createWorld(record.width, record.height, levelById(ENDLESS_LEVEL_ID), record.seed, record.startY);
  let next = 0;
  while (!world.crashed && world.steps < LB.maxSteps) {
    while (next < record.taps.length && record.taps[next] === world.steps) {
      flapPlayer(world);
      next += 1;
    }
    stepWorld(world, STEP_SECONDS);
    world.events.length = 0;
  }
  return world.stats.score;
}

function within(value: number, range: { min: number; max: number }): boolean {
  return Number.isFinite(value) && value >= range.min && value <= range.max;
}
