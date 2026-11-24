import type { ObstacleStyle } from '../config/biomes';
import type { Theme } from '../config/theme';
import { drawColumn } from './obstacles';
import { COIN, DIAMOND } from '../config/sprites';
import { drawSprite } from './sprites';
import { TUNING } from '../config/tuning';
import { pickupPosition, type Pickup } from '../gameplay/pickups';
import { gapBottom, gapTop, rootLeft, type Root } from '../gameplay/roots';
import { isBroken, type Vein } from '../gameplay/veins';
import type { WindZone } from '../gameplay/wind';

/** What an obstacle is made of and its colours. */
export interface RootLook {
  colors: Theme;
  style: ObstacleStyle;
}

export function drawRoot(ctx: CanvasRenderingContext2D, root: Root, look: RootLook, groundY: number, time: number): void {
  const x = rootLeft(root);
  const top = gapTop(root);
  const bottom = gapBottom(root);
  drawColumn(ctx, look.style, look.colors, { x, y: 0, width: root.width, height: top, tip: 'down', seed: root.index * 2 }, time);
  drawColumn(ctx, look.style, look.colors, { x, y: bottom, width: root.width, height: groundY - bottom, tip: 'up', seed: root.index * 2 + 1 }, time);
  if (root.vein) drawVein(ctx, root, root.vein, time);
}

/**
 * Crystal shards growing from the cap into the gap, glowing. Each hit adds a
 * crack; once broken only stubs remain.
 */
function drawVein(ctx: CanvasRenderingContext2D, root: Root, vein: Vein, time: number): void {
  const V = TUNING.veins;
  const left = rootLeft(root) - V.overhang;
  const width = root.width + V.overhang * 2;
  // Shards point into the gap: up from the bottom cap, down from the top cap.
  const dir = vein.side === 'bottom' ? -1 : 1;
  const base = vein.side === 'bottom' ? gapBottom(root) : gapTop(root);
  const broken = isBroken(vein);
  const shards = [0.15, 0.32, 0.5, 0.68, 0.85];
  ctx.save();
  ctx.shadowColor = '#7fe6ff';
  ctx.shadowBlur = broken ? 0 : 10 + Math.sin(time * 4) * 4;
  // Chunky gem prisms (flat tips, a light facet), so they read as treasure, not spikes.
  shards.forEach((at, i) => {
    const height = broken ? 4 : V.crystalHeight * (0.75 + ((i * 7) % 3) * 0.15);
    const half = width * 0.085;
    const x = left + width * at;
    ctx.fillStyle = broken ? 'rgba(127, 230, 255, 0.35)' : i % 2 ? '#8fe9ff' : '#b58cff';
    ctx.beginPath();
    ctx.moveTo(x - half, base);
    ctx.lineTo(x - half, base + dir * height * 0.65);
    ctx.lineTo(x - half * 0.4, base + dir * height);
    ctx.lineTo(x + half * 0.4, base + dir * height);
    ctx.lineTo(x + half, base + dir * height * 0.65);
    ctx.lineTo(x + half, base);
    ctx.closePath();
    ctx.fill();
    if (broken) return;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.fillRect(x - half * 0.6, base + dir * height * 0.2 - (dir < 0 ? height * 0.4 : 0), half * 0.35, height * 0.4);
  });
  // A twinkle that wanders over the crystals.
  if (!broken) {
    const twinkle = left + width * (0.2 + 0.6 * ((Math.sin(time * 1.3) + 1) / 2));
    const ty = base + dir * V.crystalHeight * 0.7;
    const size = 3 + Math.sin(time * 6) * 1.5;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(twinkle - size, ty - 0.75, size * 2, 1.5);
    ctx.fillRect(twinkle - 0.75, ty - size, 1.5, size * 2);
  }
  ctx.restore();
  // Cracks: one more for every hit.
  ctx.strokeStyle = '#0b3a4a';
  ctx.lineWidth = 1.5;
  for (let h = 0; h < Math.min(vein.hits, V.hitsToBreak - 1); h++) {
    const x = left + width * (0.25 + h * 0.3);
    ctx.beginPath();
    ctx.moveTo(x, base + dir * 2);
    ctx.lineTo(x + 4, base + dir * 7);
    ctx.lineTo(x - 2, base + dir * 11);
    ctx.stroke();
  }
}

