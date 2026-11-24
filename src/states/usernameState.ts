import { TUNING } from '../config/tuning';
import type { State } from '../core/stateMachine';
import { cleanName, isOffensive } from '../meta/names';
import { byId } from '../ui/dom';
import { showScreens } from '../ui/screens';
import type { GameContext } from './context';
import { hover } from './hover';

/** First launch: the player names their mushroom. */
export function usernameState(ctx: GameContext): State {
  const input = byId<HTMLInputElement>('username-input');
  byId('username-form').addEventListener('submit', (event) => {
    event.preventDefault();
    ctx.audio.unlock();
    const name = cleanName(input.value) || TUNING.session.defaultUsername;
    // Names are public on the leaderboard: refuse offensive ones right here.
    const error = byId('username-error');
    error.hidden = !isOffensive(name);
    if (!error.hidden) return;
    ctx.save.username = name;
    ctx.save.leaderboard.nameRefused = false;
    ctx.persist();
    input.blur();
    ctx.audio.ui('reward');
    ctx.go('start');
  });

  let time = 0;
  return {
    enter() {
      input.value = ctx.save.username ?? '';
      byId('username-error').hidden = true;
      showScreens('username');
    },
    update(dt) {
      time += dt;
      hover(ctx, 'username-slot', time, dt);
    },
  };
}
