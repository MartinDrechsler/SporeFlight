import forest1 from '../assets/forest-1.webp';
import forest2 from '../assets/forest-2.webp';

/**
 * Painted images drawn on the canvas. They load in the background; until an
 * image is ready, drawing code simply skips it, so the game never waits.
 */
export type ImageName = 'forest-1' | 'forest-2';

const SOURCES: Record<ImageName, string> = { 'forest-1': forest1, 'forest-2': forest2 };
const cache = new Map<ImageName, HTMLImageElement>();

export function preloadImages(): void {
  for (const name of Object.keys(SOURCES) as ImageName[]) {
    const image = new Image();
    image.src = SOURCES[name];
    cache.set(name, image);
  }
}

/** The image if it has finished loading, otherwise null. */
export function readyImage(name: ImageName): HTMLImageElement | null {
  const image = cache.get(name);
  return image && image.complete && image.naturalWidth > 0 ? image : null;
}
