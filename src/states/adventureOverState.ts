import { THEMES } from '../config/theme';
import type { State } from '../core/stateMachine';
import { courseProgress } from '../gameplay/course';
import { levelStars } from '../meta/adventure';
import { byId, setText, starText } from '../ui/dom';
import { showScreens } from '../ui/screens';
import type { GameContext } from './context';
import { startRound } from './round';

/** After a crash in an adventure level: how far you got, then fly again or back to the map. */
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
      const color = THEMES[level.theme].accent;
      const name = byId('adventure-over-level');
      setText(name, `${level.id}. ${level.name}`);
      name.style.setProperty('--level-color', color);
      const percent = Math.round(courseProgress(ctx.world) * 100);
      setText(byId('adventure-over-progress'), `${percent}%`);
      const bar = byId('adventure-over-bar');
      bar.style.width = `${percent}%`;
      bar.style.setProperty('--level-color', color);
      setText(byId('adventure-over-stars'), starText(levelStars(ctx.save, level.id)));
      showScreens('adventureOver');
    },
  };
}
