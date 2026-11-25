import type { Backdrop } from '../config/levels';
import { hash, mixColor, rgbOf } from './color';
import { mountains, scroll, stars, trees, type SceneryView } from './scenery';

/**
 * The distant world behind an adventure level: two flat silhouette layers in
 * the level's own colours, the far one paler, with small lights in the accent
 * colour. Like the biomes, everything comes from distance and time.
 */
export function drawBackdrop(ctx: CanvasRenderingContext2D, backdrop: Backdrop, view: SceneryView): void {
  const { colors } = view;
  const far = mixColor(colors.sky[1], colors.accent, 0.2);
  const near = mixColor(colors.hillsFar, colors.accent, 0.08);
  const light = rgbOf(colors.accent);
  stars(ctx, view, 24, 0.4);
  skyGlow(ctx, view, light);
  switch (backdrop) {
    case 'forest':
      trees(ctx, view, { speed: 0.06, spacing: 70, height: 0.42, color: far, shape: 'pine' });
      trees(ctx, view, { speed: 0.14, spacing: 160, height: 0.58, color: near, shape: 'gnarled' });
      break;
    case 'peaks':
      mountains(ctx, view, 0.05, 0.6, far, 0.3);
      mountains(ctx, view, 0.12, 0.4, near, 0.15);
      break;
    case 'skyline':
      buildings(ctx, view, { speed: 0.06, spacing: 46, height: 0.32, color: far, light: null, tall: false });
      buildings(ctx, view, { speed: 0.13, spacing: 70, height: 0.46, color: near, light, tall: false });
      break;
    case 'towers':
      buildings(ctx, view, { speed: 0.05, spacing: 60, height: 0.5, color: far, light: null, tall: true });
      buildings(ctx, view, { speed: 0.12, spacing: 95, height: 0.72, color: near, light, tall: true });
      break;
    case 'ruins':
      ruins(ctx, view, 0.06, 0.3, far, null);
      ruins(ctx, view, 0.13, 0.45, near, light);
      break;
    case 'castle':
      trees(ctx, view, { speed: 0.06, spacing: 60, height: 0.3, color: far, shape: 'pine' });
      castles(ctx, view, mixColor(near, far, 0.5), light);
      break;
    case 'windmills':
      trees(ctx, view, { speed: 0.06, spacing: 90, height: 0.3, color: far, shape: 'round' });
      windmills(ctx, view, mixColor(near, far, 0.5), light);
      break;
    case 'caverns':
      caverns(ctx, view, { speed: 0.05, spacing: 54, reach: 0.28, color: far, light: null });
      caverns(ctx, view, { speed: 0.12, spacing: 88, reach: 0.4, color: near, light });
      break;
  }
}

/**
 * A cave: rock teeth hanging from the ceiling and rising from the floor, the
 * near layer dotted with glowing fungi that pulse slowly.
 */
