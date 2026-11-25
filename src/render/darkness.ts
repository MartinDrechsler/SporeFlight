import { TUNING } from '../config/tuning';
import type { World } from '../gameplay/world';
import { pickupPosition } from '../gameplay/pickups';
import { extraGap, gapBottom, gapTop, rootLeft } from '../gameplay/roots';

const D = TUNING.darkness;

/**
 * A dark cave: everything is drawn as usual, then darkness is laid over it
 * with holes where light falls. The mushroom's own glow lights a circle
 * around it; sporelings and fireflies glow a little; a root you have passed
 * lights up behind you. What lies ahead stays dark, except the faint glowing
 * tips at each gap's edges, so the way is always readable (Schell: a hit must
 * feel like your own mistake, never the game hiding it).
 */
let layer: HTMLCanvasElement | null = null;

export function drawDarkness(ctx: CanvasRenderingContext2D, world: World, width: number, height: number, time: number): void {
  const lights: { x: number; y: number; r: number }[] = [];
  const flicker = 1 + Math.sin(time * 7) * 0.02 + Math.sin(time * 3.1) * 0.02;
  // A screech from the Bat Queen dims the mushroom's own light for a while.
  const dimmed = world.boss && world.boss.dim > 0 ? D.screechDim : 1;
  lights.push({ x: world.player.x, y: world.player.y, r: D.playerLight * flicker * dimmed });
  if (world.boss) {
    for (const bat of world.boss.rocks) lights.push({ x: bat.x, y: bat.y, r: D.hazardLight });
    lights.push({ x: world.boss.x, y: world.boss.y, r: D.bossLight });
  }
  for (const pickup of world.pickups) {
    if (pickup.collected) continue;
    const at = pickupPosition(pickup);
    lights.push({ x: at.x, y: at.y, r: pickup.kind === 'sporeling' ? D.sporelingLight : D.pickupLight });
  }
  for (const root of world.roots) {
    if (!root.passed) continue;
    lights.push({ x: rootLeft(root) + root.width / 2, y: root.gapCenter, r: D.passedRootLight });
  }
  // Bats' eyes and a dripping stalactite's wet tip glow faintly: the danger is always shown.
  for (const hazard of world.hazards) {
    if (hazard.kind === 'bat') lights.push({ x: hazard.x, y: hazard.y, r: D.hazardLight });
    else if (hazard.state !== 'hanging') lights.push({ x: hazard.x, y: hazard.y + TUNING.hazards.stalactiteLength, r: D.hazardLight * 1.4 });
  }
  if (world.level.fireflies) for (const fly of fireflies(world, time)) lights.push({ x: fly.x, y: fly.y, r: D.fireflyLight });

  layer ??= document.createElement('canvas');
  if (layer.width !== Math.ceil(width) || layer.height !== Math.ceil(height)) {
    layer.width = Math.ceil(width);
    layer.height = Math.ceil(height);
  }
  const dark = layer.getContext('2d')!;
  dark.globalCompositeOperation = 'source-over';
  dark.clearRect(0, 0, layer.width, layer.height);
  dark.fillStyle = `rgba(2, 3, 8, ${D.alpha})`;
  dark.fillRect(0, 0, layer.width, layer.height);
  // Light takes the darkness away, softly at its edge.
  dark.globalCompositeOperation = 'destination-out';
  for (const light of lights) {
    const g = dark.createRadialGradient(light.x, light.y, light.r * 0.25, light.x, light.y, light.r);
    g.addColorStop(0, 'rgba(0, 0, 0, 1)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    dark.fillStyle = g;
    dark.fillRect(light.x - light.r, light.y - light.r, light.r * 2, light.r * 2);
  }
  ctx.drawImage(layer, 0, 0, width, height);

  drawCapTips(ctx, world, time);
  if (world.level.fireflies) {
    for (const fly of fireflies(world, time)) {
      ctx.fillStyle = 'rgba(255, 240, 150, 0.95)';
      ctx.shadowColor = '#fff08a';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(fly.x, fly.y, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
}

/** Small glowing fungi on the tips of every gap's edges: the way through, faintly marked even in the dark. */
function drawCapTips(ctx: CanvasRenderingContext2D, world: World, time: number): void {
  ctx.save();
  ctx.shadowColor = '#7fe6ff';
  for (const root of world.roots) {
    const edges = [gapTop(root), gapBottom(root)];
    const extra = extraGap(root);
    if (extra) edges.push(extra.top, extra.bottom);
    const x = rootLeft(root);
    ctx.shadowBlur = root.passed ? 12 : 6;
    ctx.fillStyle = root.passed ? 'rgba(160, 240, 255, 0.95)' : `rgba(127, 230, 255, ${0.55 + Math.sin(time * 2 + root.index) * 0.12})`;
    for (const y of edges) {
      for (const at of [0.2, 0.5, 0.8]) {
        ctx.beginPath();
        ctx.arc(x + root.width * at, y, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

/** Fireflies hovering in the next few gaps ahead, showing the way. */
function fireflies(world: World, time: number): { x: number; y: number }[] {
  return world.roots
    .filter((root) => !root.passed)
    .slice(0, 3)
    .map((root, i) => ({
      x: rootLeft(root) + root.width / 2 + Math.sin(time * 2.3 + i * 2) * 10,
      y: root.gapCenter + Math.cos(time * 1.7 + i) * 12,
    }));
}
