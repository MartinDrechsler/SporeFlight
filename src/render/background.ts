import type { Theme } from '../config/theme';

/**
 * The forest behind the action. It has no state of its own: every layer's
 * position is derived from the total distance scrolled, so it can never
 * drift out of sync with the game.
 */
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  width: number,
  height: number,
  groundY: number,
  distance: number,
  time: number,
): void {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, theme.skyTop);
  sky.addColorStop(1, theme.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  drawSpores(ctx, theme, width, groundY, distance * 0.15, time);
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

/** Glowing spores drifting in the air. Positions come from a fixed pattern, not randomness. */
function drawSpores(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  width: number,
  groundY: number,
  offset: number,
  time: number,
): void {
  const count = 28;
  ctx.fillStyle = theme.spore;
  for (let i = 0; i < count; i++) {
    const seedX = (i * 97.3) % 1;
    const seedY = (i * 61.7) % 1;
    const x = (((seedX * width * 1.5 - offset) % (width * 1.5)) + width * 1.5) % (width * 1.5);
    const y = seedY * groundY * 0.9 + Math.sin(time * 0.8 + i) * 6;
    const size = 1 + (i % 3);
    ctx.globalAlpha = 0.35 + 0.35 * Math.sin(time * 1.7 + i * 2.1) ** 2;
    ctx.beginPath();
    ctx.arc(x - width * 0.25, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawGround(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  width: number,
  height: number,
  groundY: number,
  distance: number,
): void {
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, groundY, width, height - groundY);

  ctx.strokeStyle = theme.groundGlow;
  ctx.lineWidth = 3;
  ctx.shadowColor = theme.groundGlow;
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
