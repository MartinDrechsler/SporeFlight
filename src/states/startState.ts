import { ENDLESS_LEVEL_ID } from '../config/levels';
import { TUNING } from '../config/tuning';
import type { State } from '../core/stateMachine';
import { claimableCount, dayKey, refreshQuests } from '../meta/quests';
import { byId, setText } from '../ui/dom';
import { showHearts } from '../ui/icons';
import { showScreens } from '../ui/screens';
import type { GameContext } from './context';
import { hover } from './hover';
import { startRound } from './round';
import { syncLeaderboard } from './syncLeaderboard';

/** Title screen and main menu: the mushroom hovers while the forest drifts by. */
export function startState(ctx: GameContext): State {
  let time = 0;
  const menu = (id: string, target: Parameters<GameContext['go']>[0]): void => {
    byId(id).addEventListener('click', () => {
      ctx.audio.unlock();
      ctx.audio.ui('click');
      ctx.go(target);
    });
  };
  menu('menu-shop', 'shop');
  menu('menu-badges', 'badges');
  menu('menu-quests', 'quests');
  menu('menu-ranks', 'ranks');
  menu('settings-button', 'settings');
  byId('menu-adventure').addEventListener('click', () => {
    ctx.audio.unlock();
    ctx.audio.ui('click');
    ctx.go(ctx.save.adventureUnlocked ? 'levels' : 'unlock');
  });
  byId('start-button').addEventListener('click', () => {
    ctx.audio.unlock();
    begin();
  });

  const begin = (): void => {
    if (ctx.current() === 'start') startRound(ctx, ENDLESS_LEVEL_ID, { fromHover: true });
  };

  return {
    enter() {
      if (ctx.save.lives <= 0) {
        ctx.go('gameOver');
        return;
      }
      if (refreshQuests(ctx.save, dayKey(ctx.now()), ctx.rng)) ctx.persist();
      ctx.levelId = ENDLESS_LEVEL_ID;
      ctx.world = ctx.newWorld(ENDLESS_LEVEL_ID);
      time = 0;
      refresh(ctx);
      showScreens('start');
      // A run that could not be sent earlier (offline) goes now.
      void syncLeaderboard(ctx);
    },

    update(dt) {
      time += dt;
      hover(ctx, 'start-slot', time, dt);
    },

    onTap: begin,
  };
}

function refresh(ctx: GameContext): void {
  const { save } = ctx;
  setText(byId('start-username'), save.username ?? TUNING.session.defaultUsername);
  setText(byId('start-best'), save.bestScore);
  setText(byId('start-coins'), save.coins);
  setText(byId('start-diamonds'), save.diamonds);
  showHearts(byId('start-lives'), save.lives);
  byId('start-last').hidden = ctx.lastScore === null;
  setText(byId('start-last-score'), ctx.lastScore ?? 0);
  byId('adventure-lock').hidden = save.adventureUnlocked;
  const claimable = claimableCount(save);
  const badge = byId('quests-badge');
  badge.hidden = claimable === 0;
  setText(badge, claimable);
}
