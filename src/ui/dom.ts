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
