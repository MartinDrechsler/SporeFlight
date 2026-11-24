import type { IncomingMessage, ServerResponse } from 'node:http';
import { handle, type Route } from './api';
import { upstashStore, type ScoreStore } from './store';

/** Largest request body accepted, bytes (a long run's taps fit easily). */
const MAX_BODY = 512 * 1024;

/**
 * Turns a Node request into an API call and writes the answer back. The store
 * comes from Upstash Redis, connected in the Vercel project (its env vars).
 */
export function nodeHandler(route: Route): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  return async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://local');
    let body: unknown = null;
    if (req.method === 'POST') {
      const text = await readBody(req);
      if (text === null) return send(res, 413, { error: 'too large' });
      try {
        body = JSON.parse(text);
      } catch {
        return send(res, 400, { error: 'json' });
      }
    }
    const result = await handle(
      route,
      {
        method: req.method ?? 'GET',
        query: Object.fromEntries(url.searchParams),
        body,
        ip: header(req, 'x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown',
        country: header(req, 'x-vercel-ip-country'),
      },
      storeFromEnv(),
    );
    send(res, result.status, result.body);
  };
}

function storeFromEnv(): ScoreStore | null {
  const env = process.env;
  const url = env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? upstashStore(url, token) : null;
}

function header(req: IncomingMessage, name: string): string | null {
  const value = req.headers[name];
  return typeof value === 'string' ? value : null;
}

function readBody(req: IncomingMessage): Promise<string | null> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        resolve(null);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}
