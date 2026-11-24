import type { Sprite } from '../config/sprites';

const images = new Map<Sprite, HTMLCanvasElement>();

/** The sprite as a tiny image, one canvas pixel per sprite pixel; made once, then reused. */
export function spriteImage(sprite: Sprite): HTMLCanvasElement {
  let image = images.get(sprite);
  if (image) return image;
  image = document.createElement('canvas');
  image.width = Math.max(...sprite.rows.map((row) => row.length));
  image.height = sprite.rows.length;
  const ctx = image.getContext('2d');
  if (ctx) {
    sprite.rows.forEach((row, y) => {
      [...row].forEach((key, x) => {
        const color = sprite.palette[key];
        if (!color) return;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      });
    });
  }
  images.set(sprite, image);
  return image;
}

/** Draws a sprite centred on (x, y), `size` px wide, with crisp square pixels. */
export function drawSprite(ctx: CanvasRenderingContext2D, sprite: Sprite, x: number, y: number, size: number): void {
  const image = spriteImage(sprite);
  const height = (size * image.height) / image.width;
  const smoothing = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, x - size / 2, y - height / 2, size, height);
  ctx.imageSmoothingEnabled = smoothing;
}
