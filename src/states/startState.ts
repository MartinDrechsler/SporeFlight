import { ENDLESS_LEVEL_ID } from '../config/levels';
import { TUNING } from '../config/tuning';
import type { State } from '../core/stateMachine';
import { claimableCount, dayKey, refreshQuests } from '../meta/quests';
import { byId, clockText, setText } from '../ui/dom';
import { showHearts } from '../ui/icons';
import { showScreens } from '../ui/screens';
import type { GameContext } from './context';
import { hover } from './hover';
import { avatarScale, idleLook } from '../render/avatar';
import { AvatarPlayer } from '../render/timeline';
import { startRound } from './round';
import { syncLeaderboard } from './syncLeaderboard';

/** Title screen and main menu: the mushroom hovers while the forest drifts by. */
export function startState(ctx: GameContext): State {
  let time = 0;
  const acting = new AvatarPlayer();
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
  // Out of lives, the lives stat pulses red; tapping it opens the out of breath screen (rest or ad).
  byId('start-lives-stat').addEventListener('click', () => {
    if (ctx.current() !== 'start' || ctx.save.lives > 0) return;
    ctx.audio.unlock();
    ctx.audio.ui('click');
    ctx.go('gameOver');
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
      // Out of lives the home screen still shows (the player chose to go back); flying leads to the
      // out of breath screen (startRound), and so does tapping the pulsing lives stat.
      if (refreshQuests(ctx.save, dayKey(ctx.now()), ctx.rng)) ctx.persist();
      ctx.levelId = ENDLESS_LEVEL_ID;
      ctx.world = ctx.newWorld(ENDLESS_LEVEL_ID);
      time = 0;
      acting.play(ctx.avatarMood ?? 'idle');
      ctx.avatarMood = null;
      refresh(ctx);
      showScreens('start');
      // A run that could not be sent earlier (offline) goes now.
      void syncLeaderboard(ctx);
    },

    update(dt) {
      time += dt;
      paintLives(ctx);
      hover(ctx, 'start-slot', time, dt);
      // The avatar: centred, bigger, glancing around and blinking. Its real place stays where flights begin.
      const slot = byId('start-slot').getBoundingClientRect();
      const scale = avatarScale(slot.height, ctx.world.player.radius);
      ctx.pose = { shiftX: ctx.world.width / 2 - ctx.world.player.x, scale, ...idleLook(time), act: acting.update(dt) };
      // Coins to the avatar's lower left, diamonds to its right, standing level with its foot (not bobbing).
      ctx.treasure.update(dt, ctx.save.coins, ctx.save.diamonds);
      const r = ctx.world.player.radius * scale;
      const field = byId('game').getBoundingClientRect();
      const middle = slot.top - field.top + slot.height / 2;
      ctx.treasureAt = { x: ctx.world.width / 2, y: middle + r * 0.95, r, floor: slot.bottom - field.top - 4 };
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
  paintLives(ctx);
  byId('start-last').hidden = ctx.lastScore === null;
  setText(byId('start-last-score'), ctx.lastScore ?? 0);
  byId('adventure-lock').hidden = save.adventureUnlocked;
  const claimable = claimableCount(save);
  const badge = byId('quests-badge');
  badge.hidden = claimable === 0;
  setText(badge, claimable);
}

/** Hearts, or out of lives: empty hearts pulsing red, or the rest countdown if a rest is running. */
function paintLives(ctx: GameContext): void {
  const { save } = ctx;
  showHearts(byId('start-lives'), save.lives);
  const out = save.lives <= 0;
  const stat = byId('start-lives-stat');
  stat.classList.toggle('out', out);
  if (out) stat.setAttribute('role', 'button');
  else stat.removeAttribute('role');
  // Resting: the countdown takes the empty hearts' place.
  const resting = out && save.restSecondsLeft > 0;
  const time = byId('start-rest-time');
  time.hidden = !resting;
  byId('start-lives').hidden = resting;
  if (resting) setText(time, clockText(save.restSecondsLeft));
}
