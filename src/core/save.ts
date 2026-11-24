import { ACHIEVEMENTS, QUEST_POOL, type QuestKind } from '../config/rewards';
import { DEFAULT_SKIN_ID, SKINS } from '../config/skins';
import { DEFAULT_TRAIL_ID, TRAILS } from '../config/trails';
import { TUNING } from '../config/tuning';

/**
 * The player's saved progress. This is the only module that touches
 * localStorage. Loading never fails: missing, corrupt or old data simply
 * becomes valid data with defaults filled in.
 */
export interface QuestState {
  kind: QuestKind;
  progress: number;
  claimed: boolean;
}

export interface SaveData {
  version: 5;
  /** Null until the player has chosen a name on first launch. */
  username: string | null;
  /** Endless best score. */
  bestScore: number;
  /** Stars (1 to 3) per finished adventure level id. A level opens when the one before has stars. */
  levelStars: Record<string, number>;
  coins: number;
  diamonds: number;
  lives: number;
  soundOn: boolean;
  ownedSkins: string[];
  activeSkin: string;
  ownedTrails: string[];
  activeTrail: string;
  adventureUnlocked: boolean;
  achievements: string[];
  /** Today's quests; `day` is the local date they belong to (YYYY-MM-DD). */
  quests: { day: string; list: QuestState[] };
  /** Distances where recent rounds ended, per level id, oldest first. Mushroom clumps grow there. */
  deathMarks: Record<string, number[]>;
  /** Seconds of rest left before lives refill; 0 when not resting. Counts only while the game is open. */
  restSecondsLeft: number;
}

const STORAGE_KEY = 'sporeflight.save';
const QUEST_KINDS: readonly QuestKind[] = QUEST_POOL.map((template) => template.kind);

export function defaultSave(): SaveData {
  return {
    version: 5,
    username: null,
    bestScore: 0,
    levelStars: {},
    coins: 0,
    diamonds: 0,
    lives: TUNING.session.startLives,
    soundOn: true,
    ownedSkins: [DEFAULT_SKIN_ID],
    activeSkin: DEFAULT_SKIN_ID,
    ownedTrails: [DEFAULT_TRAIL_ID],
    activeTrail: DEFAULT_TRAIL_ID,
    adventureUnlocked: false,
    achievements: [],
    quests: { day: '', list: [] },
    deathMarks: {},
    restSecondsLeft: 0,
  };
}

/** Turns anything (old versions, partial objects, garbage) into valid SaveData. */
export function migrate(raw: unknown): SaveData {
  const base = defaultSave();
  if (typeof raw !== 'object' || raw === null) return base;
  const data = raw as Record<string, unknown>;

  const ownedSkins = stringList(data.ownedSkins).filter((id) => SKINS.some((skin) => skin.id === id));
  if (!ownedSkins.includes(DEFAULT_SKIN_ID)) ownedSkins.unshift(DEFAULT_SKIN_ID);
  const activeSkin = typeof data.activeSkin === 'string' && ownedSkins.includes(data.activeSkin) ? data.activeSkin : DEFAULT_SKIN_ID;
  const achievements = stringList(data.achievements).filter((id) => ACHIEVEMENTS.some((a) => a.id === id));
  // A badge's trail is always the holder's, even if the save lost it.
  const badgeTrails = ACHIEVEMENTS.flatMap((a) => (a.trail && achievements.includes(a.id) ? [a.trail] : []));
  const ownedTrails = [...new Set([DEFAULT_TRAIL_ID, ...stringList(data.ownedTrails), ...badgeTrails])].filter((id) =>
    TRAILS.some((trail) => trail.id === id),
  );
  const activeTrail = typeof data.activeTrail === 'string' && ownedTrails.includes(data.activeTrail) ? data.activeTrail : DEFAULT_TRAIL_ID;
  // Version 5 changed the quest pool: older quest lists are replaced by a fresh set.
  const version = typeof data.version === 'number' ? data.version : 0;

  return {
    version: 5,
    username: cleanUsername(data.username),
    bestScore: count(data.bestScore, 0),
    // Version 4 brought a new set of levels, so older per-level results do not carry over.
    levelStars: cleanStars(data.levelStars),
    coins: count(data.coins, 0),
    diamonds: count(data.diamonds, 0),
    lives: count(data.lives, base.lives),
    soundOn: typeof data.soundOn === 'boolean' ? data.soundOn : true,
    ownedSkins,
    activeSkin,
    ownedTrails,
    activeTrail,
    adventureUnlocked: data.adventureUnlocked === true,
    achievements,
    quests: version >= 5 ? cleanQuests(data.quests) : { day: '', list: [] },
    deathMarks: cleanDeathMarks(data.deathMarks),
    restSecondsLeft: Math.min(TUNING.session.restSeconds, count(data.restSecondsLeft, 0)),
  };
}

/** Trims and shortens a name; returns null for anything unusable. */
export function cleanUsername(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim().slice(0, TUNING.session.usernameMaxLength);
  return name.length > 0 ? name : null;
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

export function loadSave(store: KeyValueStore): SaveData {
  const text = store.getItem(STORAGE_KEY);
  if (text === null) return defaultSave();
  try {
    return migrate(JSON.parse(text));
  } catch {
    return defaultSave();
  }
}

export function writeSave(store: KeyValueStore, data: SaveData): void {
  store.setItem(STORAGE_KEY, JSON.stringify(data));
}

function count(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function numberList(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((n): n is number => typeof n === 'number' && Number.isFinite(n)).slice(-TUNING.session.deathMarks)
    : [];
}

/** Version 2 kept one list for endless; version 3 keeps one list per level. */
function cleanDeathMarks(value: unknown): Record<string, number[]> {
  if (Array.isArray(value)) return { '0': numberList(value) };
  if (typeof value !== 'object' || value === null) return {};
  const marks: Record<string, number[]> = {};
  for (const [level, list] of Object.entries(value)) marks[level] = numberList(list);
  return marks;
}

function cleanStars(value: unknown): Record<string, number> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const stars: Record<string, number> = {};
  for (const [level, n] of Object.entries(value)) {
    const clean = Math.min(3, count(n, 0));
    if (clean > 0) stars[level] = clean;
  }
  return stars;
}

function cleanQuests(value: unknown): SaveData['quests'] {
  if (typeof value !== 'object' || value === null) return { day: '', list: [] };
  const raw = value as Record<string, unknown>;
  const list = Array.isArray(raw.list)
    ? raw.list.flatMap((item): QuestState[] => {
        if (typeof item !== 'object' || item === null) return [];
        const q = item as Record<string, unknown>;
        if (!QUEST_KINDS.includes(q.kind as QuestKind)) return [];
        return [{ kind: q.kind as QuestKind, progress: count(q.progress, 0), claimed: q.claimed === true }];
      })
    : [];
  return { day: typeof raw.day === 'string' ? raw.day : '', list };
}
