import { levelById } from '../config/levels';
import { chapterStory } from '../config/story';
import { skinById } from '../config/skins';
import { THEMES } from '../config/theme';
import type { State } from '../core/stateMachine';
import { currentLevelId, isLevelOpen, levelNumber, levelTitle, levelProgress, levelStars } from '../meta/adventure';
import { byId, setText, starText } from '../ui/dom';
import { renderMap, scrollMapTo, showMapStars } from '../ui/map';
import { showScreens } from '../ui/screens';
import type { GameContext } from './context';
import { onBack } from './menu';
import { startRound } from './round';

/** The Adventure map: tap a stop on the path to read about it, then fly. */
export function levelsState(ctx: GameContext): State {
  let selected = 1;
  /** Whether a level can be flown: earned in order, or everything in a playtest build. */
  const open = (levelId: number): boolean => ctx.playtest || isLevelOpen(ctx.save, levelId);
  onBack(ctx, 'screen-levels', 'start');
  byId('map-play').addEventListener('click', () => {
    if (!open(selected)) return;
    ctx.audio.unlock();
    // A new chapter opens with its story, the first time one of its levels is flown.
    const story = chapterStory(levelById(selected).chapter);
    if (story && !ctx.save.storySeen.includes(story)) {
      ctx.story = { id: story, then: { play: selected } };
      ctx.go('story');
      return;
    }
    startRound(ctx, selected);
  });

  const pick = (levelId: number): void => {
    ctx.audio.unlock();
    ctx.audio.ui(open(levelId) ? 'click' : 'error');
    selected = levelId;
    render();
  };

  const render = (): void => {
    const save = ctx.save;
    renderMap(save, currentLevelId(save), selected, skinById(save.activeSkin), pick, open);
    showMapStars(save);
    // A playtest build says so, so it is never mistaken for the real progression.
    setText(byId('map-title'), ctx.playtest ? 'PLAYTEST' : 'ADVENTURE');
    const level = levelById(selected);
    const flyable = open(level.id);
    const name = byId('map-card-name');
    setText(name, levelTitle(level.id));
    name.style.setProperty('--level-color', THEMES[level.theme].accent);
    setText(byId('map-card-stars'), starText(levelStars(save, level.id)));
    setText(byId('map-card-text'), flyable ? level.description : `Finish level ${levelNumber(level.id) - 1} to open this one.`);
    // What each star asks for, ticked once earned.
    const progress = levelProgress(save, level.id);
    const tick = (done: boolean | undefined): string => (done ? '★' : '☆');
    setText(
      byId('map-card-goals'),
      level.sporelings > 0
        ? `${tick(progress !== null)} FINISH  ${tick(progress?.sporelings)} ${level.sporelings} SPORELINGS  ${tick(progress?.coins)} EVERY COIN`
        : `${tick(progress !== null)} FINISH  ${tick(progress?.sporelings)} SURVIVE  ${tick(progress?.coins)} EVERY COIN`,
    );
    byId('map-play').hidden = !flyable;
  };

  return {
    enter() {
      // The first time on the map, the story begins.
      if (!ctx.save.storySeen.includes('opening')) {
        ctx.story = { id: 'opening', then: 'levels' };
        ctx.go('story');
        return;
      }
      // Coming back from a level shows that level; otherwise the one the player is up to.
      const last = ctx.levelId;
      selected = last !== 0 && open(last) ? last : currentLevelId(ctx.save);
      render();
      showScreens('levels');
      scrollMapTo(selected);
    },
  };
}
