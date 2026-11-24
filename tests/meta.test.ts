import { describe, expect, it } from 'vitest';
import { BIOMES, BLEND_ROOTS, biomeAt, biomeBlend } from '../src/config/biomes';
import { ADVENTURE_UNLOCK_COST } from '../src/config/levels';
import { QUEST_POOL, QUESTS_PER_DAY } from '../src/config/rewards';
import { TUNING } from '../src/config/tuning';
import { createRandom } from '../src/core/random';
import { defaultSave, loadSave, migrate, writeSave, type KeyValueStore } from '../src/core/save';
import { finishLevel, isLevelOpen, starsFor, currentLevelId } from '../src/meta/adventure';
import { unlockAchievements } from '../src/meta/achievements';
import { accepted, join, leave, refused, rememberRun, setCountry, submissionFor } from '../src/meta/leaderboard';
import { bankRound, buyLook, refillLives, rest, selectLook, unlockAdventure } from '../src/meta/economy';
import { addQuestProgress, claimableCount, claimQuest, dayKey, refreshQuests } from '../src/meta/quests';

function memoryStore(initial: Record<string, string> = {}): KeyValueStore {
  const data = new Map(Object.entries(initial));
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

const noStats = { score: 0, flaps: 0, coins: 0, diamonds: 0, nearMisses: 0, veins: 0, endless: true };

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

  it('upgrades older versions of the save', () => {
    const v1 = { version: 1, bestScore: 40, coins: 7, diamonds: 1, lives: 3, restUntil: 123, soundOn: false };
    const fromV1 = migrate(v1);
    expect([fromV1.version, fromV1.bestScore, fromV1.coins, fromV1.lives, fromV1.soundOn]).toEqual([6, 40, 7, 3, false]);
    const fromV2 = migrate({ version: 2, deathMarks: [100, 200] });
    expect(fromV2.deathMarks).toEqual({ '0': [100, 200] });
    // Version 4 replaced the levels: old per-level scores do not become stars.
    const fromV3 = migrate({ version: 3, levelBest: [0, 25, 12], levelStars: { '2': 9, '3': 'x' } });
    expect(fromV3.levelStars).toEqual({ '2': 3 });
    expect('levelBest' in fromV3).toBe(false);
    // Version 5: new quest pool (old quests replaced), trails added, removed badges dropped, badge trails owned.
    const fromV4 = migrate({
      version: 4,
      achievements: ['fledgling_flapper', 'near_miss_master'],
      quests: { day: '2026-11-24', list: [{ kind: 'flaps', progress: 3, claimed: false }] },
    });
    expect(fromV4.quests).toEqual({ day: '', list: [] });
    expect(fromV4.achievements).toEqual(['near_miss_master']);
    expect(fromV4.ownedTrails).toEqual(['none', 'gold']);
    expect(fromV4.activeTrail).toBe('none');
  });

  it('round-trips through storage', () => {
    const store = memoryStore();
    const data = { ...defaultSave(), username: 'MARTIN', bestScore: 40 };
    writeSave(store, data);
    expect(loadSave(store)).toEqual(data);
  });
});

