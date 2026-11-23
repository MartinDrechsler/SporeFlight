/**
 * The player's saved progress. This is the only module that touches
 * localStorage. Loading never fails: missing, corrupt or old data simply
 * becomes valid data with defaults filled in.
 */
export interface SaveData {
  version: 1;
  bestScore: number;
  coins: number;
  diamonds: number;
  lives: number;
  /** Epoch ms when resting finishes and lives refill; 0 when not resting. */
  restUntil: number;
  soundOn: boolean;
}

const STORAGE_KEY = 'sporeflight.save';

export function defaultSave(lives: number): SaveData {
  return { version: 1, bestScore: 0, coins: 0, diamonds: 0, lives, restUntil: 0, soundOn: true };
}

/** Turns anything (old versions, partial objects, garbage) into valid SaveData. */
export function migrate(raw: unknown, lives: number): SaveData {
  const base = defaultSave(lives);
  if (typeof raw !== 'object' || raw === null) return base;
  const data = raw as Record<string, unknown>;
  const count = (value: unknown, fallback: number): number =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;

  return {
    version: 1,
    bestScore: count(data.bestScore, base.bestScore),
    coins: count(data.coins, base.coins),
    diamonds: count(data.diamonds, base.diamonds),
    lives: Math.min(lives, count(data.lives, base.lives)),
    restUntil: count(data.restUntil, base.restUntil),
    soundOn: typeof data.soundOn === 'boolean' ? data.soundOn : base.soundOn,
  };
}

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Storage that silently works in memory when localStorage is blocked (private mode). */
export function browserStore(): KeyValueStore {
  const memory = new Map<string, string>();
  return {
    getItem(key) {
      try {
        return localStorage.getItem(key);
      } catch {
        return memory.get(key) ?? null;
      }
    },
    setItem(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch {
        memory.set(key, value);
      }
    },
  };
}

export function loadSave(store: KeyValueStore, lives: number): SaveData {
  const text = store.getItem(STORAGE_KEY);
  if (text === null) return defaultSave(lives);
  try {
    return migrate(JSON.parse(text), lives);
  } catch {
    return defaultSave(lives);
  }
}

export function writeSave(store: KeyValueStore, data: SaveData): void {
  store.setItem(STORAGE_KEY, JSON.stringify(data));
}
