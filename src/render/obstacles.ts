import type { ObstacleStyle } from '../config/biomes';
import type { Theme } from '../config/theme';
import { hash, rgbOf } from './color';

export const CAP_HEIGHT = 18;

/**
 * One obstacle column in a biome's style. Everything is drawn inside the
 * column's collision box, so what you see is exactly what you can hit.
 * `tip` is the end that points into the gap; `seed` keeps details stable.
 */
export interface Column {
  x: number;
  y: number;
  width: number;
  height: number;
  tip: 'up' | 'down';
  seed: number;
}

export function drawColumn(ctx: CanvasRenderingContext2D, style: ObstacleStyle, colors: Theme, column: Column, time: number): void {
  if (column.height <= 0) return;
  ctx.save();
  switch (style) {
    case 'glow':
      glowBody(ctx, colors, column, time);
      break;
    case 'mossy':
      glowBody(ctx, colors, column, time);
      moss(ctx, column);
      break;
    case 'trunk':
      trunk(ctx, colors, column);
      break;
    case 'post':
      post(ctx, colors, column);
      break;
    case 'branch':
      branch(ctx, colors, column);
      break;
    case 'sandstone':
      sandstone(ctx, colors, column);
      break;
    case 'spire':
      spire(ctx, colors, column);
      break;
    case 'ice':
      ice(ctx, colors, column);
      break;
  }
  ctx.restore();
}

/** The cap's place: at the tip, facing the gap. */
function capY(column: Column): number {
  return column.tip === 'down' ? column.y + column.height - CAP_HEIGHT : column.y;
}

