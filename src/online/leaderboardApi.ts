import type { Submission } from '../meta/leaderboard';

/**
 * Talks to the leaderboard server. Every call resolves (never throws): a
 * failure says whether it is worth trying again later, so the game can carry
 * on offline and send the run when the connection is back.
 */
export type ApiResult<T> =
  | { ok: true; data: T }
  /** `retry`: offline, busy or server trouble. Otherwise the server refused it for good (`error` says why). */
  | { ok: false; retry: boolean; error: string };

export interface BoardEntry {
  rank: number;
  pub: string;
  name: string;
  country: string | null;
  score: number;
  you: boolean;
}

export interface BoardData {
  entries: BoardEntry[];
  you: { rank: number; score: number } | null;
  detectedCountry: string | null;
}

export interface SubmitData {
  best: number;
  rank: number | null;
  countryRank: number | null;
}

async function call<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json' } });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    if (response.ok) return { ok: true, data: body as T };
    const retry = response.status === 429 || response.status >= 500;
    return { ok: false, retry, error: body.error ?? String(response.status) };
  } catch {
    return { ok: false, retry: true, error: 'offline' };
  }
}

export function submitRun(submission: Submission): Promise<ApiResult<SubmitData>> {
  return call('/api/scores', { method: 'POST', body: JSON.stringify(submission) });
}

export function fetchBoard(scope: 'world' | 'country', country: string | null, playerId: string | null): Promise<ApiResult<BoardData>> {
  const params = new URLSearchParams({ scope });
  if (country) params.set('country', country);
  if (playerId) params.set('player', playerId);
  return call(`/api/leaderboard?${params}`);
}

export function reportName(pub: string): Promise<ApiResult<unknown>> {
  return call('/api/report', { method: 'POST', body: JSON.stringify({ pub }) });
}

export function forgetPlayer(playerId: string): Promise<ApiResult<unknown>> {
  return call('/api/forget', { method: 'POST', body: JSON.stringify({ playerId }) });
}

/** A new secret player id: 128 random bits as hex. */
export function newPlayerId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}
