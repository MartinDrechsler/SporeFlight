import { flapPlayer, type GameEvent, type World } from '../gameplay/world';
import type { QuestKind } from '../config/rewards';
import { unlockAchievements } from '../meta/achievements';
import { addQuestProgress } from '../meta/quests';
import { skinById } from '../config/skins';
import { trailById } from '../config/trails';
import { THEMES } from '../config/theme';
import { toast } from '../ui/toast';
import type { GameContext } from './context';

/**
 * Starts a new round of a level and gives the first flap. `fromHover` keeps
 * the mushroom where it was hovering on the menu, so it does not jump.
 */
export function startRound(ctx: GameContext, levelId: number, options: { fromHover: boolean } = { fromHover: false }): void {
  // Every way into a round passes here, so this is the one place that checks for lives.
  if (ctx.save.lives <= 0) {
    ctx.go('gameOver');
    return;
  }
  const hoverY = ctx.world.player.y;
  ctx.levelId = levelId;
  ctx.world = ctx.newWorld(levelId);
  if (options.fromHover) ctx.world.player.y = hoverY;
  ctx.go('playing');
  flapPlayer(ctx.world);
}

/** Lets sound, effects and quests react to everything that happened in the last step. */
export function deliverEvents(ctx: GameContext): void {
  const { world } = ctx;
  const flapColor = skinById(ctx.save.activeSkin).glow;
  const accent = THEMES[world.level.theme].accent;
  for (const event of world.events) {
    ctx.audio.react(event);
    ctx.effects.react(event, world.player.x, world.player.y, world.width, world.height, flapColor, accent);
    for (const [kind, amount] of questProgressFor(event, world)) addQuest(ctx, kind, amount);
  }
  world.events.length = 0;
}

export function addQuest(ctx: GameContext, kind: QuestKind, amount: number): void {
  for (const quest of addQuestProgress(ctx.save, kind, amount)) {
    ctx.effects.announce(`QUEST DONE: ${quest.text.toUpperCase()}`, '#bd00ff', ctx.world.width, ctx.world.height);
    ctx.audio.ui('reward');
  }
}

/** Unlocks any badge earned by the round so far and celebrates it. */
export function checkAchievements(ctx: GameContext): void {
  const unlocked = unlockAchievements(ctx.save, { ...ctx.world.stats, endless: ctx.world.level.progressive });
  for (const achievement of unlocked) {
    const trail = achievement.trail ? `  · ${trailById(achievement.trail).name} UNLOCKED` : '';
    toast(`🏅 ${achievement.name}${trail}`);
    ctx.audio.ui('reward');
  }
  if (unlocked.length > 0) ctx.persist();
}

function questProgressFor(event: GameEvent, world: World): [QuestKind, number][] {
  switch (event.type) {
    case 'flap':
      return [['flaps', 1]];
    case 'pass':
      return world.level.progressive ? [['endlessScore', event.score]] : [];
    case 'pickup':
      return event.coins > 0 ? [['coins', event.coins], ['runCoins', world.stats.coins]] : [];
    case 'nearMiss':
      return [['nearMisses', 1]];
    default:
      return [];
  }
}
