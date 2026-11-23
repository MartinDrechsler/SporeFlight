import type { Theme } from '../config/theme';
import { gapBottom, gapTop, type Root } from '../gameplay/roots';
import type { Pickup } from '../gameplay/spawner';
import { TUNING } from '../config/tuning';

const CAP_HEIGHT = 18;

export function drawRoot(ctx: CanvasRenderingContext2D, root: Root, theme: Theme, groundY: number, time: number): void {
  const top = gapTop(root);
  const bottom = gapBottom(root);
  drawColumn(ctx, theme, root.x, 0, root.width, top, 'down', time);
  drawColumn(ctx, theme, root.x, bottom, root.width, groundY - bottom, 'up', time);
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
    const vy = y + step;
    const vx = midX + Math.sin(step * 0.05 + time * 1.5) * 6;
    if (step === 0) ctx.moveTo(vx, vy);
    else ctx.lineTo(vx, vy);
  }
  ctx.stroke();

  // Wider cap at the tip, facing the gap.
  const capY = tipFacing === 'down' ? y + height - CAP_HEIGHT : y;
  ctx.fillStyle = theme.rootLight;
  ctx.strokeStyle = theme.groundGlow;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x - 2, capY, width + 4, CAP_HEIGHT, 8);
  ctx.fill();
  ctx.stroke();
}

export function drawPickup(ctx: CanvasRenderingContext2D, pickup: Pickup, time: number): void {
  const r = TUNING.pickups.radius;
  const bob = Math.sin(time * 4 + pickup.x * 0.05) * 3;
  const y = pickup.y + bob;
  ctx.save();
  ctx.translate(pickup.x, y);

  if (pickup.kind === 'coin') {
    // Spinning coin: squash horizontally over time.
    ctx.scale(Math.max(0.25, Math.abs(Math.cos(time * 3))), 1);
    ctx.shadowColor = '#ffd23f';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#b8860b';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.rotate(time * 1.5);
    ctx.shadowColor = '#3fd8ff';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#3fd8ff';
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.3);
    ctx.lineTo(r, 0);
    ctx.lineTo(0, r * 1.3);
    ctx.lineTo(-r, 0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
