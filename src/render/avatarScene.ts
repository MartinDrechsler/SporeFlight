import type { Skin } from '../config/skins';
import type { Trail } from '../config/trails';
import { idleLook } from './avatar';
import { hash } from './color';
import { drawMushroom } from './mushroom';
import type { AvatarFrame } from './timeline';

/** What the avatar wears in a scene: before and after a reveal. */
export interface SceneLook {
  skin: Skin;
  /** Worn once the frame says `revealed` (the bought skin); defaults to `skin`. */
  newSkin?: Skin;
  /** A glow trail streaming behind; shown only once revealed when `trailIsNew`. */
  trail?: Trail;
  trailIsNew?: boolean;
}

/** The mushroom stands this many radii above the ground line. */
const STAND = 0.95;
/** Lying on its side, the cap's edge touches the ground. */
const LIE = 1.05;

/**
 * Draws one moment of an avatar animation into a small stage of `width` x
 * `height` px: a soft ground shadow, the mushroom, and its effects.
 */
export function drawAvatarScene(ctx: CanvasRenderingContext2D, width: number, height: number, frame: AvatarFrame, look: SceneLook, time: number): void {
  ctx.clearRect(0, 0, width, height);
  // Big enough to read the face; leaves room above for a hop and to the sides for lying down.
  const r = Math.min(height * 0.29, width * 0.2);
  const groundY = height * 0.9;
  const cx = width / 2 + frame.x * r;
  const restY = groundY - r * (STAND + (LIE - STAND) * frame.lie);
  const cy = restY + frame.y * r;
  const skin = frame.revealed && look.newSkin ? look.newSkin : look.skin;

  // The shadow shrinks as the mushroom jumps up.
  const lift = Math.max(0, -frame.y);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.beginPath();
  ctx.ellipse(cx, groundY + r * 0.04, r * (0.9 + frame.lie * 0.3) / (1 + lift * 0.4), r * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();

  if (look.trail && (!look.trailIsNew || frame.revealed) && frame.lie === 0) drawTrail(ctx, look.trail, cx, cy, r, time);
  if (frame.burst !== null) drawBurst(ctx, cx, cy, r, frame.burst, skin);

  ctx.save();
  ctx.translate(cx, cy);
  // Lying: the cap rolls over to the left, the face looks up and out.
  ctx.rotate(frame.rotation - frame.lie * Math.PI * 0.5);
  ctx.scale(frame.scaleX, frame.scaleY);
  const idle = idleLook(time);
  drawMushroom(ctx, r, {
    skin,
    face: frame.face,
    gaze: { x: frame.lie > 0 ? 0 : idle.gaze * 0.6, y: 0, blink: idle.blink },
    faceVisible: frame.faceVisible,
    glow: 10 + Math.sin(time * 3) * 3,
    flash: frame.flash,
  });
  ctx.restore();

  if (frame.flash > 0) drawGlow(ctx, cx, cy, r, frame.flash);
  if (frame.zzz !== null) drawZzz(ctx, cx, cy - r * 0.55, r, frame.zzz);
}

/** Spores and rays of light flying out, in the new look's colours. */
function drawBurst(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, p: number, skin: Skin): void {
  const out = 1 - (1 - p) ** 3;
  const fade = 1 - p;
  ctx.save();
  ctx.translate(cx, cy);
  // Light adds up, so the rays brighten whatever is behind them instead of greying it.
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = fade * 0.55;
  ctx.fillStyle = '#ffe9a8';
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + p * 0.8;
    const len = r * (1.4 + out * 1.6);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a - 0.08) * len, Math.sin(a - 0.08) * len);
    ctx.lineTo(Math.cos(a + 0.08) * len, Math.sin(a + 0.08) * len);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  const colors = [skin.spots, skin.glow, '#ffffff', skin.capLight];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2 + hash(i) * 0.4;
    const d = r * (0.6 + out * (1.6 + hash(i + 40) * 1.2));
    ctx.globalAlpha = fade;
    ctx.fillStyle = colors[i % colors.length]!;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * d, Math.sin(a) * d - out * r * 0.3, r * (0.07 + hash(i + 80) * 0.06) * (1 - p * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

/** A halo of light around the mushroom while it flashes. */
function drawGlow(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, flash: number): void {
  const halo = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 2.2);
  halo.addColorStop(0, `rgba(255, 252, 230, ${0.7 * flash})`);
  halo.addColorStop(1, 'rgba(255, 252, 230, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 2.2, 0, Math.PI * 2);
  ctx.fill();
}

/** Two "z"s floating up and to the right, one after the other, growing and fading. */
function drawZzz(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, p: number): void {
  ctx.fillStyle = '#e8f6ff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const offset of [0, 0.45]) {
    const q = p - offset;
    if (q < 0 || q > 0.55) continue;
    const k = q / 0.55;
    ctx.globalAlpha = Math.sin(k * Math.PI);
    ctx.font = `${Math.round(r * (0.6 + k * 0.45))}px VT323, monospace`;
    ctx.fillText('z', x + r * (0.3 + k * 0.9), y - r * k * 1.1);
  }
  ctx.globalAlpha = 1;
}

/**
 * The glow trail streaming back to the left, as if flying: particles born at
 * a steady rate, each placed by its age alone, so nothing has to be stored.
 */
function drawTrail(ctx: CanvasRenderingContext2D, trail: Trail, cx: number, cy: number, r: number, time: number): void {
  if (trail.colors.length === 0) return;
  const life = 0.8;
  const newest = Math.floor(time * trail.rate);
  const count = Math.ceil(life * trail.rate);
  const size = trail.size * (r / 18);
  for (let k = newest; k > newest - count; k--) {
    const age = time - k / trail.rate;
    if (age < 0 || age > life) continue;
    ctx.globalAlpha = 1 - age / life;
    ctx.fillStyle = trail.colors[((k % trail.colors.length) + trail.colors.length) % trail.colors.length]!;
    const x = cx - r * 0.7 - age * r * 3.2;
    const y = cy + r * 0.2 + (hash(k) - 0.5) * r * 0.6 - age * trail.rise * (r / 18);
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
