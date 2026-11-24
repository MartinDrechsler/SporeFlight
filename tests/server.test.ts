import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, describe, expect, it } from 'vitest';
import { runRecord, type RunRecord } from '../src/gameplay/replay';
import { flapPlayer, stepWorld } from '../src/gameplay/world';
import { isOffensive } from '../src/meta/names';
import { handle, HIDE_AFTER_REPORTS, publicId, type ApiRequest, type Route } from '../server/api';
import { memoryStore, upstashStore, type ScoreStore } from '../server/store';
import { autopilot, newWorld, run } from './helpers';

/** A real endless round played by the autopilot, and its record. */
/** A round flown by the autopilot for `seconds`, then left to fall. */
function playedRun(seed: number, seconds = 120): { record: RunRecord; score: number } {
  const world = newWorld(seed);
  flapPlayer(world);
  run(world, seconds, autopilot);
  for (let i = 0; i < 600 && !world.crashed; i++) stepWorld(world, 1 / 60);
  return { record: runRecord(world), score: world.stats.score };
}

const ALICE = 'a'.repeat(32);
const BOB = 'b'.repeat(32);

/** A tiny stand-in for Upstash's REST pipeline, speaking just the Redis commands the store uses. */
function fakeUpstash(): Server {
  const hashes = new Map<string, Map<string, string>>();
  const zsets = new Map<string, Map<string, number>>();
  const counters = new Map<string, number>();
  const sorted = (key: string): string[] =>
    [...(zsets.get(key) ?? new Map<string, number>()).entries()]
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? 1 : -1))
      .map(([member]) => member);
  const run = (cmd: (string | number)[]): unknown => {
    const [name, key, ...args] = cmd.map(String);
    switch (name) {
      case 'HSET': {
        const hash = hashes.get(key!) ?? new Map<string, string>();
        for (let i = 0; i < args.length; i += 2) hash.set(args[i]!, args[i + 1]!);
        hashes.set(key!, hash);
        return args.length / 2;
      }
      case 'HMGET':
        return args.map((field) => hashes.get(key!)?.get(field) ?? null);
      case 'HINCRBY': {
        const hash = hashes.get(key!)!;
        const value = Number(hash.get(args[0]!) ?? 0) + Number(args[1]);
        hash.set(args[0]!, String(value));
        return value;
      }
      case 'EXISTS':
        return hashes.has(key!) ? 1 : 0;
      case 'DEL':
        return hashes.delete(key!) ? 1 : 0;
      case 'ZADD': {
        const set = zsets.get(key!) ?? new Map<string, number>();
        set.set(args[1]!, Number(args[0]));
        zsets.set(key!, set);
        return 1;
      }
      case 'ZREM':
        return zsets.get(key!)?.delete(args[0]!) ? 1 : 0;
      case 'ZRANGE': {
        if (args[2] !== 'REV') throw new Error('only REV');
        return sorted(key!).slice(Number(args[0]), Number(args[1]) + 1);
      }
      case 'ZREVRANK': {
        const index = sorted(key!).indexOf(args[0]!);
        return index < 0 ? null : index;
      }
      case 'INCR': {
        const value = (counters.get(key!) ?? 0) + 1;
        counters.set(key!, value);
        return value;
      }
      case 'EXPIRE':
        return 1;
      default:
        throw new Error(`fake upstash: ${name}`);
    }
  };
  return createServer((req, res) => {
    let text = '';
    req.on('data', (chunk) => (text += chunk));
    req.on('end', () => {
      const ok = req.headers.authorization === 'Bearer token' && req.url === '/pipeline';
      res.statusCode = ok ? 200 : 401;
      res.end(ok ? JSON.stringify((JSON.parse(text) as (string | number)[][]).map((cmd) => ({ result: run(cmd) }))) : '');
    });
  });
}

// Each Upstash store gets its own fake server, so tests never see each other's entries.
const servers: Server[] = [];
afterAll(() => servers.forEach((server) => server.close()));

async function freshUpstash(): Promise<ScoreStore> {
  const server = fakeUpstash();
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  return upstashStore(`http://localhost:${(server.address() as AddressInfo).port}`, 'token');
}

const stores: [string, () => Promise<ScoreStore>][] = [
  ['memory', async () => memoryStore()],
  ['upstash', freshUpstash],
];

