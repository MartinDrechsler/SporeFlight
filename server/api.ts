import { createHash } from 'node:crypto';
import { isCountryCode } from '../src/config/countries';
import { recordProblem, replayScore, type RunRecord } from '../src/gameplay/replay';
import { cleanName, isOffensive } from '../src/meta/names';
import type { Board, Entry, ScoreStore } from './store';

/**
 * The leaderboard's four endpoints, independent of how requests arrive.
 * Every input from outside is checked here, and a score is only accepted
 * when replaying its run on the server reaches exactly that score.
 */
export interface ApiRequest {
  method: string;
  query: Record<string, string>;
  body: unknown;
  /** Used only for rate limits, never stored beyond a minute. */
  ip: string;
  /** Country the request comes from, if the host knows it (a suggestion only). */
  country: string | null;
}

export interface ApiResponse {
  status: number;
  body: unknown;
}

export type Route = 'scores' | 'leaderboard' | 'report' | 'forget';

/** Entries shown per board. */
export const BOARD_SIZE = 50;
/** Reports after which a name is hidden on the boards. */
export const HIDE_AFTER_REPORTS = 3;
const MAX_SCORE = 100_000;

export async function handle(route: Route, request: ApiRequest, store: ScoreStore | null): Promise<ApiResponse> {
  if (!store) return { status: 503, body: { error: 'offline' } };
  try {
    switch (route) {
      case 'scores':
        return request.method === 'POST' ? await submit(request, store) : notAllowed();
      case 'leaderboard':
        return request.method === 'GET' ? await board(request, store) : notAllowed();
      case 'report':
        return request.method === 'POST' ? await report(request, store) : notAllowed();
      case 'forget':
        return request.method === 'POST' ? await forget(request, store) : notAllowed();
    }
  } catch {
    return { status: 500, body: { error: 'server' } };
  }
}

/** The secret player id (kept on the phone) becomes a public id by a one-way hash. */
export function publicId(playerId: string): string {
  return createHash('sha256').update(`sporeflight:${playerId}`).digest('hex').slice(0, 20);
}

function isPlayerId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{32}$/.test(value);
}

async function submit(request: ApiRequest, store: ScoreStore): Promise<ApiResponse> {
  if (!(await store.allow(`submit:${request.ip}`, 12, 60))) return { status: 429, body: { error: 'slow down' } };
  const body = asObject(request.body);
  if (!body || !isPlayerId(body.playerId)) return bad('player');
  const name = cleanName(body.name);
  if (name.length === 0 || name !== body.name) return bad('name');
  if (isOffensive(name)) return { status: 422, body: { error: 'name' } };
  const country = body.country === null ? null : isCountryCode(body.country) ? body.country : undefined;
  if (country === undefined) return bad('country');
  const score = body.score;
  if (typeof score !== 'number' || !Number.isInteger(score) || score < 1 || score > MAX_SCORE) return bad('score');
  const run = asRunRecord(body.run);
  if (!run) return bad('run');
  const problem = recordProblem(run);
  if (problem) return bad(problem);
  if (replayScore(run) !== score) return { status: 422, body: { error: 'replay' } };

  const pub = publicId(body.playerId);
  const existing = await store.get(pub);
  const entry: Entry = {
    pub,
    name,
    country,
    score: Math.max(score, existing?.score ?? 0),
    // A new name starts with a clean slate of reports.
    reports: existing && existing.name === name ? existing.reports : 0,
  };
  await store.put(entry, existing?.country ?? null);
  return {
    status: 200,
    body: {
      best: entry.score,
      rank: await store.rank({ kind: 'world' }, pub),
      countryRank: country ? await store.rank({ kind: 'country', code: country }, pub) : null,
    },
  };
}

async function board(request: ApiRequest, store: ScoreStore): Promise<ApiResponse> {
  const { scope, country, player } = request.query;
  let target: Board;
  if (scope === 'country') {
    if (!isCountryCode(country)) return bad('country');
    target = { kind: 'country', code: country };
  } else {
    target = { kind: 'world' };
  }
  const entries = await store.top(target, BOARD_SIZE);
  const pub = isPlayerId(player) ? publicId(player) : null;
  const mine = pub ? await store.get(pub) : null;
  const onThisBoard = mine && (target.kind === 'world' || mine.country === target.code);
  return {
    status: 200,
    body: {
      entries: entries.map((entry, i) => ({
        rank: i + 1,
        pub: entry.pub,
        name: entry.reports >= HIDE_AFTER_REPORTS ? 'PLAYER' : entry.name,
        country: entry.country,
        score: entry.score,
        you: entry.pub === pub,
      })),
      you: onThisBoard && pub ? { rank: await store.rank(target, pub), score: mine.score } : null,
      detectedCountry: isCountryCode(request.country) ? request.country : null,
    },
  };
}

async function report(request: ApiRequest, store: ScoreStore): Promise<ApiResponse> {
  if (!(await store.allow(`report:${request.ip}`, 5, 60))) return { status: 429, body: { error: 'slow down' } };
  const body = asObject(request.body);
  const pub = body?.pub;
  if (typeof pub !== 'string' || !/^[a-f0-9]{20}$/.test(pub)) return bad('pub');
  await store.report(pub);
  return { status: 200, body: { ok: true } };
}

/** Removes the player's entry everywhere: their right to be forgotten. */
async function forget(request: ApiRequest, store: ScoreStore): Promise<ApiResponse> {
  const body = asObject(request.body);
  if (!body || !isPlayerId(body.playerId)) return bad('player');
  await store.remove(publicId(body.playerId));
  return { status: 200, body: { ok: true } };
}

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asRunRecord(value: unknown): RunRecord | null {
  const run = asObject(value);
  if (!run || !Array.isArray(run.taps)) return null;
  const numbers = ['rulesVersion', 'seed', 'width', 'height', 'startY'] as const;
  if (!numbers.every((key) => typeof run[key] === 'number')) return null;
  if (!run.taps.every((tap) => typeof tap === 'number')) return null;
  return {
    rulesVersion: run.rulesVersion as number,
    seed: run.seed as number,
    width: run.width as number,
    height: run.height as number,
    startY: run.startY as number,
    taps: run.taps as number[],
  };
}

function bad(what: string): ApiResponse {
  return { status: 400, body: { error: what } };
}

function notAllowed(): ApiResponse {
  return { status: 405, body: { error: 'method' } };
}
