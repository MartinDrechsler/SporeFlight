import { describe, expect, it } from 'vitest';
import { ADVENTURE_UNLOCK_COST, starsFor } from '../src/config/levels';
import { QUESTS_PER_DAY } from '../src/config/rewards';
import { TUNING } from '../src/config/tuning';
import { createRandom } from '../src/core/random';
import { defaultSave, loadSave, migrate, writeSave, type KeyValueStore } from '../src/core/save';
import { unlockAchievements } from '../src/meta/achievements';
import { bankRound, buySkin, grantAdLives, selectSkin, unlockAdventure } from '../src/meta/economy';
import { addQuestProgress, claimableCount, claimQuest, dayKey, refreshQuests } from '../src/meta/quests';

function memoryStore(initial: Record<string, string> = {}): KeyValueStore {
  const data = new Map(Object.entries(initial));
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

const noStats = { score: 0, flaps: 0, coins: 0, diamonds: 0, nearMisses: 0, maxMultiplier: 1 };

describe('save', () => {
  it('returns defaults when nothing or garbage is saved', () => {
    expect(loadSave(memoryStore())).toEqual(defaultSave());
    expect(loadSave(memoryStore({ 'sporeflight.save': '{not json' }))).toEqual(defaultSave());
  });

  it('repairs invalid fields and keeps valid ones', () => {
    const repaired = migrate({ bestScore: 12, coins: -3, ownedSkins: ['golden', 'fake'], activeSkin: 'fake', username: '   ' });
    expect(repaired.bestScore).toBe(12);
    expect(repaired.coins).toBe(0);
    expect(repaired.ownedSkins).toEqual(['classic', 'golden']);
    expect(repaired.activeSkin).toBe('classic');
    expect(repaired.username).toBeNull();
  });

  it('upgrades the first version of the save', () => {
    const v1 = { version: 1, bestScore: 40, coins: 7, diamonds: 1, lives: 3, restUntil: 123, soundOn: false };
    const v2 = migrate(v1);
    expect([v2.version, v2.bestScore, v2.coins, v2.lives, v2.soundOn]).toEqual([2, 40, 7, 3, false]);
  });

  it('round-trips through storage', () => {
    const store = memoryStore();
    const data = { ...defaultSave(), username: 'MARTIN', bestScore: 40 };
    writeSave(store, data);
    expect(loadSave(store)).toEqual(data);
  });
});

describe('economy', () => {
  it('endless rounds cost a life and record the best score and crash spot', () => {
    const save = defaultSave();
    bankRound(save, { levelId: 0, score: 30, coins: 4, diamonds: 1, distance: 900 });
    expect([save.lives, save.bestScore, save.coins, save.diamonds]).toEqual([TUNING.session.startLives - 1, 30, 4, 1]);
    expect(save.deathMarks).toEqual([900]);
  });

  it('adventure rounds keep lives and record the level best', () => {
    const save = defaultSave();
    bankRound(save, { levelId: 4, score: 13, coins: 0, diamonds: 0, distance: 0 });
    expect(save.lives).toBe(TUNING.session.startLives);
    expect(save.levelBest[4]).toBe(13);
    expect(starsFor(13)).toBe(2);
  });

  it('a rewarded ad refills lives', () => {
    const save = { ...defaultSave(), lives: 0 };
    grantAdLives(save);
    expect(save.lives).toBe(TUNING.session.adLives);
  });

  it('buys and selects skins only when affordable and owned', () => {
    const save = { ...defaultSave(), coins: 20 };
    expect(buySkin(save, 'cosmic')).toBe('tooExpensive');
    expect(selectSkin(save, 'cosmic')).toBe(false);
    expect(buySkin(save, 'emerald')).toBe('bought');
    expect([save.coins, save.activeSkin]).toEqual([5, 'emerald']);
    expect(buySkin(save, 'emerald')).toBe('owned');
    expect(selectSkin(save, 'classic')).toBe(true);
  });

  it('unlocks adventure mode for its price', () => {
    const save = { ...defaultSave(), coins: ADVENTURE_UNLOCK_COST.coins, diamonds: ADVENTURE_UNLOCK_COST.diamonds };
    expect(unlockAdventure(save)).toBe(true);
    expect([save.adventureUnlocked, save.coins, save.diamonds]).toEqual([true, 0, 0]);
  });
});

describe('achievements', () => {
  it('unlocks once and pays its reward', () => {
    const save = defaultSave();
    const first = unlockAchievements(save, { ...noStats, score: 10 });
    expect(first.map((a) => a.id)).toEqual(['fledgling_flapper']);
    expect(save.coins).toBe(5);
    expect(unlockAchievements(save, { ...noStats, score: 50 })).toEqual([]);
  });

  it('adventure stars count from saved level bests', () => {
    const save = defaultSave();
    save.levelBest[3] = 25;
    expect(unlockAchievements(save, noStats).map((a) => a.id)).toEqual(['perfect_explorer']);
  });
});

describe('daily quests', () => {
  it('picks distinct quests once per day', () => {
    const save = defaultSave();
    expect(refreshQuests(save, '2026-11-23', createRandom(1))).toBe(true);
    expect(save.quests.list).toHaveLength(QUESTS_PER_DAY);
    expect(new Set(save.quests.list.map((q) => q.kind)).size).toBe(QUESTS_PER_DAY);
    expect(refreshQuests(save, '2026-11-23', createRandom(2))).toBe(false);
    expect(refreshQuests(save, '2026-11-24', createRandom(2))).toBe(true);
  });

  it('completes, claims once and pays', () => {
    const save = defaultSave();
    save.quests = { day: 'x', list: [{ kind: 'flaps', progress: 0, claimed: false }] };
    expect(addQuestProgress(save, 'flaps', 59)).toEqual([]);
    expect(addQuestProgress(save, 'flaps', 5).map((q) => q.kind)).toEqual(['flaps']);
    expect(save.quests.list[0]!.progress).toBe(60);
    expect(claimableCount(save)).toBe(1);
    expect(claimQuest(save, 0)).toBe(20);
    expect(claimQuest(save, 0)).toBe(0);
    expect(save.coins).toBe(20);
  });

  it('formats the local day', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59).getTime())).toBe('2026-01-05');
  });
});
