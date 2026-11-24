import type { Life, Scenery } from '../config/biomes';
import type { Theme } from '../config/theme';
import { hash, rgbOf } from './color';
import { readyImage, type ImageName } from './images';

/**
 * The distant world of each biome and the small life in its air. Everything
 * is derived from the distance scrolled and the time, so it never drifts.
 * `alpha` lets one biome fade out while the next fades in.
 */
export interface SceneryView {
  width: number;
  groundY: number;
  distance: number;
  time: number;
  colors: Theme;
}

export function drawScenery(ctx: CanvasRenderingContext2D, scenery: Scenery, alpha: number, view: SceneryView): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  switch (scenery) {
    case 'darkForest':
      painting(ctx, 'forest-1', 0.35, view);
      break;
    case 'twilight':
      moon(ctx, view.width * 0.78, view.groundY * 0.22, 26, '#ffe3b0');
      painting(ctx, 'forest-1', 0.6, view);
      lightShafts(ctx, view, '255, 207, 112');
      break;
    case 'woodland':
      painting(ctx, 'forest-2', 0.75, view);
      lightShafts(ctx, view, '255, 240, 180');
      break;
    case 'meadow':
      sun(ctx, view.width * 0.8, view.groundY * 0.18, 34, '#fff7b0');
      clouds(ctx, view);
      treesOnHills(ctx, view);
      break;
    case 'savanna':
      sun(ctx, view.width * 0.7, view.groundY * 0.45, 60, '#ffd27a');
      acacias(ctx, view);
      break;
    case 'canyon':
      sun(ctx, view.width * 0.25, view.groundY * 0.12, 30, '#ffffff');
      mesas(ctx, view, 0.08, 0.5, '#d88a5a');
      mesas(ctx, view, 0.18, 0.32, '#b8562e');
      break;
    case 'highland':
      stars(ctx, view, 30, 0.35);
      mountains(ctx, view, 0.06, 0.55, '#5a5274', 0.25);
      mountains(ctx, view, 0.14, 0.38, '#3e3a56', 0.5);
      break;
    case 'peaks':
      stars(ctx, view, 60, 0.5);
      aurora(ctx, view);
      mountains(ctx, view, 0.05, 0.62, '#9fb8dc', 0.55);
      mountains(ctx, view, 0.12, 0.42, '#d8e6fa', 0.7);
      break;
  }
  ctx.restore();
}

export function drawLife(ctx: CanvasRenderingContext2D, life: Life, alpha: number, view: SceneryView): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  switch (life) {
    case 'spores':
      floaters(ctx, view, 28, view.colors.accent, 1, 0.15, 0.8);
      break;
    case 'fireflies':
      floaters(ctx, view, 22, '#ffe27a', 2, 0.08, 2.4);
      break;
    case 'birds':
      birds(ctx, view);
      break;
    case 'butterflies':
      butterflies(ctx, view);
      break;
    case 'haze':
      haze(ctx, view);
      floaters(ctx, view, 16, '#fff0c8', 1, 0.25, 0.6);
      break;
    case 'dust':
      dust(ctx, view);
      break;
    case 'snow':
      snow(ctx, view);
      break;
  }
  ctx.restore();
}

