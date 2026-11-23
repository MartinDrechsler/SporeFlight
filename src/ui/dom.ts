/** Looks up an element that must exist in index.html. A missing id is a bug, so fail loudly. */
export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id} in index.html`);
  return element as T;
}

export function setText(element: HTMLElement, value: string | number): void {
  const text = String(value);
  // Skip identical writes so per-frame callers stay cheap.
  if (element.textContent !== text) element.textContent = text;
}

/** Small element builder for lists rendered from data. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

export function button(label: string, className: string, onClick: (() => void) | null): HTMLButtonElement {
  const b = el('button', className, label);
  b.type = 'button';
  b.disabled = onClick === null;
  if (onClick) b.addEventListener('click', onClick);
  return b;
}

export function starText(stars: number): string {
  return '★'.repeat(stars) + '☆'.repeat(3 - stars);
}
