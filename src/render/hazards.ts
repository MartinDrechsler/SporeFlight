import { TUNING } from '../config/tuning';
import { stalactiteBox, type Hazard } from '../gameplay/hazards';

const H = TUNING.hazards;

/** Draws the bats and stalactites between the roots. */
export function drawHazard(ctx: CanvasRenderingContext2D, hazard: Hazard, time: number): void {
  if (hazard.kind === 'bat') drawBat(ctx, hazard.x, hazard.y, H.batRadius, time + hazard.phase, '#ff4d6d');
  else drawStalactite(ctx, hazard, time);
}

/**
 * A bat: a dark round body, two pointed ears, and wings that beat. Its eyes
 * glow, so it is seen even in the dark. Used between roots and by the Bat Queen.
 */
export function drawBat(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, time: number, eyes: string): void {
  const beat = Math.sin(time * 14);
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#1a1026';
  ctx.strokeStyle = '#3d2a5c';
  ctx.lineWidth = 1.5;
  for (const side of [-1, 1]) {
    // A wing: three scallops from the shoulder to the tip.
    const tipY = -r * 0.9 * beat;
    ctx.beginPath();
    ctx.moveTo(side * r * 0.5, -r * 0.2);
    ctx.lineTo(side * r * 2.3, tipY - r * 0.3);
    ctx.quadraticCurveTo(side * r * 1.9, tipY + r * 0.45, side * r * 1.6, tipY * 0.6 + r * 0.4);
    ctx.quadraticCurveTo(side * r * 1.2, tipY * 0.4 + r * 0.7, side * r * 0.9, r * 0.45);
    ctx.quadraticCurveTo(side * r * 0.7, r * 0.6, side * r * 0.4, r * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.75, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * r * 0.25, -r * 0.6);
    ctx.lineTo(side * r * 0.5, -r * 1.15);
    ctx.lineTo(side * r * 0.65, -r * 0.45);
    ctx.fill();
  }
  ctx.fillStyle = eyes;
  ctx.shadowColor = eyes;
  ctx.shadowBlur = 8;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(side * r * 0.28, -r * 0.1, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** A stalactite: a pale stone fang. Dripping, it trembles and drops of water fall from its tip. */
function drawStalactite(ctx: CanvasRenderingContext2D, hazard: Extract<Hazard, { kind: 'stalactite' }>, time: number): void {
  const box = stalactiteBox(hazard);
  const shake = hazard.state === 'dripping' ? Math.sin(time * 60) * 1.5 : 0;
  const x = hazard.x + shake;
  ctx.save();
  const g = ctx.createLinearGradient(0, box.y, 0, box.y + box.h);
  g.addColorStop(0, '#3a4a5c');
  g.addColorStop(1, '#9fb8cc');
  ctx.fillStyle = g;
  ctx.strokeStyle = 'rgba(127, 230, 255, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - box.w / 2 - 6, box.y);
  ctx.lineTo(x + box.w / 2 + 6, box.y);
  ctx.lineTo(x + box.w * 0.2, box.y + box.h * 0.6);
  ctx.lineTo(x, box.y + box.h);
  ctx.lineTo(x - box.w * 0.25, box.y + box.h * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (hazard.state === 'dripping') {
    // Drops falling from the tip, one after another.
    ctx.fillStyle = '#9ff0ff';
    ctx.shadowColor = '#7fe6ff';
    ctx.shadowBlur = 6;
    for (let i = 0; i < 3; i++) {
      const fall = ((time * 1.6 + i / 3) % 1) * 120;
      ctx.globalAlpha = 1 - fall / 120;
      ctx.beginPath();
      ctx.ellipse(x, box.y + box.h + 4 + fall, 2, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
