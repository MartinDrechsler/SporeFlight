import { rootCount, type Stage } from '../config/levels';
import { TUNING } from '../config/tuning';
import { createBoss, sendAway } from './boss';
import { spawnHazard } from './hazards';
import type { World } from './world';
import { forkGap, isClearing, makeCoinCluster, makePickup, makeRoot, makeSporeling, sporelingSide } from './spawner';

/**
 * A level's route: its stages in order, then the finish gate. Endless is one
 * roots stage that never ends, so it runs through the same code.
 */
export interface Course {
  /** Index of the current stage; equal to the stage count once the gate is due. */
  stage: number;
  /** Roots spawned in the current stage. */
  stageRoots: number;
  /** Seconds spent in the current stage. */
  stageTime: number;
  /** The last slot was a clearing (no root, a cluster of coins). */
  afterClearing: boolean;
  /** Screen x of the finish gate's centre once it has appeared. */
  gateX: number | null;
  finished: boolean;
  /** Finished through the secret gap instead of the gate. */
  secret: boolean;
}

export function createCourse(): Course {
  return { stage: 0, stageRoots: 0, stageTime: 0, afterClearing: false, gateX: null, finished: false, secret: false };
}

export function currentStage(world: World): Stage | null {
  return world.level.stages[world.course.stage] ?? null;
}

/**
 * Moves the route on by one step: spawns roots that are due, moves to the next
 * stage when one is done, and places and checks the finish gate.
 * `travelled` is the distance scrolled this step.
 */
export function stepCourse(world: World, travelled: number, dt: number): void {
  const course = world.course;
  course.stageTime += dt;
  world.distanceSinceSpawn += travelled;
  const stage = currentStage(world);

  if (stage?.kind === 'roots') {
    if (world.distanceSinceSpawn < world.level.spacing) return;
    world.distanceSinceSpawn -= world.level.spacing;
    // The stage ends one spacing after its last root, so the next thing appears where a root would.
    if (stage.count !== null && course.stageRoots >= stage.count) nextStage(world);
    else spawnRoot(world);
    if (currentStage(world) === null) placeGate(world);
    return;
  }
  if (stage?.kind === 'boss') {
    world.boss ??= createBoss(world, stage.seconds, stage.boss);
    if (course.stageTime < stage.seconds) return;
    sendAway(world.boss);
    nextStage(world);
    if (currentStage(world) === null) placeGate(world);
    return;
  }
  moveGate(world, travelled);
}

/** Share of the level done, 0 to 1 (endless: always 0). Roots and boss seconds count the same. */
export function courseProgress(world: World): number {
  const stages = world.level.stages;
  const size = (stage: Stage): number => (stage.kind === 'roots' ? (stage.count ?? 0) : stage.seconds);
  const total = stages.reduce((sum, stage) => sum + size(stage), 0);
  if (total === 0) return 0;
  const course = world.course;
  let done = 0;
  stages.forEach((stage, index) => {
    if (index < course.stage) done += size(stage);
    else if (index === course.stage) done += stage.kind === 'roots' ? passedInStage(world) : Math.min(stage.seconds, course.stageTime);
  });
  return Math.min(1, done / total);
}

/** Roots that will appear in the whole level; endless has no end, so 0. */
export function levelRoots(world: World): number {
  return rootCount(world.level);
}

function passedInStage(world: World): number {
  const earlier = world.level.stages
    .slice(0, world.course.stage)
    .reduce((sum, stage) => sum + (stage.kind === 'roots' ? (stage.count ?? 0) : 0), 0);
  return Math.max(0, world.rootsPassed - earlier);
}

function nextStage(world: World): void {
  world.course.stage += 1;
  world.course.stageRoots = 0;
  world.course.stageTime = 0;
}

function spawnRoot(world: World): void {
  const previous = world.roots.at(-1);
  const index = world.rootsSpawned;
  const course = world.course;
  course.afterClearing = isClearing(world.layoutRng, world.level, index, course.afterClearing);
  if (course.afterClearing) {
    const coins = makeCoinCluster(world, world.width, previous?.gapCenter ?? world.height * 0.45);
    world.pickups.push(...coins);
    world.offered.coins += coins.length;
    return;
  }
  const root = makeRoot(world.layoutRng, world.level, world, world.width, index, previous?.gapCenter ?? null);
  const pickup = makePickup(world.layoutRng, root, index, world.level, world);
  root.extra = forkGap(world.level, world, root);
  world.roots.push(root);
  // The tight route of a fork pays a coin.
  if (root.extra && !root.extra.secret) {
    world.pickups.push({ kind: 'coin', root, offsetX: root.width / 2, offsetY: root.extra.offset, vx: 0, vy: 0, collected: false });
    world.offered.coins += 1;
  }
  // Every hit on a vein gives a diamond.
  if (root.vein) world.offered.diamonds += TUNING.veins.hitsToBreak;
  if (pickup) {
    world.pickups.push(pickup);
    if (pickup.kind === 'coin') world.offered.coins += 1;
    if (pickup.kind === 'diamond') world.offered.diamonds += 1;
  }
  for (const hazard of world.level.hazards) if (hazard.root === index) spawnHazard(world, root, hazard.kind);
  for (const portal of world.level.portals) {
    if (portal.root === index) world.portals.push({ x: root.x + root.width + (world.level.spacing - root.width) / 2, mode: portal.mode, passed: false });
  }
  const side = sporelingSide(world.level, index);
  if (side !== null) {
    world.pickups.push(makeSporeling(root, side));
    world.offered.sporelings += 1;
  }
  world.rootsSpawned += 1;
  world.course.stageRoots += 1;
}

function placeGate(world: World): void {
  world.course.gateX = world.width + TUNING.gate.width / 2;
}

function moveGate(world: World, travelled: number): void {
  const course = world.course;
  if (course.gateX === null || course.finished) return;
  course.gateX -= travelled;
  if (course.gateX > world.player.x) return;
  course.finished = true;
  world.events.push({ type: 'finish', x: course.gateX, y: world.player.y });
}