describe('economy', () => {
  it('every round costs a life, records the best score and the crash spot per level', () => {
    const save = defaultSave();
    expect(bankRound(save, { levelId: 0, score: 30, coins: 4, diamonds: 1, distance: 900 })).toBe(true);
    expect([save.lives, save.bestScore, save.coins, save.diamonds]).toEqual([TUNING.session.startLives - 1, 30, 4, 1]);
    expect(bankRound(save, { levelId: 4, score: 13, coins: 0, diamonds: 0, distance: 500 })).toBe(false);
    expect(save.lives).toBe(TUNING.session.startLives - 2);
    expect(save.deathMarks).toEqual({ '0': [900], '4': [500] });
    expect(bankRound(save, { levelId: 0, score: 10, coins: 0, diamonds: 0, distance: 0 })).toBe(false);
  });

  it('out of lives: resting refills them after the rest time, counting only given time', () => {
    const save = { ...defaultSave(), lives: 1 };
    bankRound(save, { levelId: 0, score: 0, coins: 0, diamonds: 0, distance: 0 });
    expect([save.lives, save.restSecondsLeft]).toEqual([0, TUNING.session.restSeconds]);
    expect(rest(save, 30)).toBe(false);
    expect(rest(save, 30)).toBe(true);
    expect([save.lives, save.restSecondsLeft]).toEqual([TUNING.session.refillLives, 0]);
  });

  it('an ad refills lives at once and ends the rest', () => {
    const save = { ...defaultSave(), lives: 0, restSecondsLeft: 50 };
    refillLives(save);
    expect([save.lives, save.restSecondsLeft]).toEqual([TUNING.session.refillLives, 0]);
  });

  it('buys looks with coins or diamonds, only when affordable, and wears them', () => {
    const save = { ...defaultSave(), coins: 60, diamonds: 4 };
    expect(buyLook(save, 'skin', 'cosmic')).toBe('tooExpensive');
    expect(selectLook(save, 'skin', 'cosmic')).toBe(false);
    expect(buyLook(save, 'skin', 'emerald')).toBe('bought');
    expect([save.coins, save.activeSkin]).toEqual([10, 'emerald']);
    expect(buyLook(save, 'skin', 'emerald')).toBe('owned');
    expect(buyLook(save, 'skin', 'crystal')).toBe('tooExpensive');
    expect(buyLook(save, 'trail', 'stardust')).toBe('bought');
    expect([save.diamonds, save.activeTrail]).toEqual([1, 'stardust']);
    expect(selectLook(save, 'skin', 'classic')).toBe(true);
  });

  it('badge trails cannot be bought, whatever you have', () => {
    const save = { ...defaultSave(), coins: 9999, diamonds: 999 };
    expect(buyLook(save, 'trail', 'rainbow')).toBe('tooExpensive');
  });

  it('unlocks adventure mode for its price', () => {
    const save = { ...defaultSave(), coins: ADVENTURE_UNLOCK_COST.coins, diamonds: ADVENTURE_UNLOCK_COST.diamonds };
    expect(unlockAdventure(save)).toBe(true);
    expect([save.adventureUnlocked, save.coins, save.diamonds]).toEqual([true, 0, 0]);
  });
});

describe('achievements', () => {
  it('badges are honour: unlocked once, no coins, and only endless scores count for endless badges', () => {
    const save = defaultSave();
    expect(unlockAchievements(save, { ...noStats, score: 30, endless: false })).toEqual([]);
    const first = unlockAchievements(save, { ...noStats, score: 10 });
    expect(first.map((a) => a.id)).toEqual(['sprout']);
    expect(save.coins).toBe(0);
    expect(unlockAchievements(save, { ...noStats, score: 10 })).toEqual([]);
  });

  it('a badge brings its trail, which can then be worn', () => {
    const save = defaultSave();
    unlockAchievements(save, { ...noStats, score: 50 });
    expect(save.achievements).toContain('forest_legend');
    expect(save.ownedTrails).toContain('rainbow');
    expect(selectLook(save, 'trail', 'rainbow')).toBe(true);
  });

  it('adventure badges follow finished levels and stars', () => {
    const save = defaultSave();
    for (let id = 1; id <= 5; id++) save.levelStars[String(id)] = 1;
    expect(unlockAchievements(save, noStats).map((a) => a.id)).toEqual(['stone_breaker']);
    for (let id = 1; id <= 10; id++) save.levelStars[String(id)] = 3;
    expect(unlockAchievements(save, noStats).map((a) => a.id)).toEqual(['storm_rider', 'perfect_explorer', 'forest_master']);
    expect(save.ownedTrails).toEqual(expect.arrayContaining(['lightning', 'aurora']));
  });

  it('three stars on any level earns the explorer badge', () => {
    const save = defaultSave();
    save.levelStars['3'] = 3;
    expect(unlockAchievements(save, { ...noStats, endless: false }).map((a) => a.id)).toEqual(['perfect_explorer']);
  });
});

