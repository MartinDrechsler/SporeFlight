import type { Expression } from '../config/expressions';
import type { Skin } from '../config/skins';
import { drawFace, INK, type Gaze } from './face';

export const STEM = '#fbf3e8';

/**
 * The "Button" mushroom, centred on (0, 0) with radius `r`: a wide round cap
 * with three spots over a chubby stem that carries the face. Spans about
 * -0.95r (cap top) to 0.95r (stem bottom) and ±1.05r across the cap.
 */
const CAP = { halfWidth: 1.05, height: 0.79, rim: -0.15, underside: 0.13 };
const STEM_SHAPE = { top: -0.2, bottom: 0.95, half: 0.355, bulge: 0.105 };
const FACE_Y = 0.36;
const SPOTS = [[-0.5, -0.42, 0.17], [0.06, -0.78, 0.13], [0.52, -0.32, 0.15]] as const;

export interface MushroomLook {
  skin: Skin;
  face: Expression;
  gaze: Gaze;
  /** Show the face (false while the mushroom has turned its back in a spin). */
  faceVisible: boolean;
  /** Glow blur in px around the outline; 0 for none. */
  glow: number;
  /** 0 to 1: the mushroom glows white all over (a flash of light). */
  flash: number;
}

export function drawMushroom(ctx: CanvasRenderingContext2D, r: number, look: MushroomLook): void {
  const line = Math.max(1.4, r * 0.05);
  ctx.lineWidth = line;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;

  if (look.glow > 0) {
    ctx.shadowColor = look.skin.glow;
    ctx.shadowBlur = look.glow;
  }
  stemPath(ctx, r);
  ctx.fillStyle = STEM;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();

  if (look.faceVisible) {
    ctx.save();
    ctx.translate(0, FACE_Y * r);
    drawFace(ctx, r, look.face, look.gaze, STEM, line);
    ctx.restore();
  }

  if (look.glow > 0) {
    ctx.shadowColor = look.skin.glow;
    ctx.shadowBlur = look.glow;
  }
  capPath(ctx, r);
  const top = CAP.rim - CAP.height;
  const shade = ctx.createLinearGradient(0, top * r, 0, (CAP.rim + CAP.underside) * r);
  shade.addColorStop(0, look.skin.capLight);
  shade.addColorStop(0.55, look.skin.capMain);
  shade.addColorStop(1, look.skin.capDark);
  ctx.fillStyle = shade;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();

  // A soft highlight along the top of the cap keeps it round and smooth.
  const w = CAP.halfWidth * r;
  const h = CAP.height * r;
  const rim = CAP.rim * r;
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = line * 1.3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-w * 0.62, rim - h * 0.72);
  ctx.quadraticCurveTo(-w * 0.3, rim - h * 0.98, w * 0.02, rim - h * 0.99);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.fillStyle = look.skin.spots;
  for (const [sx, sy, sr] of SPOTS) {
    ctx.beginPath();
    ctx.arc(sx * w, rim + sy * h, sr * w, 0, Math.PI * 2);
    ctx.fill();
  }

  if (look.flash > 0) {
    ctx.globalAlpha = Math.min(1, look.flash);
    ctx.fillStyle = '#ffffff';
    stemPath(ctx, r);
    ctx.fill();
    capPath(ctx, r);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function capPath(ctx: CanvasRenderingContext2D, r: number): void {
  const w = CAP.halfWidth * r;
  const h = CAP.height * r;
  const rim = CAP.rim * r;
  const under = rim + CAP.underside * r;
  ctx.beginPath();
  // A cubic with control points 1.35 heights up peaks at about one height.
  ctx.moveTo(-w, rim);
  ctx.bezierCurveTo(-w, rim - h * 1.35, w, rim - h * 1.35, w, rim);
  ctx.bezierCurveTo(w * 0.9, under, -w * 0.9, under, -w, rim);
  ctx.closePath();
}

function stemPath(ctx: CanvasRenderingContext2D, r: number): void {
  const { top, bottom, half, bulge } = STEM_SHAPE;
  const t = top * r;
  const b = bottom * r;
  const sw = half * r;
  const bw = (half + bulge) * r;
  const mid = t + (b - t) * 0.45;
  const round = 0.13 * r;
  ctx.beginPath();
  ctx.moveTo(-sw, t);
  ctx.bezierCurveTo(-sw - bulge * r, mid, -bw - r * 0.026, b - r * 0.08, -bw + round, b);
  ctx.quadraticCurveTo(0, b + r * 0.08, bw - round, b);
  ctx.bezierCurveTo(bw + r * 0.026, b - r * 0.08, sw + bulge * r, mid, sw, t);
  ctx.closePath();
}

/** The same mushroom as an SVG drawing (shop previews), with a calm smiling face. */
export function mushroomSvg(skin: Skin): string {
  const r = 20;
  const w = CAP.halfWidth * r;
  const h = CAP.height * r;
  const rim = CAP.rim * r;
  const under = rim + CAP.underside * r;
  const { top, bottom, half, bulge } = STEM_SHAPE;
  const t = top * r;
  const b = bottom * r;
  const sw = half * r;
  const bw = (half + bulge) * r;
  const mid = t + (b - t) * 0.45;
  const f = FACE_Y * r;
  const n = (v: number): string => v.toFixed(2);
  const spots = SPOTS.map(([sx, sy, sr]) => `<circle cx="${n(sx * w)}" cy="${n(rim + sy * h)}" r="${n(sr * w)}" fill="${skin.spots}"/>`).join('');
  return (
    `<path d="M${n(-sw)} ${n(t)} C${n(-sw - bulge * r)} ${n(mid)} ${n(-bw - 0.5)} ${n(b - 1.6)} ${n(-bw + 2.6)} ${n(b)} Q0 ${n(b + 1.6)} ${n(bw - 2.6)} ${n(b)} C${n(bw + 0.5)} ${n(b - 1.6)} ${n(sw + bulge * r)} ${n(mid)} ${n(sw)} ${n(t)} Z" fill="${STEM}" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>` +
    `<ellipse cx="-4.2" cy="${n(f)}" rx="1.7" ry="2.2" fill="${INK}"/><ellipse cx="4.2" cy="${n(f)}" rx="1.7" ry="2.2" fill="${INK}"/>` +
    `<circle cx="-4.8" cy="${n(f - 0.9)}" r="0.7" fill="#fff"/><circle cx="3.6" cy="${n(f - 0.9)}" r="0.7" fill="#fff"/>` +
    `<path d="M-1.6 ${n(f + 3.4)} Q0 ${n(f + 5)} 1.6 ${n(f + 3.4)}" fill="none" stroke="${INK}" stroke-width="1" stroke-linecap="round"/>` +
    `<path d="M${n(-w)} ${n(rim)} C${n(-w)} ${n(rim - h * 1.35)} ${n(w)} ${n(rim - h * 1.35)} ${n(w)} ${n(rim)} C${n(w * 0.9)} ${n(under)} ${n(-w * 0.9)} ${n(under)} ${n(-w)} ${n(rim)} Z" fill="${skin.capMain}" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>` +
    spots
  );
}
