import { levelById } from '../config/levels';
import { THEMES } from '../config/theme';
import type { State } from '../core/stateMachine';
import { stepWorld } from '../gameplay/world';
import { finishLevel, nextLevelId } from '../meta/adventure';
import { byId, setText } from '../ui/dom';
import { updateHud } from '../ui/hud';
import { showScreens } from '../ui/screens';
import type { GameContext } from './context';
import { addQuest, checkAchievements, startRound } from './round';

/** Seconds between the stars flying in. */
const STAR_DELAY = 0.45;

/** Through the finish gate: stars fly in one by one, the next level opens. */
export function levelCompleteState(ctx: GameContext): State {
  let time = 0;
  let starsShown = 0;
  let stars = 0;

  byId('complete-map').addEventListener('click', () => {
    ctx.audio.ui('click');
    ctx.go('levels');
  });
  byId('complete-next').addEventListener('click', () => {
    ctx.audio.unlock();
    const next = nextLevelId(ctx.levelId);
    if (next === null) ctx.go('levels');
    else startRound(ctx, next);
  });

  return {
    enter() {
      const { world, save } = ctx;
      const level = world.level;
      const result = finishLevel(save, {
        levelId: level.id,
        coins: world.stats.coins,
        coinsOffered: world.offered.coins,
        diamonds: world.stats.diamonds,
        diamondsOffered: world.offered.diamonds,
      });
      addQuest(ctx, 'adventureRuns', 1);
      checkAchievements(ctx);
      ctx.persist();
      updateHud(world, save, { banked: true });

      stars = result.stars;
      time = 0;
      starsShown = 0;
      const name = byId('complete-level');
      setText(name, `${level.id}. ${level.name}`);
      name.style.setProperty('--level-color', THEMES[level.theme].accent);
      for (const star of byId('screen-levelComplete').querySelectorAll('.big-star')) star.classList.remove('earned');
      setText(byId('complete-coins'), `${world.stats.coins}/${world.offered.coins}`);
      setText(byId('complete-diamond'), world.offered.diamonds === 0 ? '-' : world.stats.diamonds >= world.offered.diamonds ? '✓' : '✗');
      setText(byId('complete-hint'), hintFor(stars));
      const opened = byId('complete-opened');
      opened.hidden = result.opened === null;
      if (result.opened !== null) setText(opened, `LEVEL ${result.opened} IS OPEN: ${levelById(result.opened).name}`);
      setText(byId('complete-next'), nextLevelId(level.id) === null ? 'MAP' : 'NEXT LEVEL');
      ctx.effects.celebrate(world.width, world.height, THEMES[level.theme].accent);
      showScreens('levelComplete');
    },

    update(dt) {
      stepWorld(ctx.world, dt);
      ctx.world.events.length = 0;
      time += dt;
      if (starsShown >= stars || time < STAR_DELAY * (starsShown + 1)) return;
      const star = byId('screen-levelComplete').querySelectorAll('.big-star')[starsShown];
      star?.classList.add('earned');
      starsShown += 1;
      ctx.audio.ui('reward');
    },
  };
}

/** What would earn another star. */
function hintFor(stars: number): string {
  if (stars === 1) return 'Collect most of the coins for a second star.';
  if (stars === 2) return 'Every coin and the diamond earn the third star.';
  return 'A perfect run!';
}
