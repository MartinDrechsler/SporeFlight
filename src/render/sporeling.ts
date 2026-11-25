import { INK } from './face';
import { hash } from './color';

/**
 * A sporeling: a lost little creature of the Mother Tree. Its own design, not
 * a small mushroom: a round, softly glowing ball with two little eyes, pink
 * cheeks and a tiny mouth, in a pastel colour of its own.
 */
const COLORS = ['#ffd6e8', '#d8f5ff', '#fff1c2', '#e3d9ff', '#d4ffe6'] as const;

/** The colour for a sporeling, picked by a number that stays the same for it. */
export function sporelingColor(seed: number): string {
  return COLORS[Math.floor(hash(seed) * COLORS.length)]!;
}

export interface SporelingLook {
  color: string;
  /** Waiting to be rescued (looking up, hopeful) or rescued (happy, eyes closed in a smile). */
  rescued: boolean;
  /** -1 to 1: where it looks sideways. */
  gaze: number;
}

/** Draws a sporeling of radius `r` centred on (x, y). */
export function drawSporeling(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, look: SporelingLook): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = look.color;
  ctx.shadowBlur = r * 1.4;
  ctx.fillStyle = look.color;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = Math.max(1, r * 0.12);
  ctx.strokeStyle = INK;
  ctx.stroke();

  // A soft shine on top keeps it round.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.35, -r * 0.45, r * 0.25, r * 0.14, -0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(245, 120, 140, 0.55)';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * r * 0.5, r * 0.25, r * 0.16, r * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const eyeX = r * 0.3;
  const eyeY = -r * 0.05;
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    if (look.rescued) {
      // Happy arcs.
      ctx.beginPath();
      ctx.moveTo(side * eyeX - r * 0.12, eyeY + r * 0.04);
      ctx.quadraticCurveTo(side * eyeX, eyeY - r * 0.12, side * eyeX + r * 0.12, eyeY + r * 0.04);
      ctx.stroke();
    } else {
      // Big hopeful eyes looking up, with a shine.
      const ex = side * eyeX + look.gaze * r * 0.08;
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.ellipse(ex, eyeY - r * 0.04, r * 0.13, r * 0.17, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex - r * 0.04, eyeY - r * 0.12, r * 0.05, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.strokeStyle = INK;
  ctx.beginPath();
  if (look.rescued) {
    ctx.moveTo(-r * 0.12, r * 0.22);
    ctx.quadraticCurveTo(0, r * 0.36, r * 0.12, r * 0.22);
  } else {
    ctx.arc(0, r * 0.3, r * 0.06, 0, Math.PI * 2);
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * The rescued sporelings, following the mushroom in a little line behind it,
 * each bobbing a bit and lagging further the further back it is.
 */
export function drawRescued(ctx: CanvasRenderingContext2D, x: number, y: number, vy: number, count: number, time: number): void {
  const r = 7;
  for (let i = Math.min(count, 8) - 1; i >= 0; i--) {
    const back = i + 1;
    const bx = x - 26 - back * 17;
    const by = y + 6 - vy * 0.035 * back + Math.sin(time * 5 + i * 1.3) * 3;
    drawSporeling(ctx, bx, by, r, { color: sporelingColor(i + 1), rescued: true, gaze: 0 });
  }
}