describe('adventure progress', () => {
  const run = { levelId: 1, coins: 10, coinsOffered: 10, diamonds: 1, diamondsOffered: 1 };

  it('stars: finishing, most coins, then every coin and the diamond', () => {
    expect(starsFor({ ...run, coins: 2 })).toBe(1);
    expect(starsFor({ ...run, coins: 8, diamonds: 0 })).toBe(2);
    expect(starsFor({ ...run, diamonds: 0 })).toBe(2);
    expect(starsFor(run)).toBe(3);
  });

  it('finishing a level banks its coins, keeps lives, keeps the best stars and opens the next', () => {
    const save = defaultSave();
    expect([isLevelOpen(save, 1), isLevelOpen(save, 2)]).toEqual([true, false]);
    expect(currentLevelId(save)).toBe(1);
    const first = finishLevel(save, { ...run, coins: 2 });
    expect(first).toEqual({ stars: 1, improved: true, opened: 2 });
    expect([save.coins, save.diamonds, save.lives]).toEqual([2, 1, TUNING.session.startLives]);
    expect(isLevelOpen(save, 2)).toBe(true);
    expect(currentLevelId(save)).toBe(2);
    expect(finishLevel(save, run)).toEqual({ stars: 3, improved: true, opened: null });
    expect(finishLevel(save, { ...run, coins: 0 }).improved).toBe(false);
    expect(save.levelStars['1']).toBe(3);
  });

  it('the last level opens nothing', () => {
    const save = defaultSave();
    expect(finishLevel(save, { ...run, levelId: 10 }).opened).toBeNull();
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

  it('completes, claims once and pays a small reward', () => {
    const save = defaultSave();
    save.quests = { day: 'x', list: [{ kind: 'flaps', progress: 0, claimed: false }] };
    expect(addQuestProgress(save, 'flaps', 99)).toEqual([]);
    expect(addQuestProgress(save, 'flaps', 5).map((q) => q.kind)).toEqual(['flaps']);
    expect(save.quests.list[0]!.progress).toBe(100);
    expect(claimableCount(save)).toBe(1);
    expect(claimQuest(save, 0)).toBe(5);
    expect(claimQuest(save, 0)).toBe(0);
    expect(save.coins).toBe(5);
  });

  it("a 'best' quest takes the best single run, not a sum", () => {
    const save = defaultSave();
    save.quests = { day: 'x', list: [{ kind: 'endlessScore', progress: 0, claimed: false }] };
    addQuestProgress(save, 'endlessScore', 9);
    addQuestProgress(save, 'endlessScore', 7);
    expect(save.quests.list[0]!.progress).toBe(9);
    expect(addQuestProgress(save, 'endlessScore', 15).map((q) => q.kind)).toEqual(['endlessScore']);
  });

  it('every quest pays 5 to 15 coins, and Adventure quests wait until Adventure is open', () => {
    for (const template of QUEST_POOL) expect(template.reward).toBeGreaterThanOrEqual(5);
    for (const template of QUEST_POOL) expect(template.reward).toBeLessThanOrEqual(15);
    for (let seed = 1; seed < 30; seed++) {
      const save = defaultSave();
      refreshQuests(save, 'd', createRandom(seed));
      expect(save.quests.list.some((q) => q.kind === 'levelsFinished')).toBe(false);
    }
  });

  it('formats the local day', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59).getTime())).toBe('2026-01-05');
  });
});

