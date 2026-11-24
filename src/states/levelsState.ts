import { levelById } from '../config/levels';
import { skinById } from '../config/skins';
import { THEMES } from '../config/theme';
import type { State } from '../core/stateMachine';
import { currentLevelId, isLevelOpen, levelStars } from '../meta/adventure';
import { byId, setText, starText } from '../ui/dom';
import { renderMap, scrollMapTo, showMapStars } from '../ui/map';
import { showScreens } from '../ui/screens';
import type { GameContext } from './context';
import { onBack } from './menu';
import { startRound } from './round';

/** The Adventure map: tap a stop on the path to read about it, then fly. */
export function levelsState(ctx: GameContext): State {
  let selected = 1;
  onBack(ctx, 'screen-levels', 'start');
  byId('map-play').addEventListener('click', () => {
    if (!isLevelOpen(ctx.save, selected)) return;
    ctx.audio.unlock();
    startRound(ctx, selected);
  });

  const pick = (levelId: number): void => {
    ctx.audio.unlock();
    ctx.audio.ui(isLevelOpen(ctx.save, levelId) ? 'click' : 'error');
    selected = levelId;
    render();
  };

  const render = (): void => {
    const save = ctx.save;
    renderMap(save, currentLevelId(save), selected, skinById(save.activeSkin), pick);
    showMapStars(save);
    const level = levelById(selected);
    const open = isLevelOpen(save, level.id);
    const name = byId('map-card-name');
    setText(name, `${level.id}. ${level.name}`);
    name.style.setProperty('--level-color', THEMES[level.theme].accent);
    setText(byId('map-card-stars'), starText(levelStars(save, level.id)));
    setText(byId('map-card-text'), open ? level.description : `Finish level ${level.id - 1} to open this one.`);
    byId('map-play').hidden = !open;
  };

  return {
    enter() {
      // Coming back from a level shows that level; otherwise the one the player is up to.
      const last = ctx.levelId;
      selected = last !== 0 && isLevelOpen(ctx.save, last) ? last : currentLevelId(ctx.save);
      render();
      showScreens('levels');
      scrollMapTo(selected);
    },
  };
}