export function drawPickup(ctx: CanvasRenderingContext2D, pickup: Pickup, time: number): void {
  const r = TUNING.pickups.radius;
  const { x, y: baseY } = pickupPosition(pickup);
  const y = baseY + Math.sin(time * 4 + x * 0.05) * 3;
  ctx.save();
  ctx.translate(x, y);

  switch (pickup.kind) {
    case 'coin':
      // A pixel coin turning on its edge.
      ctx.scale(Math.max(0.3, Math.abs(Math.cos(time * 2.2))), 1);
      glow(ctx, '#ffd23f', 10);
      drawSprite(ctx, COIN, 0, 0, r * 2.4);
      break;
    case 'goldCoin': {
      // The same coin, huge and turning slowly, with sparkles around it: worth stopping for.
      const g = TUNING.pickups.goldenRadius;
      sparkles(ctx, g * 1.5, time, '#fff2a8');
      ctx.scale(Math.max(0.3, Math.abs(Math.cos(time * 2))), 1);
      glow(ctx, '#ffd23f', 24);
      drawSprite(ctx, COIN, 0, 0, g * 2.4);
      break;
    }
    case 'diamond':
      // A brilliant: it does not spin (its cut would be lost), it glints instead.
      glow(ctx, '#3fd8ff', 16);
      drawSprite(ctx, DIAMOND, 0, 0, r * 2.9);
      ctx.shadowBlur = 0;
      sparkles(ctx, r * 1.3, time * 1.4, '#ffffff', 1);
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

/**
 * The finish gate: two glowing posts with a curtain of light between them,
 * spanning the whole height. `opened` once the mushroom has flown through.
 */
export function drawGate(ctx: CanvasRenderingContext2D, x: number, groundY: number, theme: Theme, time: number, opened: boolean): void {
  const half = TUNING.gate.width / 2;
  const curtain = ctx.createLinearGradient(x - half, 0, x + half, 0);
  const strength = opened ? 0.55 : 0.28 + Math.sin(time * 4) * 0.08;
  curtain.addColorStop(0, 'rgba(255, 210, 63, 0)');
  curtain.addColorStop(0.5, `rgba(255, 210, 63, ${strength})`);
  curtain.addColorStop(1, 'rgba(255, 210, 63, 0)');
  ctx.fillStyle = curtain;
  ctx.fillRect(x - half, 0, half * 2, groundY);

  ctx.save();
  ctx.shadowColor = '#ffd23f';
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#ffd23f';
  for (const side of [-1, 1]) ctx.fillRect(x + side * half - 3, 0, 6, groundY);
  ctx.restore();

  // Sparks rising through the curtain.
  ctx.fillStyle = theme.accent;
  for (let i = 0; i < 10; i++) {
    const y = groundY - ((time * 90 + i * (groundY / 10)) % groundY);
    ctx.beginPath();
    ctx.arc(x + Math.sin(time * 3 + i) * half * 0.6, y, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Small four-point twinkles circling a pickup; `count` of them, fading in and out. */
function sparkles(ctx: CanvasRenderingContext2D, radius: number, time: number, color: string, count = 3): void {
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const angle = time * 0.8 + (i * Math.PI * 2) / count;
    const size = 1 + 2.2 * Math.max(0, Math.sin(time * 3 + i * 2));
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    ctx.fillRect(x - size, y - 0.75, size * 2, 1.5);
    ctx.fillRect(x - 0.75, y - size, 1.5, size * 2);
  }
}
