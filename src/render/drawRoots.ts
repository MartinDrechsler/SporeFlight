import type { Theme } from '../config/theme';
import { TUNING } from '../config/tuning';
import { pickupPosition, type Pickup } from '../gameplay/pickups';
import { gapBottom, gapTop, rootLeft, type Root } from '../gameplay/roots';
import type { WindZone } from '../gameplay/wind';

const CAP_HEIGHT = 18;

export function drawRoot(ctx: CanvasRenderingContext2D, root: Root, theme: Theme, groundY: number, time: number): void {
  const x = rootLeft(root);
  drawColumn(ctx, theme, x, 0, root.width, gapTop(root), 'down', time);
  drawColumn(ctx, theme, x, gapBottom(root), root.width, groundY - gapBottom(root), 'up', time);
}

/** One root column. `tipFacing` is the end that points into the gap. */
function drawColumn(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  x: number,
  y: number,
  width: number,
  height: number,
  tipFacing: 'up' | 'down',
  time: number,
): void {
  if (height <= 0) return;
  const body = ctx.createLinearGradient(x, 0, x + width, 0);
  body.addColorStop(0, theme.rootDark);
  body.addColorStop(0.45, theme.rootLight);
  body.addColorStop(1, theme.rootDark);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.roundRect(x + 4, y, width - 8, height, 6);
  ctx.fill();

  // Glowing vein running along the column.
  ctx.strokeStyle = theme.rootVein;
  ctx.lineWidth = 2;
  ctx.beginPath();
  const midX = x + width / 2;
  for (let step = 0; step <= height; step += 10) {
    const vx = midX + Math.sin(step * 0.05 + time * 1.5) * Math.min(6, width * 0.1);
    if (step === 0) ctx.moveTo(vx, y + step);
    else ctx.lineTo(vx, y + step);
  }
  ctx.stroke();

  // Wider cap at the tip, facing the gap.
  const capY = tipFacing === 'down' ? y + height - CAP_HEIGHT : y;
  ctx.fillStyle = theme.rootLight;
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x - 2, capY, width + 4, CAP_HEIGHT, 8);
  ctx.fill();
  ctx.stroke();
}

export function drawPickup(ctx: CanvasRenderingContext2D, pickup: Pickup, time: number): void {
  const r = TUNING.pickups.radius;
  const { x, y: baseY } = pickupPosition(pickup);
  const y = baseY + Math.sin(time * 4 + x * 0.05) * 3;
  ctx.save();
  ctx.translate(x, y);

  switch (pickup.kind) {
    case 'coin':
      ctx.scale(Math.max(0.25, Math.abs(Math.cos(time * 3))), 1);
      glow(ctx, '#ffd23f', 12);
      ctx.fillStyle = '#ffd23f';
      circle(ctx, 0, 0, r);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#b8860b';
      circle(ctx, 0, 0, r * 0.45);
      break;
    case 'diamond':
      ctx.rotate(time * 1.5);
      glow(ctx, '#3fd8ff', 16);
      ctx.fillStyle = '#3fd8ff';
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.3);
      ctx.lineTo(r, 0);
      ctx.lineTo(0, r * 1.3);
      ctx.lineTo(-r, 0);
      ctx.closePath();
      ctx.fill();
      break;
    case 'shield':
      glow(ctx, '#00baff', 14);
      ctx.strokeStyle = '#00baff';
      ctx.fillStyle = 'rgba(0, 186, 255, 0.25)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.2);
      ctx.lineTo(r, -r * 0.6);
      ctx.quadraticCurveTo(r, r * 0.7, 0, r * 1.2);
      ctx.quadraticCurveTo(-r, r * 0.7, -r, -r * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case 'magnet':
      glow(ctx, '#00e5ff', 14);
      ctx.strokeStyle = '#ff3c69';
      ctx.lineWidth = 5;
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.arc(0, -r * 0.1, r * 0.8, Math.PI, 0, true);
      ctx.stroke();
      ctx.strokeStyle = '#e8f6ff';
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, -r * 0.1);
      ctx.lineTo(-r * 0.8, -r * 0.7);
      ctx.moveTo(r * 0.8, -r * 0.1);
      ctx.lineTo(r * 0.8, -r * 0.7);
      ctx.stroke();
      break;
  }
  ctx.restore();
}

/** A soft vertical band with particles streaming up (updraft) or down (downdraft). */
export function drawWind(ctx: CanvasRenderingContext2D, zone: WindZone, groundY: number, time: number): void {
  const rgb = zone.kind === 'updraft' ? '0, 242, 195' : '255, 60, 105';
  const band = ctx.createLinearGradient(zone.x, 0, zone.x + zone.width, 0);
  band.addColorStop(0, `rgba(${rgb}, 0)`);
  band.addColorStop(0.5, `rgba(${rgb}, 0.1)`);
  band.addColorStop(1, `rgba(${rgb}, 0)`);
  ctx.fillStyle = band;
  ctx.fillRect(zone.x, 0, zone.width, groundY);

  ctx.fillStyle = `rgba(${rgb}, 0.5)`;
  const direction = zone.kind === 'updraft' ? -1 : 1;
  for (let i = 0; i < 15; i++) {
    const speed = 90 + ((i * 53) % 150);
    const travel = (((time * speed * direction + i * 211) % groundY) + groundY) % groundY;
    const px = zone.x + ((i * 0.618) % 1) * zone.width;
    circle(ctx, px, travel, 1 + (i % 3));
  }
}

function glow(ctx: CanvasRenderingContext2D, color: string, blur: number): void {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}
