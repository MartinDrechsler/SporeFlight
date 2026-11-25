import { recoveryStep, type AnimationId } from '../config/animations';
import { skinById } from '../config/skins';
import type { State } from '../core/stateMachine';
import { awaitingChoice, rest, restProgress, startRest } from '../meta/economy';
import { AvatarStage } from '../ui/avatarStage';
import { byId, clockText, setText } from '../ui/dom';
import { showScreens } from '../ui/screens';
import { toast } from '../ui/toast';
import type { GameContext } from './context';

/** Seconds the happy jump plays before going home once the lives are back. */
const JUMP_SECONDS = 1.6;

/**
 * Out of lives. The mushroom lies knocked out, stars circling its head. The
 * player chooses: rest one minute (counting only while the game is open) or
 * watch a short ad. Nothing happens until one is tapped. Resting starts the
 * ring countdown, and the mushroom gets better step by step from where it
 * lies (config/animations.ts, RECOVERY).
 */
export function gameOverState(ctx: GameContext): State {
  let sinceSave = 0;
  let step: AnimationId | null = null;
  /** Seconds until going home after the lives came back; null while not leaving. */
  let leaving: number | null = null;
  const stage = new AvatarStage(byId<HTMLCanvasElement>('gameover-stage'), { skin: skinById(ctx.save.activeSkin) });
  const look = () => ({ skin: skinById(ctx.save.activeSkin) });

  const act = (id: AnimationId): void => {
    if (step === id) return;
    step = id;
    stage.play(id, look());
  };

  const paint = (): void => {
    const choosing = awaitingChoice(ctx.save);
    byId('rest-button').hidden = !choosing;
    byId('rest-ring').hidden = choosing;
    byId('rest-ring-progress').style.strokeDashoffset = String(100 * (1 - restProgress(ctx.save)));
    setText(byId('gameover-timer'), clockText(ctx.save.restSecondsLeft));
  };

  byId('rest-button').addEventListener('click', () => {
    ctx.audio.unlock();
    ctx.audio.ui('click');
    startRest(ctx.save);
    ctx.persist();
    paint();
    act(recoveryStep(0));
  });

  // BACK asks first: going home leaves the player without lives (the home lives stat then pulses red).
  const confirming = (on: boolean): void => {
    byId('gameover-back').hidden = on;
    byId('gameover-confirm').hidden = !on;
  };
  byId('gameover-back').addEventListener('click', () => {
    ctx.audio.ui('click');
    confirming(true);
  });
  byId('gameover-no').addEventListener('click', () => {
    ctx.audio.ui('click');
    confirming(false);
  });
  byId('gameover-yes').addEventListener('click', () => {
    if (leaving !== null) return;
    ctx.audio.ui('click');
    ctx.persist();
    ctx.lastScore = null;
    ctx.go('start');
  });

  byId('watch-ad-button').addEventListener('click', () => {
    if (leaving !== null) return;
    ctx.audio.unlock();
    ctx.audio.ui('click');
    ctx.persist();
    ctx.go('ad');
  });

  return {
    enter() {
      sinceSave = 0;
      step = null;
      leaving = null;
      confirming(false);
      setText(byId('gameover-score'), ctx.lastScore ?? 0);
      setText(byId('gameover-best'), ctx.save.bestScore);
      paint();
      act(recoveryStep(restProgress(ctx.save)));
      showScreens('gameOver');
    },

    update(dt) {
      stage.update(dt);
      if (leaving !== null) {
        leaving -= dt;
        if (leaving <= 0) {
          ctx.lastScore = null;
          ctx.go('start');
        }
        return;
      }
      if (awaitingChoice(ctx.save)) return;

      const rested = rest(ctx.save, dt);
      paint();
      act(recoveryStep(restProgress(ctx.save)));
      // Save the countdown now and then, so closing the game keeps the progress.
      sinceSave += dt;
      if (sinceSave >= 1 || rested) {
        sinceSave = 0;
        ctx.persist();
      }
      if (!rested) return;
      ctx.audio.ui('reward');
      toast(`RESTED! +${ctx.save.lives} LIVES`);
      leaving = JUMP_SECONDS;
    },
  };
}

let awaySinceSave = 0;

/**
 * A rest that was started goes on while the player is elsewhere in the game
 * (home, shop...): the game is open, so the minute counts. Call every frame
 * while the out of breath screen is not shown.
 */
export function restWhileAway(ctx: GameContext, dt: number): void {
  if (ctx.save.lives > 0 || ctx.save.restSecondsLeft <= 0) return;
  const rested = rest(ctx.save, dt);
  awaySinceSave += dt;
  if (awaySinceSave >= 1 || rested) {
    awaySinceSave = 0;
    ctx.persist();
  }
  if (!rested) return;
  ctx.audio.ui('reward');
  toast(`RESTED! +${ctx.save.lives} LIVES`);
}

/** Shows or hides the "ad failed" message on the game over screen. */
export function setAdError(visible: boolean): void {
  byId('ad-error').hidden = !visible;
}
