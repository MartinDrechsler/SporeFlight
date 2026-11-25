import { rootCount, type Stage } from '../config/levels';
import { TUNING } from '../config/tuning';
import { createBoss, sendAway } from './boss';
import type { World } from './world';
import { isClearing, makeCoinCluster, makePickup, makeRoot } from './spawner';

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
}

export function createCourse(): Course {
  return { stage: 0, stageRoots: 0, stageTime: 0, afterClearing: false, gateX: null, finished: false };
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
    world.boss ??= createBoss(world, stage.seconds);
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
  world.roots.push(root);
  // Every hit on a vein gives a diamond.
  if (root.vein) world.offered.diamonds += TUNING.veins.hitsToBreak;
  if (pickup) {
    world.pickups.push(pickup);
    if (pickup.kind === 'coin') world.offered.coins += 1;
    if (pickup.kind === 'diamond') world.offered.diamonds += 1;
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
