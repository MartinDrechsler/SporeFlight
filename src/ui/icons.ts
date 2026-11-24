import { SPRITES, type SpriteName } from '../config/sprites';
import { TUNING } from '../config/tuning';
import { spriteImage } from '../render/sprites';

/**
 * Makes the pixel sprites available to CSS as `--icon-heart`, `--icon-coin` and
 * so on, so menus and the HUD show exactly the pictures the game draws.
 */
export function installIcons(): void {
  for (const name of Object.keys(SPRITES) as SpriteName[]) {
    const url = spriteImage(SPRITES[name]).toDataURL();
    document.documentElement.style.setProperty(`--icon-${kebab(name)}`, `url("${url}")`);
  }
}

/** Fills `element` with pixel hearts: full ones for lives, empty ones for the slots left. Rebuilt only on a change. */
export function showHearts(element: HTMLElement, lives: number): void {
  if (element.dataset.lives === String(lives)) return;
  element.dataset.lives = String(lives);
  const slots = Math.max(TUNING.session.heartSlots, lives);
  const hearts = Array.from({ length: slots }, (_, i) => {
    const heart = document.createElement('span');
    heart.className = i < lives ? 'icon-heart' : 'icon-heart empty';
    return heart;
  });
  element.replaceChildren(...hearts);
  element.setAttribute('aria-label', `${lives} lives`);
}

function kebab(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}
