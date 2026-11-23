import { ENDLESS_LEVEL_ID, levelById } from '../config/levels';
import { THEMES } from '../config/theme';
import type { State } from '../core/stateMachine';
import { byId, setText } from '../ui/dom';
import { renderLevels } from '../ui/panels';
import { showScreens } from '../ui/screens';
import type { GameContext } from './context';
import { onBack } from './menu';
import { startRound } from './round';

/** Adventure level select: tap a level to read its trial, tap it again to fly. */
export function levelsState(ctx: GameContext): State {
  let selected: number | null = null;
  onBack(ctx, 'screen-levels', 'start');
  byId('level-endless').addEventListener('click', () => {
    ctx.audio.ui('click');
    ctx.go('start');
  });

  const pick = (levelId: number): void => {
    ctx.audio.unlock();
    if (selected === levelId) {
      startRound(ctx, levelId);
      return;
    }
    selected = levelId;
    ctx.audio.ui('click');
    render();
  };

  const render = (): void => {
    renderLevels(ctx.save, selected, pick);
    const level = selected === null ? null : levelById(selected);
    const name = byId('level-info-name');
    setText(name, level ? `${level.id}. ${level.name}` : 'SELECT A LEVEL');
    name.style.setProperty('--level-color', level ? THEMES[level.theme].accent : '');
    setText(
      byId('level-info-text'),
      level ? `${level.description} Tap again to fly.` : 'Tap a level to see its trial, tap again to fly. Every level starts at score 0.',
    );
  };

  return {
    enter() {
      selected = ctx.levelId === ENDLESS_LEVEL_ID ? null : ctx.levelId;
      render();
      showScreens('levels');
    },
  };
}
