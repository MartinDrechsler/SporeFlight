import { starsFor } from '../config/levels';
import { THEMES } from '../config/theme';
import type { State } from '../core/stateMachine';
import { byId, setText, starText } from '../ui/dom';
import { clearHudEffects } from '../ui/hud';
import { showScreens } from '../ui/screens';
import type { GameContext } from './context';
import { startRound } from './round';

/** After a crash in an adventure level: result, stars, and retry or back to levels. */
export function adventureOverState(ctx: GameContext): State {
  byId('adventure-back').addEventListener('click', () => {
    ctx.audio.ui('click');
    ctx.go('levels');
  });
  byId('adventure-retry').addEventListener('click', () => {
    ctx.audio.unlock();
    startRound(ctx, ctx.levelId);
  });

  return {
    enter() {
      const level = ctx.world.level;
      clearHudEffects();
      const name = byId('adventure-over-level');
      setText(name, level.name);
      name.style.setProperty('--level-color', THEMES[level.theme].accent);
      setText(byId('adventure-over-score'), ctx.world.stats.score);
      setText(byId('adventure-over-stars'), starText(starsFor(ctx.save.levelBest[level.id] ?? 0)));
      showScreens('adventureOver');
    },
  };
}
