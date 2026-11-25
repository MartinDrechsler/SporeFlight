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
/** Where the mouth is: radii below the centre (render/mushroom.ts face plus the mouth's place in it). */
const MOUTH_Y = 0.36 + 0.17 + 0.03;
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

  if (frame.drink !== null) drawGlass(ctx, cx + r * 1.2, groundY, r, frame.drink, time);

  ctx.save();
  ctx.translate(cx, cy);
  // Lying: the cap rolls over to the left, the face looks up and out.
  ctx.rotate(frame.rotation - frame.lie * Math.PI * 0.5);
  // Squashes and slumps keep the stem's foot on the ground.
  ctx.translate(0, STAND * r);
  ctx.scale(frame.scaleX, frame.scaleY);
  ctx.translate(0, -STAND * r);
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

  if (frame.drink !== null) drawStraw(ctx, cx, groundY, r, frame);
  if (frame.flash > 0) drawGlow(ctx, cx, cy, r, frame.flash);
  if (frame.stars !== null) {
    // Above the head: over the cap when sitting, over the body when lying.
    const headTop = cy + STAND * r - 2 * STAND * r * frame.scaleY * (1 - frame.lie) - LIE * r * frame.lie;
    drawStars(ctx, cx - r * 0.15 * frame.lie + Math.sin(frame.rotation) * r * 0.8, headTop - r * 0.5, r, frame.stars);
  }
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

/** Three cartoon stars circling above the head; the ones at the back are smaller and dimmer. */
function drawStars(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, p: number): void {
  for (let i = 0; i < 3; i++) {
    const a = (p + i / 3) * Math.PI * 2;
    const front = (Math.sin(a) + 1) / 2;
    const size = r * (0.12 + front * 0.08);
    ctx.globalAlpha = 0.55 + front * 0.45;
    ctx.save();
    ctx.translate(x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.22);
    ctx.rotate(a * 1.5);
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const radius = k % 2 === 0 ? size : size * 0.45;
      const angle = (k / 10) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    ctx.closePath();
    ctx.fillStyle = '#ffd84a';
    ctx.fill();
    ctx.lineWidth = Math.max(1, r * 0.03);
    ctx.strokeStyle = '#b8860b';
    ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

/** A glass of water standing at (x, ground), emptying as `p` goes from 0 to 1, with bubbles. */
function drawGlass(ctx: CanvasRenderingContext2D, x: number, ground: number, r: number, p: number, time: number): void {
  const w = r * 0.42;
  const h = r * 0.62;
  const top = ground - h;
  const glass = (): void => {
    ctx.beginPath();
    ctx.moveTo(x - w / 2, top);
    ctx.lineTo(x - w * 0.38, ground);
    ctx.lineTo(x + w * 0.38, ground);
    ctx.lineTo(x + w / 2, top);
  };
  // Water fills the glass up to its level.
  const level = ground - h * 0.85 * (1 - p * 0.9);
  ctx.save();
  glass();
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = 'rgba(111, 200, 255, 0.85)';
  ctx.fillRect(x - w, level, w * 2, ground - level);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  for (let i = 0; i < 3; i++) {
    const rise = (time * 0.6 + i / 3) % 1;
    const by = ground - (ground - level) * rise;
    ctx.beginPath();
    ctx.arc(x + (i - 1) * w * 0.22, by, r * 0.025, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(220, 245, 255, 0.18)';
  glass();
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(230, 248, 255, 0.9)';
  ctx.lineWidth = Math.max(1.2, r * 0.035);
  glass();
  ctx.stroke();
}

/** A bendy straw from the glass to the mouth. */
function drawStraw(ctx: CanvasRenderingContext2D, cx: number, ground: number, r: number, frame: AvatarFrame): void {
  const gx = cx + r * 1.2;
  // The mouth, on the stem: its height above the ground follows the slump.
  const mouthY = ground - (STAND - MOUTH_Y) * r * frame.scaleY;
  ctx.strokeStyle = '#ff7fa8';
  ctx.lineWidth = Math.max(1.5, r * 0.06);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(gx + r * 0.05, ground - r * 0.15);
  ctx.lineTo(gx - r * 0.05, ground - r * 0.85);
  ctx.quadraticCurveTo(gx - r * 0.15, ground - r * 0.98, gx - r * 0.45, mouthY - r * 0.05);
  ctx.lineTo(cx + r * 0.08, mouthY);
  ctx.stroke();
}
