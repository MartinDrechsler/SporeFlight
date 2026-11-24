/**
 * Where leaderboard entries live. The rest of the server only knows this
 * interface: an in-memory store for tests and local runs, and Upstash Redis
 * (connected through Vercel) in production.
 *
 * Players are stored under their public id (a one-way hash of their secret
 * id), so the boards never reveal the id that lets someone change an entry.
 */
export interface Entry {
  /** Public id: shown with the entry, used to report a name. */
  pub: string;
  name: string;
  /** Country code, or null when the player chose none. */
  country: string | null;
  score: number;
  reports: number;
}

export type Board = { kind: 'world' } | { kind: 'country'; code: string };

export interface ScoreStore {
  get(pub: string): Promise<Entry | null>;
  /** Writes the entry and its place on the boards; `previousCountry` is left if it changed. */
  put(entry: Entry, previousCountry: string | null): Promise<void>;
  remove(pub: string): Promise<void>;
  /** Highest scores first. */
  top(board: Board, count: number): Promise<Entry[]>;
  /** 1 for the leader, null when not on the board. */
  rank(board: Board, pub: string): Promise<number | null>;
  /** Adds a report against a name; returns the new count (0 if no such entry). */
  report(pub: string): Promise<number>;
  /** Counts a request against `key`; false once `limit` is passed within `seconds`. */
  allow(key: string, limit: number, seconds: number): Promise<boolean>;
}

function boardKey(board: Board): string {
  return board.kind === 'world' ? 'lb:world' : `lb:c:${board.code}`;
}

/** Keeps everything in memory. For tests and local development. */
export function memoryStore(now: () => number = Date.now): ScoreStore {
  const entries = new Map<string, Entry>();
  const hits = new Map<string, { count: number; until: number }>();
  const onBoard = (board: Board): Entry[] =>
    [...entries.values()]
      .filter((e) => board.kind === 'world' || e.country === board.code)
      .sort((a, b) => b.score - a.score || (a.pub < b.pub ? -1 : 1));
  return {
    get: async (pub) => entries.get(pub) ?? null,
    put: async (entry) => {
      entries.set(entry.pub, { ...entry });
    },
    remove: async (pub) => {
      entries.delete(pub);
    },
    top: async (board, count) => onBoard(board).slice(0, count),
    rank: async (board, pub) => {
      const index = onBoard(board).findIndex((e) => e.pub === pub);
      return index < 0 ? null : index + 1;
    },
    report: async (pub) => {
      const entry = entries.get(pub);
      if (!entry) return 0;
      entry.reports += 1;
      return entry.reports;
    },
    allow: async (key, limit, seconds) => {
      const t = now();
      const hit = hits.get(key);
      if (!hit || hit.until <= t) {
        hits.set(key, { count: 1, until: t + seconds * 1000 });
        return true;
      }
      hit.count += 1;
      return hit.count <= limit;
    },
  };
}

type Command = (string | number)[];

/** Upstash Redis over its REST API (no client library needed). */
export function upstashStore(url: string, token: string): ScoreStore {
  const send = async (commands: Command[]): Promise<unknown[]> => {
    const response = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(commands),
    });
    if (!response.ok) throw new Error(`store ${response.status}`);
    const results = (await response.json()) as { result?: unknown; error?: string }[];
    return results.map((r) => {
      if (r.error) throw new Error(`store: ${r.error}`);
      return r.result;
    });
  };
  const playerKey = (pub: string): string => `p:${pub}`;
  const readEntry = (pub: string, fields: unknown): Entry | null => {
    if (!Array.isArray(fields) || fields[0] === null || fields[0] === undefined) return null;
    const [name, country, score, reports] = fields as (string | null)[];
    return { pub, name: name ?? '', country: country || null, score: Number(score ?? 0), reports: Number(reports ?? 0) };
  };
  const fields = ['name', 'country', 'score', 'reports'];

  return {
    async get(pub) {
      const [values] = await send([['HMGET', playerKey(pub), ...fields]]);
      return readEntry(pub, values);
    },
    async put(entry, previousCountry) {
      const commands: Command[] = [
        ['HSET', playerKey(entry.pub), 'name', entry.name, 'country', entry.country ?? '', 'score', entry.score, 'reports', entry.reports],
        ['ZADD', 'lb:world', entry.score, entry.pub],
      ];
      if (previousCountry && previousCountry !== entry.country) commands.push(['ZREM', `lb:c:${previousCountry}`, entry.pub]);
      if (entry.country) commands.push(['ZADD', `lb:c:${entry.country}`, entry.score, entry.pub]);
      await send(commands);
    },
    async remove(pub) {
      const entry = await this.get(pub);
      const commands: Command[] = [['ZREM', 'lb:world', pub], ['DEL', playerKey(pub)]];
      if (entry?.country) commands.push(['ZREM', `lb:c:${entry.country}`, pub]);
      await send(commands);
    },
    async top(board, count) {
      const [members] = await send([['ZRANGE', boardKey(board), 0, count - 1, 'REV']]);
      const pubs = Array.isArray(members) ? (members as string[]) : [];
      if (pubs.length === 0) return [];
      const rows = await send(pubs.map((pub) => ['HMGET', playerKey(pub), ...fields]));
      return pubs.flatMap((pub, i) => {
        const entry = readEntry(pub, rows[i]);
        return entry ? [entry] : [];
      });
    },
    async rank(board, pub) {
      const [rank] = await send([['ZREVRANK', boardKey(board), pub]]);
      return typeof rank === 'number' ? rank + 1 : null;
    },
    async report(pub) {
      const [exists] = await send([['EXISTS', playerKey(pub)]]);
      if (exists !== 1) return 0;
      const [count] = await send([['HINCRBY', playerKey(pub), 'reports', 1]]);
      return Number(count);
    },
    async allow(key, limit, seconds) {
      const [count] = await send([['INCR', `rl:${key}`]]);
      if (count === 1) await send([['EXPIRE', `rl:${key}`, seconds]]);
      return Number(count) <= limit;
    },
  };
}
