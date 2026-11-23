import type { Skin, Theme } from '../config/theme';
import { isFever } from '../gameplay/combo';
import type { World } from '../gameplay/world';
import { drawBackground } from './background';
import type { Surface } from './canvas';
import { drawPlayer } from './drawPlayer';
import { drawPickup, drawRoot } from './drawRoots';
import type { Effects } from './effects';

export interface Scene {
  world: World;
  theme: Theme;
  skin: Skin;
  effects: Effects;
  /** Seconds since the game launched; drives idle animations. */
  time: number;
}

/** Draws one complete frame. Reads game state, never changes it. */
export function renderScene(surface: Surface, scene: Scene): void {
  const { ctx, width, height } = surface;
  const { world, theme, time } = scene;

  drawBackground(ctx, theme, width, height, world.groundY, world.distance, time);
  for (const pickup of world.pickups) drawPickup(ctx, pickup, time);
  for (const root of world.roots) drawRoot(ctx, root, theme, world.groundY, time);
  drawPlayer(ctx, world.player, scene.skin, { crashed: world.crashed, fever: isFever(world.combo), time });
  scene.effects.draw(ctx);
}
