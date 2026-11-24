import { skinById } from '../config/skins';
import { THEMES } from '../config/theme';
import { TUNING } from '../config/tuning';
import { crashSpot, isInvulnerable, type World } from '../gameplay/world';
import { drawBackground, drawDeathMarks } from './background';
import type { Surface } from './canvas';
import { drawPlayer } from './drawPlayer';
import { drawBoss } from './drawBoss';
import { applyView } from './view';
import { drawGate, drawPickup, drawRoot, drawWind } from './drawRoots';
import type { Effects } from './effects';

export interface Scene {
  world: World;
  skinId: string;
  effects: Effects;
  /** Distances where earlier rounds of this level ended; mushroom clumps grow there. */
  deathMarks: readonly number[];
  /** Seconds since the game launched; drives idle animations. */
  time: number;
}

/** Draws one complete frame. Reads game state, never changes it. */
export function renderScene(surface: Surface, scene: Scene): void {
  const { ctx, width, height } = surface;
  const { world, time } = scene;
  const theme = THEMES[world.level.theme];
  const shake = scene.effects.shakeOffset();

  ctx.save();
  ctx.translate(shake.x, shake.y);
  applyView(ctx, world.level.view, width, height);
  drawBackground(ctx, {
    theme,
    width,
    height,
    groundY: world.groundY,
    distance: world.distance,
    time,
    backdropScore: world.level.progressive ? world.stats.score : null,
  });
  for (const zone of world.winds) drawWind(ctx, zone, world.groundY, time);
  for (const pickup of world.pickups) drawPickup(ctx, pickup, time);
  for (const root of world.roots) drawRoot(ctx, root, theme, world.groundY, time);
  const gateX = world.course.gateX;
  if (gateX !== null) drawGate(ctx, gateX, world.groundY, theme, time, world.course.finished);
  if (world.boss) drawBoss(ctx, world.boss, theme, time);
  drawPlayer(ctx, world.player, skinById(scene.skinId), {
    crashed: world.crashed,
    shield: world.shield,
    magnet: world.magnetTime > 0,
    invulnerable: isInvulnerable(world),
    time,
  });
  // Clumps sit in front, so the one growing beside a fallen mushroom is not hidden behind it.
  const newMark =
    world.landedTime === null ? null : { at: crashSpot(world), grow: Math.min(1, world.landedTime / TUNING.roundOver.clumpGrowSeconds) };
  drawDeathMarks(ctx, scene.deathMarks, newMark, width, world.groundY, world.distance, time);
  ctx.restore();
  scene.effects.draw(ctx, width, height, world.level.view);
}
