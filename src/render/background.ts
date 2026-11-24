import type { Theme } from '../config/theme';
import { TUNING } from '../config/tuning';
import type { Biome } from '../config/biomes';
import { drawLife, drawScenery } from './scenery';

export interface BackgroundView {
  theme: Theme;
  width: number;
  height: number;
  groundY: number;
  distance: number;
  time: number;
  /** Endless only: the biomes being travelled through; null in a level (theme colours only). */
  journey: { from: Biome; to: Biome; t: number } | null;
}

/**
 * The forest behind the action. It keeps no state: every layer's position is
 * derived from the distance scrolled, so it can never drift out of sync.
 */
export function drawBackground(ctx: CanvasRenderingContext2D, view: BackgroundView): void {
  const { theme, width, height, groundY, distance, time } = view;
  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, theme.sky[0]);
  sky.addColorStop(0.5, theme.sky[1]);
  sky.addColorStop(1, theme.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  const journey = view.journey;
  const scenery = { width, groundY, distance, time, colors: theme };
  if (journey) {
    // One biome fades out while the next fades in; outside a change both are the same.
    if (journey.from !== journey.to) {
      drawScenery(ctx, journey.from.scenery, 1 - journey.t, scenery);
      drawLife(ctx, journey.from.life, 1 - journey.t, scenery);
    }
    drawScenery(ctx, journey.to.scenery, journey.t, scenery);
    drawLife(ctx, journey.to.life, journey.t, scenery);
  } else {
    drawLife(ctx, 'spores', 1, scenery);
  }
  drawHills(ctx, theme.hillsFar, width, groundY, distance * 0.2, 110, 0.55);
  drawHills(ctx, theme.hillsNear, width, groundY, distance * 0.45, 70, 0.35);
  drawGround(ctx, theme, width, height, groundY, distance);
}

function drawHills(
  ctx: CanvasRenderingContext2D,
  color: string,
  width: number,
  groundY: number,
  offset: number,
  peak: number,
  spacingFactor: number,
): void {
  const spacing = Math.max(80, width * spacingFactor);
  const shift = offset % spacing;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  for (let x = -shift - spacing; x <= width + spacing; x += spacing) {
    ctx.quadraticCurveTo(x + spacing / 2, groundY - peak, x + spacing, groundY);
  }
  ctx.lineTo(width, groundY);
  ctx.closePath();
  ctx.fill();
}

function drawGround(ctx: CanvasRenderingContext2D, theme: Theme, width: number, height: number, groundY: number, distance: number): void {
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, groundY, width, height - groundY);
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 3;
  ctx.shadowColor = theme.accent;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  for (let x = 0; x <= width; x += 8) {
    const y = groundY + Math.sin((x + distance) * 0.025) * 3;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
}

/**
 * A clump of small mushrooms grows wherever a recent round ended. Crashes
 * close together grow into one bigger clump, so trouble spots stand out.
 */
export function drawDeathMarks(
  ctx: CanvasRenderingContext2D,
  marks: readonly number[],
  newMark: { at: number; grow: number } | null,
  width: number,
  groundY: number,
  distance: number,
  time: number,
): void {
  const all = newMark ? [...marks, newMark.at] : marks;
  for (const clump of groupClumps(all)) {
    const x = clump.at - distance;
    if (x < -40 || x > width + 40) continue;
    const isNew = newMark !== null && Math.abs(newMark.at - clump.at) <= TUNING.session.clumpRadius;
    // A brand-new clump sprouts from the ground; one that joins an old clump swells into the bigger size.
    const grow = !isNew ? 1 : clump.count === 1 ? easeOut(newMark.grow) : 0.75 + 0.25 * easeOut(newMark.grow);
    drawClump(ctx, x, groundY, clump.count, time, grow);
  }
}

function easeOut(t: number): number {
  return 1 - (1 - t) ** 3;
}

interface Clump {
  at: number;
  count: number;
}

/** Groups crash spots that lie within the clump radius of each other. */
export function groupClumps(marks: readonly number[]): Clump[] {
  const sorted = [...marks].sort((a, b) => a - b);
  const clumps: Clump[] = [];
  for (const mark of sorted) {
    const last = clumps.at(-1);
    if (last && mark - last.at <= TUNING.session.clumpRadius) {
      last.at = (last.at * last.count + mark) / (last.count + 1);
      last.count += 1;
    } else {
      clumps.push({ at: mark, count: 1 });
    }
  }
  return clumps;
}

/** Up to five little mushrooms of varied height, gently swaying. */
function drawClump(ctx: CanvasRenderingContext2D, x: number, groundY: number, count: number, time: number, grow: number): void {
  if (grow <= 0) return;
  const caps = Math.min(5, count + 1);
  const scale = Math.min(1.6, 0.8 + count * 0.2) * grow;
  for (let i = 0; i < caps; i++) {
    const offset = (i - (caps - 1) / 2) * 9 * scale;
    const height = (8 + ((i * 7) % 3) * 4) * scale;
    const sway = Math.sin(time * 1.5 + i + x * 0.01) * 1.5;
    const mx = x + offset + sway;
    ctx.fillStyle = '#f2ead8';
    ctx.fillRect(mx - 1.5 * scale, groundY - height, 3 * scale, height);
    ctx.fillStyle = i % 2 === 0 ? '#e02476' : '#ff5e9c';
    ctx.beginPath();
    ctx.ellipse(mx, groundY - height, 5.5 * scale, 4.5 * scale, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = 'rgba(0, 242, 195, 0.8)';
    ctx.beginPath();
    ctx.arc(mx - 1.5 * scale, groundY - height - 2 * scale, 1 * scale, 0, Math.PI * 2);
    ctx.fill();
  }
}
