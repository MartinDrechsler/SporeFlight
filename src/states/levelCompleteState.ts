import { levelById } from '../config/levels';
import { skinById } from '../config/skins';
import { THEMES } from '../config/theme';
import type { SaveData } from '../core/save';
import type { State } from '../core/stateMachine';
import { stepWorld } from '../gameplay/world';
import { findSecret, finishLevel, levelNumber, levelTitle, levelProgress, nextLevelId } from '../meta/adventure';
import { AvatarStage } from '../ui/avatarStage';
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
  /** Set when the level was finished through its secret gap: the secret level NEXT leads to. */
  let secretNext: number | null = null;
  let stars = 0;
  const stage = new AvatarStage(byId<HTMLCanvasElement>('complete-stage'), { skin: skinById(ctx.save.activeSkin) });

  byId('complete-map').addEventListener('click', () => {
    ctx.audio.ui('click');
    ctx.go('levels');
  });
  byId('complete-next').addEventListener('click', () => {
    ctx.audio.unlock();
    // Through a secret gap, NEXT leads into the secret level.
    const next = secretNext ?? nextLevelId(ctx.levelId);
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
        sporelings: world.stats.sporelings,
        sporelingsOffered: world.offered.sporelings,
      });
      const found = world.course.secret ? findSecret(save, level.id) : null;
      secretNext = world.course.secret ? (level.secret?.levelId ?? null) : null;
      addQuest(ctx, 'levelsFinished', 1);
      checkAchievements(ctx);
      ctx.persist();
      updateHud(world, save, { banked: true });

      stage.play('cheer', { skin: skinById(save.activeSkin) });
      stars = result.stars;
      time = 0;
      starsShown = 0;
      const name = byId('complete-level');
      setText(name, levelTitle(level.id));
      name.style.setProperty('--level-color', THEMES[level.theme].accent);
      for (const star of byId('screen-levelComplete').querySelectorAll('.big-star')) star.classList.remove('earned');
      setText(byId('complete-sporelings'), `${world.stats.sporelings}/${world.offered.sporelings}`);
      setText(byId('complete-coins'), `${world.stats.coins}/${world.offered.coins}`);
      setText(byId('complete-hint'), hintFor(save, level.id));
      const opened = byId('complete-opened');
      opened.hidden = result.opened === null && secretNext === null;
      if (result.opened !== null) setText(opened, `LEVEL ${levelNumber(result.opened)} IS OPEN: ${levelById(result.opened).name}`);
      if (secretNext !== null) setText(opened, `${found !== null ? 'A SECRET LEVEL IS OPEN' : 'THE SECRET WAY'}: ${levelById(secretNext).name}`);
      setText(byId('complete-next'), secretNext !== null ? 'SECRET LEVEL' : nextLevelId(level.id) === null ? 'MAP' : 'NEXT LEVEL');
      ctx.effects.celebrate(world.width, world.height, THEMES[level.theme].accent);
      showScreens('levelComplete');
    },

    update(dt) {
      stage.update(dt);
      stepWorld(ctx.world, dt);
      ctx.world.events.length = 0;
      time += dt;
      if (starsShown >= stars || time < STAR_DELAY * (starsShown + 1)) return;
      const star = byId('screen-levelComplete').querySelectorAll('.big-star')[starsShown];
      star?.classList.add('earned');
      starsShown += 1;
      ctx.audio.ui('star');
    },
  };
}

/** What would still earn a star on this level. */
function hintFor(save: SaveData, levelId: number): string {
  const progress = levelProgress(save, levelId);
  if (!progress) return '';
  if (!progress.sporelings && !progress.coins) return 'Rescue every sporeling and collect every coin for two more stars.';
  if (!progress.sporelings) return 'Rescue every sporeling for the last star.';
  if (!progress.coins) return 'Collect every coin for the last star.';
  return 'Every star! A perfect level.';
}
