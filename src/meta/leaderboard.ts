import { TUNING } from '../config/tuning';
import type { RunRecord } from '../core/runRecord';
import type { SaveData } from '../core/save';
import { cleanName } from './names';

/**
 * The player's side of the online leaderboard, as pure functions on SaveData:
 * which run to send, and what to remember once the server has answered.
 * Joining is the player's choice; nothing is sent before they join.
 */
export interface Submission {
  playerId: string;
  name: string;
  country: string | null;
  score: number;
  run: RunRecord;
}

/** Keeps the run if it is the best endless run so far. Returns true when it was kept. */
export function rememberRun(save: SaveData, score: number, run: RunRecord): boolean {
  const board = save.leaderboard;
  if (score < 1 || score <= (board.best?.score ?? 0)) return false;
  board.best = { score, run };
  return true;
}

export function isJoined(save: SaveData): boolean {
  return save.leaderboard.playerId !== null;
}

/** The name shown on the boards: the player's name, cleaned the same way the server does. */
export function boardName(save: SaveData): string {
  return cleanName(save.username) || TUNING.session.defaultUsername;
}

/** What to send now, if anything: a better run, a new name or a new country. */
export function submissionFor(save: SaveData): Submission | null {
  const board = save.leaderboard;
  if (!board.playerId || !board.best) return null;
  const name = boardName(save);
  const sent = board.sent;
  const news = !sent || board.best.score > sent.score || sent.name !== name || sent.country !== board.country;
  if (!news) return null;
  return { playerId: board.playerId, name, country: board.country, score: board.best.score, run: board.best.run };
}

/** The server took the submission. */
export function accepted(save: SaveData, submission: Submission): void {
  save.leaderboard.sent = { score: submission.score, name: submission.name, country: submission.country };
  save.leaderboard.nameRefused = false;
}

/**
 * The server refused it for good. A refused name waits for a new one; a run
 * that could not be checked (or follows old rules) is dropped.
 */
export function refused(save: SaveData, error: string): void {
  if (error === 'name') save.leaderboard.nameRefused = true;
  else save.leaderboard.best = null;
}

export function join(save: SaveData, playerId: string, country: string | null): void {
  save.leaderboard.playerId = playerId;
  save.leaderboard.country = country;
  save.leaderboard.sent = null;
}

export function setCountry(save: SaveData, country: string | null): void {
  save.leaderboard.country = country;
}

/** Leaves the leaderboard (the server entry is deleted separately). The best run stays, to rejoin with. */
export function leave(save: SaveData): void {
  save.leaderboard.playerId = null;
  save.leaderboard.sent = null;
  save.leaderboard.nameRefused = false;
}
