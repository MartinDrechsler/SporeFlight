import { sin } from '../core/fmath';
import type { HazardKind } from '../config/levels';
import { TUNING } from '../config/tuning';
import { circlesTouch, circleToBoxGap } from './collision';
import type { Root } from './roots';
import type { World } from './world';

const H = TUNING.hazards;

/**
 * Cave hazards between two roots. Each moves in a fixed pattern from level
 * data, so the same level always plays the same way (Koster: a pattern is
 * something to learn; randomness would only be noise).
 *
 * - A bat flutters up and down across the way at a steady beat.
 * - A stalactite hangs from the ceiling. It starts to drip when the mushroom
 *   comes near (the warning), and drops when the mushroom is right below it:
 *   pass a dripping stalactite low.
 */
export type Hazard =
  | { kind: 'bat'; x: number; y: number; centre: number; phase: number; time: number }
  | { kind: 'stalactite'; x: number; y: number; vy: number; state: 'hanging' | 'dripping' | 'falling' };

/** Places the hazard the level puts after this root, midway to the next one. */
export function spawnHazard(world: World, root: Root, kind: HazardKind): void {
  const x = root.x + root.width + (world.level.spacing - root.width) / 2;
  if (kind === 'bat') {
    const phase = root.index * 1.3;
    world.hazards.push({ kind, x, centre: root.gapCenter, phase, time: 0, y: root.gapCenter + sin(phase) * H.batSwing });
  } else {
    world.hazards.push({ kind, x, y: 0, vy: 0, state: 'hanging' });
  }
}

/** Scrolls and moves the hazards. Stalactites drip and drop as the mushroom comes near. */
export function stepHazards(world: World, travelled: number, dt: number): void {
  for (const hazard of world.hazards) {
    hazard.x -= travelled;
    if (hazard.kind === 'bat') {
      hazard.time += dt;
      hazard.y = hazard.centre + sin(hazard.phase + hazard.time * H.batBeat) * H.batSwing;
      continue;
    }
    const ahead = hazard.x - world.player.x;
    if (hazard.state === 'hanging' && ahead < H.dripAhead) {
      hazard.state = 'dripping';
      world.events.push({ type: 'drip', x: hazard.x });
    }
    if (hazard.state === 'dripping' && ahead < H.dropAhead) hazard.state = 'falling';
    if (hazard.state === 'falling') {
      hazard.vy += H.fallGravity * dt;
      hazard.y += hazard.vy * dt;
    }
  }
  world.hazards = world.hazards.filter((hazard) => hazard.x > -60 && hazard.y < world.groundY + 20);
}

/** The hazard touching the mushroom, if any. */
export function hazardHittingPlayer(world: World): Hazard | null {
  const { player } = world;
  return (
    world.hazards.find((hazard) =>
      hazard.kind === 'bat'
        ? circlesTouch(player.x, player.y, player.radius, hazard.x, hazard.y, H.batRadius, 0.85)
        : circleToBoxGap(player.x, player.y, player.radius * 0.85, stalactiteBox(hazard)) < 0,
    ) ?? null
  );
}

/** A stalactite's solid part: a narrow column from its base down to its tip. */
export function stalactiteBox(hazard: { x: number; y: number }): { x: number; y: number; w: number; h: number } {
  return { x: hazard.x - H.stalactiteWidth / 2, y: hazard.y, w: H.stalactiteWidth, h: H.stalactiteLength };
}
