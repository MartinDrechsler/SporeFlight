import { byId } from './dom';

export type ScreenName =
  | 'username' | 'start' | 'hud' | 'gameOver' | 'ad' | 'adventureOver' | 'levelComplete'
  | 'shop' | 'badges' | 'quests' | 'levels' | 'unlock' | 'ranks' | 'settings' | 'story';

const ALL: readonly ScreenName[] = [
  'username', 'start', 'hud', 'gameOver', 'ad', 'adventureOver', 'levelComplete', 'shop', 'badges', 'quests', 'levels', 'unlock', 'ranks', 'settings', 'story',
];

/**
 * Shows exactly the overlays a state asks for and hides all others, so two
 * screens can never be visible on top of each other by accident.
 */
export function showScreens(...visible: ScreenName[]): void {
  for (const name of ALL) byId(`screen-${name}`).hidden = !visible.includes(name);
}
