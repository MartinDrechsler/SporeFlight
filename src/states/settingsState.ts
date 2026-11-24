import type { State } from '../core/stateMachine';
import { byId, setText } from '../ui/dom';
import { showScreens } from '../ui/screens';
import type { GameContext } from './context';
import { onBack } from './menu';

/** Settings: how loud the music is. The change is heard while dragging and saved on release. */
export function settingsState(ctx: GameContext): State {
  onBack(ctx, 'screen-settings', 'start');
  const slider = byId<HTMLInputElement>('music-volume');
  const show = (percent: number): void => setText(byId('music-volume-value'), percent === 0 ? 'OFF' : `${percent}%`);
  slider.addEventListener('input', () => {
    const percent = Number(slider.value);
    show(percent);
    ctx.save.musicVolume = percent / 100;
    ctx.audio.setMusicVolume(ctx.save.musicVolume);
  });
  slider.addEventListener('change', () => ctx.persist());

  return {
    enter() {
      const percent = Math.round(ctx.save.musicVolume * 100);
      slider.value = String(percent);
      show(percent);
      showScreens('settings');
    },
  };
}