describe('the endless journey', () => {
  it('a new biome every 20 points, 8 in all, ending in the Frozen Peaks', () => {
    expect(BIOMES).toHaveLength(8);
    expect(BIOMES.map((b) => b.fromScore)).toEqual([0, 20, 40, 60, 80, 100, 120, 140]);
    expect(biomeAt(19).id).toBe('dark_forest');
    expect(biomeAt(20).id).toBe('twilight');
    expect(biomeAt(500).id).toBe('peaks');
  });

  it('blends into the next biome over the roots before it arrives', () => {
    expect(biomeBlend(10)).toMatchObject({ t: 1 });
    expect(biomeBlend(10).to.id).toBe('dark_forest');
    const halfway = biomeBlend(20 - BLEND_ROOTS / 2);
    expect([halfway.from.id, halfway.to.id, halfway.t]).toEqual(['dark_forest', 'twilight', 0.5]);
    expect(biomeBlend(20).to.id).toBe('twilight');
    expect(biomeBlend(20).t).toBe(1);
  });

  it('reaching a biome in endless earns its badge, all the earlier ones too', () => {
    const save = defaultSave();
    const ids = unlockAchievements(save, { ...noStats, score: 45 }).map((a) => a.id);
    expect(ids).toEqual(expect.arrayContaining(['biome_twilight', 'biome_woodland']));
    expect(ids).not.toContain('biome_meadow');
    expect(unlockAchievements(defaultSave(), { ...noStats, score: 45, endless: false })).toEqual([]);
  });
});

describe('the leaderboard on the phone', () => {
  const record = { rulesVersion: 1, seed: 7, width: 390, height: 700, startY: 300, taps: [0, 20, 41] };

  it('keeps only the best endless run, and sends nothing before the player joins', () => {
    const save = defaultSave();
    expect(rememberRun(save, 12, record)).toBe(true);
    expect(rememberRun(save, 9, record)).toBe(false);
    expect(rememberRun(save, 0, record)).toBe(false);
    expect(save.leaderboard.best?.score).toBe(12);
    expect(submissionFor(save)).toBeNull();
  });

  it('after joining, sends the best run once, then only news: a better run, a new name or country', () => {
    const save = { ...defaultSave(), username: 'Martin' };
    rememberRun(save, 12, record);
    join(save, 'c'.repeat(32), 'CH');
    const first = submissionFor(save)!;
    expect(first).toMatchObject({ playerId: 'c'.repeat(32), name: 'Martin', country: 'CH', score: 12 });
    accepted(save, first);
    expect(submissionFor(save)).toBeNull();
    setCountry(save, 'AT');
    expect(submissionFor(save)?.country).toBe('AT');
    accepted(save, submissionFor(save)!);
    save.username = 'Marti';
    expect(submissionFor(save)?.name).toBe('Marti');
    accepted(save, submissionFor(save)!);
    rememberRun(save, 20, record);
    expect(submissionFor(save)?.score).toBe(20);
  });

  it('a refused name waits for a new one; a run that fails its check is dropped', () => {
    const save = { ...defaultSave(), username: 'Martin' };
    rememberRun(save, 12, record);
    join(save, 'c'.repeat(32), null);
    refused(save, 'name');
    expect([save.leaderboard.nameRefused, save.leaderboard.best?.score]).toEqual([true, 12]);
    refused(save, 'replay');
    expect(save.leaderboard.best).toBeNull();
  });

  it('leaving forgets the player id but keeps the best run to rejoin with', () => {
    const save = defaultSave();
    rememberRun(save, 12, record);
    join(save, 'c'.repeat(32), 'CH');
    accepted(save, submissionFor(save)!);
    leave(save);
    expect([save.leaderboard.playerId, save.leaderboard.sent, save.leaderboard.best?.score]).toEqual([null, null, 12]);
  });

  it('save v6 keeps a valid leaderboard state and drops broken parts', () => {
    const kept = migrate({ version: 6, leaderboard: { playerId: 'c'.repeat(32), country: 'CH', best: { score: 9, run: record } } });
    expect(kept.leaderboard).toMatchObject({ playerId: 'c'.repeat(32), country: 'CH', best: { score: 9 } });
    const broken = migrate({ version: 6, leaderboard: { playerId: 'x', country: 'ZZ', best: { score: 9, run: { taps: 'no' } } } });
    expect(broken.leaderboard).toEqual({ playerId: null, country: null, best: null, sent: null, nameRefused: false });
  });
});
