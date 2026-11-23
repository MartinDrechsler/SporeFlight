import { byId } from './dom';

const SHOW_MS = 3200;
const queue: string[] = [];
let showing = false;

/** A banner at the top of the screen, e.g. for an unlocked badge. Messages queue up. */
export function toast(message: string): void {
  queue.push(message);
  if (!showing) showNext();
}

function showNext(): void {
  const message = queue.shift();
  const element = byId('toast');
  if (message === undefined) {
    showing = false;
    element.hidden = true;
    return;
  }
  showing = true;
  element.textContent = message;
  element.hidden = false;
  element.classList.remove('show');
  void element.offsetWidth; // restart the slide-in animation
  element.classList.add('show');
  setTimeout(showNext, SHOW_MS);
}
