import type { LevelConfig } from '../config/levels';

/**
 * How the world is shown. The flight rules never change; a twist level only
 * mirrors the picture: 'upsideDown' puts the ground on top (you fall up and a
 * tap pushes you down), 'backwards' makes you fly from right to left.
 */
export type View = LevelConfig['view'];

/** Mirrors the canvas so the world can be drawn in its own coordinates. */
export function applyView(ctx: CanvasRenderingContext2D, view: View, width: number, height: number): void {
  if (view === 'upsideDown') ctx.transform(1, 0, 0, -1, 0, height);
  if (view === 'backwards') ctx.transform(-1, 0, 0, 1, width, 0);
}

/** Where a point of the world appears on the screen. */
export function toScreen(view: View, width: number, height: number, x: number, y: number): { x: number; y: number } {
  if (view === 'upsideDown') return { x, y: height - y };
  if (view === 'backwards') return { x: width - x, y };
  return { x, y };
}
