import { describe, expect, it } from 'vitest';
import { defaultSave, loadSave, migrate, writeSave, type KeyValueStore } from '../src/core/save';

function memoryStore(initial: Record<string, string> = {}): KeyValueStore {
  const data = new Map(Object.entries(initial));
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

describe('save', () => {
  it('returns defaults when nothing is saved', () => {
    expect(loadSave(memoryStore(), 5)).toEqual(defaultSave(5));
  });

  it('returns defaults for corrupt data instead of failing', () => {
    expect(loadSave(memoryStore({ 'sporeflight.save': '{not json' }), 5)).toEqual(defaultSave(5));
  });

  it('repairs invalid fields and keeps valid ones', () => {
    const repaired = migrate({ bestScore: 12, coins: -3, lives: 99, soundOn: 'yes' }, 5);
    expect(repaired.bestScore).toBe(12);
    expect(repaired.coins).toBe(0);
    expect(repaired.lives).toBe(5);
    expect(repaired.soundOn).toBe(true);
  });

  it('round-trips through storage', () => {
    const store = memoryStore();
    const data = { ...defaultSave(5), bestScore: 40, coins: 7 };
    writeSave(store, data);
    expect(loadSave(store, 5)).toEqual(data);
  });
});
