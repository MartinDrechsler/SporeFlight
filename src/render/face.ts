import type { Expression } from '../config/expressions';

export const INK = '#3b2522';
const SHINE = '#ffffff';
const BLUSH = '#f5a19d';
const TONGUE = '#f08a8a';
const SWEAT = '#8fd3ff';

/** Where the eyes look and whether they blink: the face's life on top of its expression. */
export interface Gaze {
  /** -1 left, 0 ahead, 1 right. */
  x: number;
  /** -1 up, 1 down; added to the expression's own look. */
  y: number;
  /** 0 open, 1 closed. */
  blink: number;
}

export const AHEAD: Gaze = { x: 0, y: 0, blink: 0 };

/**
 * Draws a face centred on (0, 0) for a mushroom of radius `r`. `skin` is the
 * colour around the eyes, so eyelids can cover them.
 */
export function drawFace(ctx: CanvasRenderingContext2D, r: number, face: Expression, gaze: Gaze, skin: string, line: number): void {
  const spread = r * 0.21;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = line;
  ctx.strokeStyle = INK;

  if (face.blush > 0) {
    ctx.globalAlpha = face.blush * 0.8;
    ctx.fillStyle = BLUSH;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(side * (spread + r * 0.12), r * 0.12, r * 0.08, r * 0.046, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  for (const side of [-1, 1]) drawEye(ctx, r, side * spread, face, gaze, skin, line);
  drawMouth(ctx, r, face);
  if (face.sweat) drawSweat(ctx, r);
}

function drawEye(ctx: CanvasRenderingContext2D, r: number, ex: number, face: Expression, gaze: Gaze, skin: string, line: number): void {
  const size = face.size;
  const w = r * 0.092;
  const shape = face.eyes === 'open' && gaze.blink > 0.8 ? 'shut' : face.eyes;

  if (shape === 'happy') {
    stroke(ctx, () => {
      ctx.moveTo(ex - w, r * 0.026);
      ctx.quadraticCurveTo(ex, -r * 0.105, ex + w, r * 0.026);
    });
  } else if (shape === 'shut') {
    stroke(ctx, () => {
      ctx.moveTo(ex - w, 0);
      ctx.quadraticCurveTo(ex, r * 0.05, ex + w, 0);
    });
  } else if (shape === 'cross') {
    const s = r * 0.075;
    stroke(ctx, () => {
      ctx.moveTo(ex - s, -s);
      ctx.lineTo(ex + s, s);
      ctx.moveTo(ex + s, -s);
      ctx.lineTo(ex - s, s);
    });
  } else {
    const rx = r * 0.085 * size;
    const ry = r * 0.112 * size * face.open * (1 - gaze.blink);
    const x = ex + gaze.x * r * 0.035;
    const y = (face.lookY + gaze.y) * r * 0.035;
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    // Two shines make the eyes look wet and alive.
    if (ry > rx * 0.5) {
      ctx.fillStyle = SHINE;
      ctx.beginPath();
      ctx.arc(x - r * 0.029 * size, y - ry * 0.38, r * 0.034 * size, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + r * 0.032 * size, y + ry * 0.35, r * 0.016 * size, 0, Math.PI * 2);
      ctx.fill();
    }
    // The upper lid hangs over the eye: skin above its edge, a line along it.
    if (face.lid > 0.01) {
      const top = y - ry;
      const edge = top + 2 * ry * face.lid;
      ctx.fillStyle = skin;
      ctx.fillRect(x - rx - line, top - line * 2, 2 * (rx + line), edge - top + line * 2);
      stroke(ctx, () => {
        ctx.moveTo(x - rx - line * 0.3, edge);
        ctx.lineTo(x + rx + line * 0.3, edge);
      });
    }
  }

  if (face.brows) {
    const side = Math.sign(ex);
    const y = -r * 0.2 * size + face.brows.raise * r;
    const half = r * 0.066;
    const tilt = face.brows.tilt * r;
    stroke(ctx, () => {
      ctx.moveTo(ex - side * half, y - tilt);
      ctx.lineTo(ex + side * half, y + tilt);
    });
  }
}

function drawMouth(ctx: CanvasRenderingContext2D, r: number, face: Expression): void {
  const m = r * 0.17;
  ctx.fillStyle = INK;
  switch (face.mouth) {
    case 'smile':
      stroke(ctx, () => {
        ctx.moveTo(-r * 0.08, m);
        ctx.quadraticCurveTo(0, m + r * 0.08, r * 0.08, m);
      });
      break;
    case 'grin':
      ctx.beginPath();
      ctx.moveTo(-r * 0.12, m - r * 0.013);
      ctx.quadraticCurveTo(0, m + r * 0.2, r * 0.12, m - r * 0.013);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = TONGUE;
      ctx.beginPath();
      ctx.ellipse(0, m + r * 0.066, r * 0.053, r * 0.032, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'frown':
      stroke(ctx, () => {
        ctx.moveTo(-r * 0.08, m + r * 0.053);
        ctx.quadraticCurveTo(0, m - r * 0.04, r * 0.08, m + r * 0.053);
      });
      break;
    case 'o':
      ctx.beginPath();
      ctx.ellipse(0, m + r * 0.04, r * 0.06, r * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'tiny':
      ctx.beginPath();
      ctx.ellipse(0, m + r * 0.025, r * 0.04, r * 0.026, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'smirk':
      stroke(ctx, () => {
        ctx.moveTo(-r * 0.092, m + r * 0.013);
        ctx.quadraticCurveTo(r * 0.013, m + r * 0.08, r * 0.105, m - r * 0.026);
      });
      break;
    case 'tongue':
      stroke(ctx, () => {
        ctx.moveTo(-r * 0.09, m + r * 0.02);
        ctx.quadraticCurveTo(0, m + r * 0.05, r * 0.09, m + r * 0.01);
      });
      // The tongue hangs out of one side.
      ctx.fillStyle = TONGUE;
      ctx.beginPath();
      ctx.moveTo(r * 0.0, m + r * 0.035);
      ctx.lineTo(r * 0.08, m + r * 0.025);
      ctx.quadraticCurveTo(r * 0.09, m + r * 0.13, r * 0.04, m + r * 0.13);
      ctx.quadraticCurveTo(-r * 0.005, m + r * 0.12, 0, m + r * 0.035);
      ctx.fill();
      ctx.lineWidth = Math.max(1, ctx.lineWidth * 0.7);
      ctx.stroke();
      break;
    case 'wobbly':
      stroke(ctx, () => {
        const w = r * 0.03;
        ctx.moveTo(-w * 3, m + r * 0.02);
        for (let i = 0; i < 3; i++) ctx.quadraticCurveTo(-w * 3 + w * (2 * i + 1), m + r * (i % 2 === 0 ? -0.02 : 0.06), -w * 3 + w * 2 * (i + 1), m + r * 0.02);
      });
      break;
  }
}

/** A teardrop beside the eyes. */
function drawSweat(ctx: CanvasRenderingContext2D, r: number): void {
  const x = r * 0.47;
  const y = -r * 0.2;
  ctx.fillStyle = SWEAT;
  ctx.beginPath();
  ctx.moveTo(x, y - r * 0.11);
  ctx.quadraticCurveTo(x + r * 0.07, y, x, y + r * 0.04);
  ctx.quadraticCurveTo(x - r * 0.07, y, x, y - r * 0.11);
  ctx.fill();
}

function stroke(ctx: CanvasRenderingContext2D, path: () => void): void {
  ctx.beginPath();
  path();
  ctx.stroke();
}