describe.each(stores)('leaderboard API (%s store)', (_, makeStore) => {
  const call = (store: ScoreStore, route: Route, request: Partial<ApiRequest>) =>
    handle(route, { method: 'POST', query: {}, body: null, ip: '1.2.3.4', country: null, ...request }, store);
  const submit = (store: ScoreStore, body: Record<string, unknown>, ip = '1.2.3.4') => call(store, 'scores', { body, ip });
  const boardOf = (store: ScoreStore, query: Record<string, string>) =>
    call(store, 'leaderboard', { method: 'GET', query }) as Promise<{ status: number; body: any }>;

  it('accepts a score only when replaying its run reaches exactly that score', async () => {
    const store = await makeStore();
    const { record, score } = playedRun(17);
    expect(score).toBeGreaterThan(3);
    const cheat = await submit(store, { playerId: ALICE, name: 'Alice', country: 'CH', score: score + 5, run: record });
    expect(cheat).toEqual({ status: 422, body: { error: 'replay' } });
    const honest = await submit(store, { playerId: ALICE, name: 'Alice', country: 'CH', score, run: record });
    expect(honest).toEqual({ status: 200, body: { best: score, rank: 1, countryRank: 1 } });
  });

  it('shows world and country boards with your rank, keeps your best, moves you when your country changes', async () => {
    const store = await makeStore();
    const a = playedRun(17);
    const b = playedRun(3);
    await submit(store, { playerId: ALICE, name: 'Alice', country: 'CH', score: a.score, run: a.record });
    await submit(store, { playerId: BOB, name: 'Bob', country: 'DE', score: b.score, run: b.record });
    const world = await boardOf(store, { scope: 'world', player: BOB });
    expect(world.body.entries.map((e: any) => e.name)).toEqual(a.score >= b.score ? ['Alice', 'Bob'] : ['Bob', 'Alice']);
    expect(world.body.entries.find((e: any) => e.name === 'Bob').you).toBe(true);
    expect(JSON.stringify(world.body)).not.toContain(BOB);
    expect(world.body.you.score).toBe(b.score);

    const swiss = await boardOf(store, { scope: 'country', country: 'CH' });
    expect(swiss.body.entries.map((e: any) => e.name)).toEqual(['Alice']);

    // A worse run later keeps the best; a new country moves the entry.
    const worse = playedRun(5, 10);
    expect(worse.score).toBeLessThan(a.score);
    await submit(store, { playerId: ALICE, name: 'Alice', country: 'AT', score: worse.score, run: worse.record });
    expect((await boardOf(store, { scope: 'country', country: 'CH' })).body.entries).toEqual([]);
    const austria = await boardOf(store, { scope: 'country', country: 'AT', player: ALICE });
    expect(austria.body.entries[0].score).toBe(a.score);
    expect(austria.body.you).toEqual({ rank: 1, score: a.score });
  });

  it('checks names, countries and players; offensive names are refused', async () => {
    const store = await makeStore();
    const { record, score } = playedRun(17);
    const base = { playerId: ALICE, name: 'Alice', country: 'CH', score, run: record };
    expect((await submit(store, { ...base, name: 'sh1t head' })).body).toEqual({ error: 'name' });
    expect((await submit(store, { ...base, name: '<script>' })).status).toBe(400);
    expect((await submit(store, { ...base, country: 'XX' })).status).toBe(400);
    expect((await submit(store, { ...base, playerId: 'me' })).status).toBe(400);
    expect((await submit(store, { ...base, country: null })).status).toBe(200);
  });

  it('a name reported often enough is hidden; a new name starts clean', async () => {
    const store = await makeStore();
    const { record, score } = playedRun(17);
    await submit(store, { playerId: ALICE, name: 'Rude', country: null, score, run: record });
    const pub = publicId(ALICE);
    for (let i = 0; i < HIDE_AFTER_REPORTS; i++) await call(store, 'report', { body: { pub }, ip: `9.9.9.${i}` });
    expect((await boardOf(store, {})).body.entries[0].name).toBe('PLAYER');
    await submit(store, { playerId: ALICE, name: 'Polite', country: null, score, run: record });
    expect((await boardOf(store, {})).body.entries[0].name).toBe('Polite');
  });

  it('forgets a player completely when asked', async () => {
    const store = await makeStore();
    const { record, score } = playedRun(17);
    await submit(store, { playerId: ALICE, name: 'Alice', country: 'CH', score, run: record });
    expect((await call(store, 'forget', { body: { playerId: ALICE } })).status).toBe(200);
    expect((await boardOf(store, {})).body.entries).toEqual([]);
    expect((await boardOf(store, { scope: 'country', country: 'CH' })).body.entries).toEqual([]);
  });

  it('limits how fast one address can send scores', async () => {
    const store = await makeStore();
    const { record, score } = playedRun(17);
    const statuses: number[] = [];
    for (let i = 0; i < 13; i++) {
      statuses.push((await submit(store, { playerId: ALICE, name: 'Alice', country: null, score, run: record }, '5.5.5.5')).status);
    }
    expect(statuses.at(-1)).toBe(429);
    expect(statuses.slice(0, 12).every((s) => s === 200)).toBe(true);
  });

  it('suggests the country the request comes from', async () => {
    const store = await makeStore();
    const result = await call(store, 'leaderboard', { method: 'GET', country: 'CH' });
    expect((result.body as any).detectedCountry).toBe('CH');
  });
});

describe('without storage connected', () => {
  it('answers that the leaderboard is offline', async () => {
    expect(await handle('leaderboard', { method: 'GET', query: {}, body: null, ip: '', country: null }, null)).toEqual({
      status: 503,
      body: { error: 'offline' },
    });
  });
});

describe('name rules', () => {
  it('catch disguised words without blocking ordinary names', () => {
    expect(isOffensive('F.u.c.k')).toBe(true);
    expect(isOffensive('5h1t')).toBe(true);
    for (const name of ['Grape', 'Spicy', 'Peacock', 'Nazir', 'Churer', 'Martin', 'Analía']) expect(isOffensive(name)).toBe(false);
  });
});
