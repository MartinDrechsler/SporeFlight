import { TUNING } from '../config/tuning';
import type { State } from '../core/stateMachine';
import { cleanUsername } from '../core/save';
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
    ctx.save.username = cleanUsername(input.value) ?? TUNING.session.defaultUsername;
    ctx.persist();
    input.blur();
    ctx.audio.ui('reward');
    ctx.go('start');
  });

  let time = 0;
  return {
    enter() {
      input.value = '';
      showScreens('username');
    },
    update(dt) {
      time += dt;
      hover(ctx, 'username-slot', time, dt);
    },
  };
}