/** A thin glowing edge on the cap, so the gap reads clearly in every biome. */
function capEdge(ctx: CanvasRenderingContext2D, colors: Theme, column: Column, alpha: number): void {
  ctx.strokeStyle = `rgba(${rgbOf(colors.accent)}, ${alpha})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(column.x - 2, capY(column), column.width + 4, CAP_HEIGHT, 8);
  ctx.stroke();
}

function sideGradient(ctx: CanvasRenderingContext2D, column: Column, dark: string, light: string): CanvasGradient {
  const g = ctx.createLinearGradient(column.x, 0, column.x + column.width, 0);
  g.addColorStop(0, dark);
  g.addColorStop(0.45, light);
  g.addColorStop(1, dark);
  return g;
}

/** Glowing forest roots with a living vein (the dark forest). */
function glowBody(ctx: CanvasRenderingContext2D, colors: Theme, column: Column, time: number): void {
  const { x, y, width, height } = column;
  ctx.fillStyle = sideGradient(ctx, column, colors.rootDark, colors.rootLight);
  ctx.beginPath();
  ctx.roundRect(x + 4, y, width - 8, height, 6);
  ctx.fill();

  ctx.strokeStyle = colors.rootVein;
  ctx.lineWidth = 2;
  ctx.beginPath();
  const midX = x + width / 2;
  for (let step = 0; step <= height; step += 10) {
    const vx = midX + Math.sin(step * 0.05 + time * 1.5) * Math.min(6, width * 0.1);
    if (step === 0) ctx.moveTo(vx, y + step);
    else ctx.lineTo(vx, y + step);
  }
  ctx.stroke();

  ctx.fillStyle = colors.rootLight;
  ctx.strokeStyle = colors.accent;
  ctx.beginPath();
  ctx.roundRect(x - 2, capY(column), width + 4, CAP_HEIGHT, 8);
  ctx.fill();
  ctx.stroke();
}

/** Moss cushions on the cap and patches down the root (twilight woods). */
function moss(ctx: CanvasRenderingContext2D, column: Column): void {
  const cy = capY(column);
  ctx.fillStyle = '#6fa83a';
  for (let i = 0; i < 5; i++) {
    const mx = column.x + 4 + (column.width - 8) * (i / 4);
    const my = column.tip === 'up' ? cy + 4 : cy + CAP_HEIGHT - 4;
    ctx.beginPath();
    ctx.ellipse(mx, my, 6 + hash(column.seed + i) * 4, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(111, 168, 58, 0.55)';
  for (let i = 0; i < 4; i++) {
    const py = column.y + hash(column.seed * 3 + i) * Math.max(0, column.height - CAP_HEIGHT);
    ctx.beginPath();
    ctx.ellipse(column.x + 8 + hash(column.seed + i * 7) * (column.width - 16), py, 7, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Tree trunks with bark, knots and climbing ivy (morning woodland). */
function trunk(ctx: CanvasRenderingContext2D, colors: Theme, column: Column): void {
  const { x, y, width, height } = column;
  ctx.fillStyle = sideGradient(ctx, column, colors.rootDark, colors.rootLight);
  ctx.fillRect(x + 3, y, width - 6, height);
  ctx.strokeStyle = colors.rootDark;
  ctx.lineWidth = 2;
  for (let i = 1; i < 4; i++) {
    const gx = x + (width * i) / 4;
    ctx.beginPath();
    for (let step = 0; step <= height; step += 12) {
      const wx = gx + Math.sin(step * 0.04 + i * 2 + column.seed) * 2.5;
      if (step === 0) ctx.moveTo(wx, y + step);
      else ctx.lineTo(wx, y + step);
    }
    ctx.stroke();
  }
  ctx.fillStyle = colors.rootDark;
  for (let i = 0; i < 2; i++) {
    const ky = y + 30 + hash(column.seed + i * 5) * Math.max(0, height - 60);
    ctx.beginPath();
    ctx.ellipse(x + width * (0.3 + 0.4 * hash(column.seed + i)), ky, 5, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Ivy climbing up the trunk.
  ctx.strokeStyle = colors.rootVein;
  ctx.fillStyle = colors.rootVein;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let step = 0; step <= height; step += 8) {
    const vx = x + width * 0.5 + Math.sin(step * 0.08 + column.seed) * (width * 0.3);
    if (step === 0) ctx.moveTo(vx, y + step);
    else ctx.lineTo(vx, y + step);
    if (step % 32 === 0) ctx.ellipse(vx + 4, y + step, 4, 2.5, 0.5, 0, Math.PI * 2);
  }
  ctx.stroke();
  // Sawn end with rings at the tip.
  const cy = capY(column);
  ctx.fillStyle = colors.rootLight;
  ctx.beginPath();
  ctx.roundRect(x - 2, cy, width + 4, CAP_HEIGHT, 5);
  ctx.fill();
  ctx.strokeStyle = colors.rootDark;
  ctx.beginPath();
  ctx.ellipse(x + width / 2, cy + CAP_HEIGHT / 2, width * 0.3, CAP_HEIGHT * 0.25, 0, 0, Math.PI * 2);
  ctx.stroke();
  capEdge(ctx, colors, column, 0.45);
}

/** Wooden fence posts topped by a hedge (sunlit meadow). */
function post(ctx: CanvasRenderingContext2D, colors: Theme, column: Column): void {
  const { x, y, width, height } = column;
  ctx.fillStyle = sideGradient(ctx, column, colors.rootDark, colors.rootLight);
  ctx.fillRect(x + 6, y, width - 12, height);
  ctx.strokeStyle = colors.rootDark;
  ctx.lineWidth = 1.5;
  for (let py = y + 22; py < y + height - CAP_HEIGHT; py += 26) {
    ctx.beginPath();
    ctx.moveTo(x + 6, py);
    ctx.lineTo(x + width - 6, py);
    ctx.stroke();
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(x + 10, py - 6, 2.5, 2.5);
    ctx.fillRect(x + width - 13, py - 6, 2.5, 2.5);
  }
  // A hedge cushion forms the cap.
  const cy = capY(column);
  ctx.fillStyle = colors.rootVein;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(x + 2 + (width - 4) * (i / 4), cy + CAP_HEIGHT / 2, CAP_HEIGHT * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#e85a8a';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(x + 8 + (width - 16) * hash(column.seed + i), cy + 4 + hash(column.seed * 2 + i) * (CAP_HEIGHT - 8), 2, 0, Math.PI * 2);
    ctx.fill();
  }
  capEdge(ctx, colors, column, 0.35);
}

/** Pale dry branches with cracks and short twigs (dry savanna). */
function branch(ctx: CanvasRenderingContext2D, colors: Theme, column: Column): void {
  const { x, y, width, height } = column;
  ctx.fillStyle = sideGradient(ctx, column, colors.rootDark, colors.rootLight);
  ctx.beginPath();
  ctx.roundRect(x + 5, y, width - 10, height, 10);
  ctx.fill();
  ctx.strokeStyle = colors.rootDark;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < Math.floor(height / 40); i++) {
    const cy = y + 20 + i * 40;
    const cx = x + 10 + hash(column.seed + i) * (width - 20);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + 6, cy + 10);
    ctx.lineTo(cx + 2, cy + 18);
    ctx.stroke();
    // A twig, staying within the column's edge.
    ctx.lineWidth = 3;
    ctx.beginPath();
    const side = i % 2 === 0 ? 1 : -1;
    const sx = side > 0 ? x + width - 6 : x + 6;
    ctx.moveTo(sx, cy + 8);
    ctx.lineTo(sx + side * 4, cy);
    ctx.stroke();
    ctx.lineWidth = 1.5;
  }
  const cy = capY(column);
  ctx.fillStyle = colors.rootLight;
  ctx.beginPath();
  ctx.moveTo(x - 1, cy + CAP_HEIGHT / 2);
  for (let i = 0; i <= 6; i++) ctx.lineTo(x + (width * i) / 6, cy + (i % 2 ? 2 : CAP_HEIGHT - 2));
  ctx.lineTo(x + width + 1, cy + CAP_HEIGHT / 2);
  ctx.closePath();
  ctx.fill();
  capEdge(ctx, colors, column, 0.35);
}

/** Layered sandstone pillars (desert canyon). */
function sandstone(ctx: CanvasRenderingContext2D, colors: Theme, column: Column): void {
  const { x, y, width, height } = column;
  const bands = [colors.rootDark, colors.rootLight, colors.rootVein, colors.rootLight];
  let band = 0;
  for (let py = y; py < y + height; ) {
    const h = 14 + hash(column.seed + band) * 14;
    const inset = 2 + hash(column.seed * 5 + band) * 4;
    ctx.fillStyle = bands[band % bands.length]!;
    ctx.fillRect(x + inset, py, width - inset * 2, Math.min(h, y + height - py));
    py += h;
    band += 1;
  }
  const cy = capY(column);
  ctx.fillStyle = colors.rootVein;
  ctx.fillRect(x - 2, cy, width + 4, CAP_HEIGHT);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.fillRect(x - 2, column.tip === 'up' ? cy + CAP_HEIGHT - 5 : cy, width + 4, 5);
  capEdge(ctx, colors, column, 0.35);
}

/** Jagged grey rock spires, the caps dusted with the first snow (highland pass). */
function spire(ctx: CanvasRenderingContext2D, colors: Theme, column: Column): void {
  const { x, y, width, height } = column;
  ctx.fillStyle = sideGradient(ctx, column, colors.rootDark, colors.rootLight);
  ctx.beginPath();
  ctx.moveTo(x + 4, y);
  for (let py = y; py <= y + height; py += 18) ctx.lineTo(x + 2 + hash(column.seed + py) * 6, py);
  ctx.lineTo(x + 4, y + height);
  ctx.lineTo(x + width - 4, y + height);
  for (let py = y + height; py >= y; py -= 18) ctx.lineTo(x + width - 2 - hash(column.seed * 2 + py) * 6, py);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = colors.rootDark;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < Math.floor(height / 60); i++) {
    const cy = y + 30 + i * 60;
    ctx.beginPath();
    ctx.moveTo(x + width * 0.3, cy);
    ctx.lineTo(x + width * 0.55, cy + 14);
    ctx.lineTo(x + width * 0.45, cy + 26);
    ctx.stroke();
  }
  const cy = capY(column);
  ctx.fillStyle = colors.rootLight;
  ctx.fillRect(x - 2, cy, width + 4, CAP_HEIGHT);
  if (column.tip === 'up') {
    ctx.fillStyle = colors.rootVein;
    ctx.beginPath();
    ctx.moveTo(x - 2, cy + 6);
    for (let i = 0; i <= 5; i++) ctx.lineTo(x - 2 + ((width + 4) * i) / 5, cy + (i % 2 ? 9 : 4));
    ctx.lineTo(x + width + 2, cy);
    ctx.lineTo(x - 2, cy);
    ctx.closePath();
    ctx.fill();
  }
  capEdge(ctx, colors, column, 0.4);
}

/** Translucent ice pillars; short icicles stay inside the cap (frozen peaks). */
function ice(ctx: CanvasRenderingContext2D, colors: Theme, column: Column): void {
  const { x, y, width, height } = column;
  const body = ctx.createLinearGradient(x, 0, x + width, 0);
  body.addColorStop(0, `rgba(${rgbOf(colors.rootDark)}, 0.85)`);
  body.addColorStop(0.4, `rgba(${rgbOf(colors.rootLight)}, 0.9)`);
  body.addColorStop(1, `rgba(${rgbOf(colors.rootDark)}, 0.85)`);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.roundRect(x + 4, y, width - 8, height, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.fillRect(x + width * 0.3, y, 3, height);
  ctx.fillRect(x + width * 0.62, y, 1.5, height);

  const cy = capY(column);
  ctx.fillStyle = colors.rootVein;
  ctx.fillRect(x - 2, column.tip === 'down' ? cy : cy + 6, width + 4, CAP_HEIGHT - 6);
  if (column.tip === 'down') {
    // Icicles hang from the slab but end at the cap's edge.
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const ix = x - 2 + ((width + 4) * (i + 0.5)) / 7;
      ctx.moveTo(ix - 3, cy + CAP_HEIGHT - 6);
      ctx.lineTo(ix, cy + CAP_HEIGHT);
      ctx.lineTo(ix + 3, cy + CAP_HEIGHT - 6);
    }
    ctx.fill();
  } else {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) ctx.arc(x + (width * (i + 0.5)) / 5, cy + 6, 5, Math.PI, 0);
    ctx.fill();
  }
  capEdge(ctx, colors, column, 0.6);
}
