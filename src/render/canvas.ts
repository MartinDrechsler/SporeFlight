/**
 * Keeps the canvas sharp on high-density phone screens. Everything else draws
 * in CSS pixels and never needs to think about devicePixelRatio.
 */
export interface Surface {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
}

export function createSurface(canvas: HTMLCanvasElement): Surface {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is not supported on this device.');
  const surface: Surface = { ctx, width: 0, height: 0 };
  resizeSurface(canvas, surface);
  return surface;
}

export function resizeSurface(canvas: HTMLCanvasElement, surface: Surface): void {
  const ratio = Math.min(window.devicePixelRatio || 1, 3);
  surface.width = canvas.clientWidth;
  surface.height = canvas.clientHeight;
  canvas.width = Math.round(surface.width * ratio);
  canvas.height = Math.round(surface.height * ratio);
  surface.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}