function caverns(
  ctx: CanvasRenderingContext2D,
  view: SceneryView,
  layer: { speed: number; spacing: number; reach: number; color: string; light: string | null },
): void {
  const { groundY, time } = view;
  ctx.fillStyle = layer.color;
  scroll(view, layer.speed, layer.spacing, (x, n) => {
    const w = layer.spacing * (0.55 + hash(n) * 0.5);
    const down = groundY * layer.reach * (0.35 + hash(n + 3) * 0.65);
    const up = groundY * layer.reach * 0.7 * (0.3 + hash(n + 7) * 0.7);
    ctx.beginPath();
    ctx.moveTo(x - w / 2, 0);
    ctx.quadraticCurveTo(x - w * 0.15, down * 0.6, x, down);
    ctx.quadraticCurveTo(x + w * 0.15, down * 0.6, x + w / 2, 0);
    ctx.fill();
    const bx = x + layer.spacing / 2;
    ctx.beginPath();
    ctx.moveTo(bx - w / 2, groundY);
    ctx.quadraticCurveTo(bx - w * 0.12, groundY - up * 0.6, bx, groundY - up);
    ctx.quadraticCurveTo(bx + w * 0.12, groundY - up * 0.6, bx + w / 2, groundY);
    ctx.fill();
    if (!layer.light || hash(n + 11) < 0.45) return;
    // A cluster of glowing fungi on the rock.
    const fx = bx + (hash(n + 13) - 0.5) * w * 0.5;
    const fy = groundY - up * (0.2 + hash(n + 17) * 0.4);
    const pulse = 0.45 + Math.sin(time * 1.6 + n) * 0.2;
    const glow = ctx.createRadialGradient(fx, fy, 1, fx, fy, 22);
    glow.addColorStop(0, `rgba(${layer.light}, ${pulse})`);
    glow.addColorStop(1, `rgba(${layer.light}, 0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(fx - 22, fy - 22, 44, 44);
    ctx.fillStyle = `rgba(${layer.light}, 0.85)`;
    for (const [dx, r] of [[-4, 2.5], [2, 3.2], [6, 2]] as const) {
      ctx.beginPath();
      ctx.arc(fx + dx, fy - r, r, Math.PI, 0);
      ctx.fill();
    }
    ctx.fillStyle = layer.color;
  });
}

/** A large soft glow high in the sky, the level's own moon. */
function skyGlow(ctx: CanvasRenderingContext2D, view: SceneryView, light: string): void {
  const x = view.width * 0.72;
  const y = view.groundY * 0.18;
  const glow = ctx.createRadialGradient(x, y, 4, x, y, 90);
  glow.addColorStop(0, `rgba(${light}, 0.35)`);
  glow.addColorStop(0.3, `rgba(${light}, 0.12)`);
  glow.addColorStop(1, `rgba(${light}, 0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(x - 90, y - 90, 180, 180);
  ctx.fillStyle = `rgba(${light}, 0.5)`;
  ctx.beginPath();
  ctx.arc(x, y, 16, 0, Math.PI * 2);
  ctx.fill();
}

interface BuildingLayer {
  speed: number;
  spacing: number;
  /** Tallest building, as a share of the space above the ground. */
  height: number;
  color: string;
  /** 'r, g, b' of lit windows; null for a far layer without lights. */
  light: string | null;
  /** Skyscrapers with spires instead of an old town's roofs. */
  tall: boolean;
}

/** A row of buildings; in the near layer some windows are lit and a few flicker. */
function buildings(ctx: CanvasRenderingContext2D, view: SceneryView, layer: BuildingLayer): void {
  const { groundY, time } = view;
  scroll(view, layer.speed, layer.spacing, (x, n) => {
    const h = groundY * layer.height * (0.45 + hash(n * 5 + layer.speed) * 0.55);
    const w = layer.spacing * (0.7 + hash(n + 13) * 0.35);
    const top = groundY - h;
    ctx.fillStyle = layer.color;
    ctx.fillRect(x, top, w, h);
    if (layer.tall) {
      // A stepped crown and a spire with a slow red warning light.
      ctx.fillRect(x + w * 0.2, top - h * 0.05, w * 0.6, h * 0.05);
      ctx.fillRect(x + w * 0.48, top - h * 0.14, 2, h * 0.09);
      if (layer.light) {
        ctx.fillStyle = `rgba(255, 70, 90, ${0.3 + 0.7 * Math.max(0, Math.sin(time * 2 + n))})`;
        ctx.fillRect(x + w * 0.48 - 1, top - h * 0.14 - 3, 4, 4);
      }
    } else if (hash(n + 7) < 0.5) {
      // A pitched roof on an old town house.
      ctx.beginPath();
      ctx.moveTo(x - 2, top);
      ctx.lineTo(x + w / 2, top - w * 0.4);
      ctx.lineTo(x + w + 2, top);
      ctx.closePath();
      ctx.fill();
    }
    if (!layer.light) return;
    const cols = Math.max(2, Math.floor(w / 11));
    const rows = Math.floor(h / 14);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const k = n * 131 + r * 17 + c;
        if (hash(k) < 0.55) continue;
        const flicker = hash(k + 3) < 0.08 ? 0.5 + 0.5 * Math.sin(time * 3 + k) : 1;
        ctx.fillStyle = `rgba(${layer.light}, ${0.55 * flicker})`;
        ctx.fillRect(x + 4 + c * ((w - 8) / cols), top + 8 + r * 14, 4, 6);
      }
    }
  });
}

/** Broken columns and arches of an old stone hall. */
function ruins(ctx: CanvasRenderingContext2D, view: SceneryView, speed: number, heightShare: number, color: string, light: string | null): void {
  const { groundY, time } = view;
  ctx.fillStyle = color;
  scroll(view, speed, 90, (x, n) => {
    const full = groundY * heightShare;
    const h = full * (hash(n + 2) < 0.35 ? 0.45 + hash(n + 3) * 0.3 : 1);
    const w = 16;
    // A column, its top broken off at a slant when it is short.
    ctx.beginPath();
    ctx.moveTo(x, groundY);
    ctx.lineTo(x, groundY - h);
    ctx.lineTo(x + w, groundY - h + (h < full ? 8 : 0));
    ctx.lineTo(x + w, groundY);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x - 4, groundY - h - 4, w + 8, 5);
    // Whole neighbours carry an arch between them.
    if (h === full && hash(n + 3) >= 0.35) {
      ctx.beginPath();
      ctx.moveTo(x + w, groundY - full);
      ctx.arc(x + 45 + w / 2, groundY - full, 45 - w / 2 + w, Math.PI, 0);
      ctx.lineTo(x + 90, groundY - full + 10);
      ctx.arc(x + 45 + w / 2, groundY - full + 10, 45 - w / 2, 0, Math.PI, true);
      ctx.closePath();
      ctx.fill();
    }
    if (light && hash(n + 9) < 0.4) {
      // A torch glowing at the foot of a column.
      const glow = 0.4 + 0.3 * Math.sin(time * 6 + n * 2) + 0.2 * Math.sin(time * 11 + n);
      ctx.fillStyle = `rgba(${light}, ${glow})`;
      ctx.beginPath();
      ctx.arc(x + w / 2, groundY - h * 0.45, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
    }
  });
}

/** A hill now and then with a castle on top, its windows lit. */
function castles(ctx: CanvasRenderingContext2D, view: SceneryView, color: string, light: string): void {
  const { groundY } = view;
  ctx.fillStyle = color;
  // All hills first, so a neighbour's hill never covers a castle.
  scroll(view, 0.12, 230, (x) => {
    ctx.beginPath();
    ctx.ellipse(x + 90, groundY, 150, 60, 0, Math.PI, 0);
    ctx.fill();
  });
  scroll(view, 0.12, 230, (x, n) => {
    const base = groundY - 30;
    ctx.fillStyle = color;
    if (hash(n + 4) < 0.2) return;
    const h = groundY * (0.26 + hash(n + 5) * 0.1);
    const keep = { x: x + 60, w: 60 };
    ctx.fillRect(keep.x, base - h, keep.w, h);
    for (const [dx, tw, th] of [[-22, 22, 1.35], [keep.w, 22, 1.25]] as const) {
      const tx = keep.x + dx;
      ctx.fillRect(tx, base - h * th, tw, h * th);
      ctx.beginPath();
      ctx.moveTo(tx - 3, base - h * th);
      ctx.lineTo(tx + tw / 2, base - h * th - 22);
      ctx.lineTo(tx + tw + 3, base - h * th);
      ctx.closePath();
      ctx.fill();
    }
    for (let i = 0; i < 5; i++) ctx.fillRect(keep.x + i * 13, base - h - 7, 8, 7);
    ctx.fillStyle = `rgba(${light}, 0.6)`;
    for (const [wx, wy] of [[keep.x + 14, base - h * 0.6], [keep.x + 40, base - h * 0.6], [keep.x - 14, base - h * 1.05], [keep.x + keep.w + 8, base - h * 0.95]] as const) {
      ctx.fillRect(wx, wy, 5, 8);
    }
  });
}

/** Windmills on soft hills, sails turning with the wind. */
function windmills(ctx: CanvasRenderingContext2D, view: SceneryView, color: string, light: string): void {
  const { groundY, time } = view;
  ctx.fillStyle = color;
  // All hills first, so a neighbour's hill never covers a windmill.
  scroll(view, 0.12, 150, (x) => {
    ctx.beginPath();
    ctx.ellipse(x + 70, groundY, 110, 45, 0, Math.PI, 0);
    ctx.fill();
  });
  scroll(view, 0.12, 150, (x, n) => {
    ctx.fillStyle = color;
    if (hash(n + 6) < 0.25) return;
    const h = groundY * (0.18 + hash(n + 7) * 0.06);
    const base = groundY - 25;
    const hub = { x: x + 70, y: base - h };
    ctx.beginPath();
    ctx.moveTo(hub.x - 14, base);
    ctx.lineTo(hub.x - 7, hub.y);
    ctx.lineTo(hub.x + 7, hub.y);
    ctx.lineTo(hub.x + 14, base);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = `rgba(${light}, 0.55)`;
    ctx.fillRect(hub.x - 2, base - h * 0.45, 4, 6);
    // Four sails: a thin arm with a wide cloth on its outer part.
    ctx.fillStyle = color;
    const turn = time * (0.8 + hash(n + 8) * 0.6) + n;
    const reach = h * 0.5;
    for (let i = 0; i < 4; i++) {
      const a = turn + (i * Math.PI) / 2;
      const ax = Math.cos(a);
      const ay = Math.sin(a);
      const px = -ay;
      const py = ax;
      ctx.beginPath();
      ctx.moveTo(hub.x - px * 2, hub.y - py * 2);
      ctx.lineTo(hub.x + ax * reach - px * 2, hub.y + ay * reach - py * 2);
      ctx.lineTo(hub.x + ax * reach + px * 12, hub.y + ay * reach + py * 12);
      ctx.lineTo(hub.x + ax * reach * 0.3 + px * 12, hub.y + ay * reach * 0.3 + py * 12);
      ctx.lineTo(hub.x + ax * reach * 0.3 + px * 2, hub.y + ay * reach * 0.3 + py * 2);
      ctx.lineTo(hub.x + px * 2, hub.y + py * 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(hub.x, hub.y, 5, 0, Math.PI * 2);
    ctx.fill();
  });
}