/** A painted forest, tiled with every other copy mirrored so no seam shows. */
function painting(ctx: CanvasRenderingContext2D, name: ImageName, strength: number, view: SceneryView): void {
  const image = readyImage(name);
  if (!image) return;
  const { width, groundY, distance } = view;
  const drawHeight = groundY * 0.75;
  const drawWidth = image.naturalWidth * (drawHeight / image.naturalHeight);
  const offset = distance * 0.1;
  const first = Math.floor(offset / drawWidth);
  const before = ctx.globalAlpha;
  ctx.globalAlpha = before * strength;
  for (let tile = first; tile * drawWidth - offset < width; tile++) {
    const x = tile * drawWidth - offset;
    ctx.save();
    if (tile % 2 !== 0) {
      ctx.translate(x + drawWidth, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(image, 0, groundY - drawHeight, drawWidth, drawHeight);
    } else {
      ctx.drawImage(image, x, groundY - drawHeight, drawWidth, drawHeight);
    }
    ctx.restore();
  }
  ctx.globalAlpha = before;
}

function sun(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  const glow = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 3);
  glow.addColorStop(0, `rgba(${rgbOf(color)}, 0.5)`);
  glow.addColorStop(1, `rgba(${rgbOf(color)}, 0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function moon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  sun(ctx, x, y, r, color);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 0.2, r * 0.25, 0, Math.PI * 2);
  ctx.arc(x + r * 0.35, y + r * 0.3, r * 0.15, 0, Math.PI * 2);
  ctx.fill();
}

/** Soft slanted beams of light between the trunks. */
function lightShafts(ctx: CanvasRenderingContext2D, view: SceneryView, rgb: string): void {
  const { width, groundY, distance, time } = view;
  const span = width * 1.6;
  for (let i = 0; i < 4; i++) {
    const x = ((((i * 0.31) % 1) * span - distance * 0.12) % span + span) % span - width * 0.3;
    const strength = 0.06 + 0.04 * Math.sin(time * 0.6 + i);
    const beam = ctx.createLinearGradient(x, 0, x + 80, groundY);
    beam.addColorStop(0, `rgba(${rgb}, ${strength})`);
    beam.addColorStop(1, `rgba(${rgb}, 0)`);
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 40, 0);
    ctx.lineTo(x + 150, groundY);
    ctx.lineTo(x + 70, groundY);
    ctx.closePath();
    ctx.fill();
  }
}

/** Repeats a shape across the screen at a parallax `speed`; `draw` gets the x and the item number. */
function scroll(view: SceneryView, speed: number, spacing: number, draw: (x: number, n: number) => void): void {
  const offset = view.distance * speed;
  const first = Math.floor(offset / spacing) - 1;
  for (let n = first; n * spacing - offset < view.width + spacing; n++) draw(n * spacing - offset, n);
}

function clouds(ctx: CanvasRenderingContext2D, view: SceneryView): void {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  scroll(view, 0.05 + 0.0, 260, (x, n) => {
    const y = view.groundY * (0.12 + hash(n) * 0.2);
    const s = 0.7 + hash(n + 9) * 0.6;
    for (const [dx, dy, r] of [[0, 0, 20], [22, -8, 24], [46, 0, 18], [24, 6, 20]] as const) {
      ctx.beginPath();
      ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function treesOnHills(ctx: CanvasRenderingContext2D, view: SceneryView): void {
  scroll(view, 0.25, 90, (x, n) => {
    if (hash(n) < 0.45) return;
    const h = 24 + hash(n + 3) * 20;
    const base = view.groundY - 40 - hash(n + 5) * 30;
    ctx.fillStyle = '#5a3e26';
    ctx.fillRect(x - 2, base - h * 0.4, 4, h * 0.4);
    ctx.fillStyle = '#3f8a3a';
    ctx.beginPath();
    ctx.arc(x, base - h * 0.55, h * 0.35, 0, Math.PI * 2);
    ctx.fill();
  });
}

function acacias(ctx: CanvasRenderingContext2D, view: SceneryView): void {
  ctx.fillStyle = '#3a2a1a';
  ctx.strokeStyle = '#3a2a1a';
  scroll(view, 0.2, 200, (x, n) => {
    if (hash(n) < 0.35) return;
    const base = view.groundY - 50;
    const h = 50 + hash(n + 2) * 40;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, base);
    ctx.quadraticCurveTo(x + 6, base - h * 0.6, x + 2, base - h);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x + 2, base - h, 38 + hash(n + 4) * 16, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** Flat-topped red rock mesas. */
function mesas(ctx: CanvasRenderingContext2D, view: SceneryView, speed: number, heightShare: number, color: string): void {
  ctx.fillStyle = color;
  scroll(view, speed, 170, (x, n) => {
    const h = view.groundY * heightShare * (0.6 + hash(n * 3 + speed) * 0.5);
    const w = 90 + hash(n + 1) * 80;
    const base = view.groundY;
    ctx.beginPath();
    ctx.moveTo(x - 10, base);
    ctx.lineTo(x + 6, base - h);
    ctx.lineTo(x + w - 6, base - h);
    ctx.lineTo(x + w + 10, base);
    ctx.closePath();
    ctx.fill();
  });
}

/** A mountain range; `snow` is the share of each peak that is white. */
function mountains(ctx: CanvasRenderingContext2D, view: SceneryView, speed: number, heightShare: number, color: string, snow: number): void {
  scroll(view, speed, 150, (x, n) => {
    const h = view.groundY * heightShare * (0.7 + hash(n * 7 + speed) * 0.5);
    const w = 120 + hash(n + 1) * 90;
    const peakX = x + w / 2;
    const top = view.groundY - h;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - 20, view.groundY);
    ctx.lineTo(peakX, top);
    ctx.lineTo(x + w + 20, view.groundY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    const sx = (w / 2 + 20) * snow;
    const sy = h * snow;
    ctx.beginPath();
    ctx.moveTo(peakX - sx, top + sy);
    ctx.lineTo(peakX, top);
    ctx.lineTo(peakX + sx, top + sy);
    ctx.lineTo(peakX + sx * 0.3, top + sy * 0.75);
    ctx.lineTo(peakX - sx * 0.2, top + sy * 0.95);
    ctx.closePath();
    ctx.fill();
  });
}

function stars(ctx: CanvasRenderingContext2D, view: SceneryView, count: number, heightShare: number): void {
  for (let i = 0; i < count; i++) {
    const x = (hash(i) * view.width * 1.2 - view.distance * 0.01) % (view.width * 1.2);
    const sx = x < 0 ? x + view.width * 1.2 : x;
    const y = hash(i + 100) * view.groundY * heightShare;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + 0.5 * Math.sin(view.time * 2 + i) ** 2})`;
    ctx.fillRect(sx, y, 1.6, 1.6);
  }
}

