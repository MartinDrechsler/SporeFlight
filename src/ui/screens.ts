import { byId } from './dom';

export type ScreenName = 'start' | 'hud' | 'gameOver';

/**
 * Shows exactly the overlays a state asks for and hides all others, so two
 * screens can never be visible on top of each other by accident.
 */
export function showScreens(...visible: ScreenName[]): void {
  const all: ScreenName[] = ['start', 'hud', 'gameOver'];
  for (const name of all) {
    byId(`screen-${name}`).hidden = !visible.includes(name);
  }
}
