import { QUEST_POOL, QUESTS_PER_DAY, type QuestKind, type QuestTemplate } from '../config/rewards';
import type { Random } from '../core/random';
import type { QuestState, SaveData } from '../core/save';

/**
 * Daily quests: three goals that add up across every round of the day and
 * are replaced at local midnight. Pure functions on SaveData.
 */
export function templateFor(kind: QuestKind): QuestTemplate {
  return QUEST_POOL.find((template) => template.kind === kind) ?? QUEST_POOL[0]!;
}

/** Local calendar day as YYYY-MM-DD. */
export function dayKey(time: number): string {
  const date = new Date(time);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Picks a fresh set of quests when the day has changed. Returns true if it did. */
export function refreshQuests(save: SaveData, today: string, rng: Random): boolean {
  if (save.quests.day === today && save.quests.list.length > 0) return false;
  // Adventure quests only once Adventure is open, so every quest can be done today.
  const pool = QUEST_POOL.filter((template) => save.adventureUnlocked || !template.needsAdventure);
  const list: QuestState[] = [];
  while (list.length < QUESTS_PER_DAY && pool.length > 0) {
    const [template] = pool.splice(Math.floor(rng.next() * pool.length), 1);
    if (template) list.push({ kind: template.kind, progress: 0, claimed: false });
  }
  save.quests = { day: today, list };
  return true;
}

/**
 * Adds progress and returns the quests that just reached their target. For a
 * 'best' quest, `amount` is the current run's value and the best one counts.
 */
export function addQuestProgress(save: SaveData, kind: QuestKind, amount: number): QuestTemplate[] {
  const completed: QuestTemplate[] = [];
  for (const quest of save.quests.list) {
    if (quest.kind !== kind || quest.claimed) continue;
    const template = templateFor(kind);
    const before = quest.progress;
    const value = template.mode === 'best' ? Math.max(quest.progress, amount) : quest.progress + amount;
    quest.progress = Math.min(template.target, value);
    if (before < template.target && quest.progress >= template.target) completed.push(template);
  }
  return completed;
}

export function isClaimable(quest: QuestState): boolean {
  return !quest.claimed && quest.progress >= templateFor(quest.kind).target;
}

/** Pays out a finished quest. Returns the coins paid (0 if not claimable). */
export function claimQuest(save: SaveData, index: number): number {
  const quest = save.quests.list[index];
  if (!quest || !isClaimable(quest)) return 0;
  quest.claimed = true;
  const reward = templateFor(quest.kind).reward;
  save.coins += reward;
  return reward;
}

export function claimableCount(save: SaveData): number {
  return save.quests.list.filter(isClaimable).length;
}

/** Milliseconds until the next local midnight, when quests reset. */
export function msUntilReset(time: number): number {
  const midnight = new Date(time);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - time;
}