/** Slow ribbons of green and teal light across the night sky. */
function aurora(ctx: CanvasRenderingContext2D, view: SceneryView): void {
  const { width, groundY, time } = view;
  const bands: [string, number][] = [['61, 255, 168', 0.18], ['61, 214, 255', 0.26], ['178, 107, 255', 0.34]];
  bands.forEach(([rgb, at], i) => {
    const y = groundY * at;
    const g = ctx.createLinearGradient(0, y - 40, 0, y + 40);
    g.addColorStop(0, `rgba(${rgb}, 0)`);
    g.addColorStop(0.5, `rgba(${rgb}, 0.28)`);
    g.addColorStop(1, `rgba(${rgb}, 0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= width; x += 20) ctx.lineTo(x, y + Math.sin(x * 0.012 + time * 0.5 + i) * 22 - 30);
    for (let x = width; x >= 0; x -= 20) ctx.lineTo(x, y + Math.sin(x * 0.012 + time * 0.5 + i) * 22 + 30);
    ctx.closePath();
    ctx.fill();
  });
}

/** Glowing dots drifting and twinkling: spores, fireflies, motes. */
function floaters(ctx: CanvasRenderingContext2D, view: SceneryView, count: number, color: string, size: number, speed: number, blink: number): void {
  const { width, groundY, distance, time } = view;
  const span = width * 1.5;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = size > 1 ? 8 : 0;
  for (let i = 0; i < count; i++) {
    const x = (((hash(i) * span - distance * speed) % span) + span) % span - width * 0.25;
    const y = hash(i + 50) * groundY * 0.9 + Math.sin(time * 0.8 + i) * 8;
    const twinkle = Math.sin(time * blink + i * 2.1) ** 2;
    const before = ctx.globalAlpha;
    ctx.globalAlpha = before * (0.15 + 0.6 * twinkle);
    ctx.beginPath();
    ctx.arc(x, y, size + (i % 3) * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = before;
  }
  ctx.shadowBlur = 0;
}

/** A few birds crossing the sky, wings beating. */
function birds(ctx: CanvasRenderingContext2D, view: SceneryView): void {
  const { width, groundY, time } = view;
  ctx.strokeStyle = 'rgba(30, 30, 40, 0.7)';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 5; i++) {
    const span = width + 200;
    const x = span - ((time * (22 + hash(i) * 14) + hash(i + 3) * span) % span) - 100;
    const y = groundY * (0.1 + hash(i + 7) * 0.3) + Math.sin(time * 1.2 + i) * 6;
    const wing = Math.sin(time * 8 + i * 3) * 4;
    ctx.beginPath();
    ctx.moveTo(x - 7, y - wing);
    ctx.lineTo(x, y);
    ctx.lineTo(x + 7, y - wing);
    ctx.stroke();
  }
}

function butterflies(ctx: CanvasRenderingContext2D, view: SceneryView): void {
  const { width, groundY, time } = view;
  const colors = ['#ff7ab6', '#ffd23f', '#7fc8ff', '#ffffff'];
  for (let i = 0; i < 7; i++) {
    const span = width + 100;
    const x = ((hash(i) * span + time * (12 + hash(i + 2) * 10)) % span) - 50;
    const y = groundY * (0.45 + hash(i + 4) * 0.45) + Math.sin(time * 2 + i) * 14;
    const flap = Math.abs(Math.sin(time * 12 + i));
    ctx.fillStyle = colors[i % colors.length]!;
    ctx.beginPath();
    ctx.ellipse(x - 3, y, 3.5 * flap + 0.5, 4, -0.4, 0, Math.PI * 2);
    ctx.ellipse(x + 3, y, 3.5 * flap + 0.5, 4, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Heat shimmer rising off the ground. */
function haze(ctx: CanvasRenderingContext2D, view: SceneryView): void {
  const { width, groundY, time } = view;
  ctx.strokeStyle = 'rgba(255, 240, 210, 0.12)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const y = groundY - 20 - i * 26 - ((time * 18) % 26);
    ctx.beginPath();
    for (let x = 0; x <= width; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.05 + time * 3 + i) * 3);
    ctx.stroke();
  }
}

/** Sand blown along by the wind. */
function dust(ctx: CanvasRenderingContext2D, view: SceneryView): void {
  const { width, groundY, time } = view;
  ctx.strokeStyle = 'rgba(240, 200, 150, 0.45)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 30; i++) {
    const span = width + 60;
    const x = span - ((time * (180 + hash(i) * 120) + hash(i + 1) * span) % span) - 30;
    const y = groundY * (0.3 + hash(i + 2) * 0.68);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 10 + hash(i + 3) * 10, y);
    ctx.stroke();
  }
}

function snow(ctx: CanvasRenderingContext2D, view: SceneryView): void {
  const { width, groundY, time, distance } = view;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  for (let i = 0; i < 50; i++) {
    const fall = (time * (30 + hash(i) * 30) + hash(i + 1) * groundY) % groundY;
    const x = (((hash(i + 2) * width * 1.3 - distance * 0.2 + Math.sin(time + i) * 10) % (width * 1.3)) + width * 1.3) % (width * 1.3) - width * 0.15;
    ctx.beginPath();
    ctx.arc(x, fall, 1 + hash(i + 3) * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
}
