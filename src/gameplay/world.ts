import { TUNING } from '../config/tuning';
import type { Random } from '../core/random';
import { circlesTouch, playerHitsGround, playerHitsRoot } from './collision';
import { createCombo, extendCombo, pointsForPass, stepCombo, type Combo } from './combo';
import { createPlayer, flap, stepPlayer, type Player } from './player';
import { stepRoot, type Root } from './roots';
import { makePickup, makeRoot, type Pickup, type PickupKind } from './spawner';

const W = TUNING.world;
const R = TUNING.roots;
const PK = TUNING.pickups;

/** Things that happened during a step. Audio, effects and the HUD react to these. */
export type GameEvent =
  | { type: 'flap' }
  | { type: 'pass'; points: number; multiplier: number }
  | { type: 'fever' }
  | { type: 'pickup'; kind: PickupKind; x: number; y: number }
  | { type: 'crash'; x: number; y: number };

/**
 * Everything about one round of play: from the first flap until a crash.
 * Lives, saving and screens are handled outside, by the states.
 */
export interface World {
  readonly width: number;
  readonly height: number;
  readonly groundY: number;
  readonly rng: Random;
  player: Player;
  roots: Root[];
  pickups: Pickup[];
  combo: Combo;
  score: number;
  coins: number;
  diamonds: number;
  rootsSpawned: number;
  rootsPassed: number;
  /** Scroll speed in px/s before the multiplier. */
  baseSpeed: number;
  speedMultiplier: number;
  /** Total distance scrolled; the background derives its parallax from this. */
  distance: number;
  distanceSinceSpawn: number;
  crashed: boolean;
  /** Filled during `stepWorld`; the caller reads and clears it. */
  events: GameEvent[];
}

export function createWorld(width: number, height: number, rng: Random): World {
  return {
    width,
    height,
    groundY: height - W.groundHeight,
    rng,
    player: createPlayer(width, height),
    roots: [],
    pickups: [],
    combo: createCombo(),
    score: 0,
    coins: 0,
    diamonds: 0,
    rootsSpawned: 0,
    rootsPassed: 0,
    baseSpeed: W.startSpeed,
    speedMultiplier: 1,
    distance: 0,
    // First root appears right away, at the right edge.
    distanceSinceSpawn: R.spacing,
    crashed: false,
    events: [],
  };
}

export function flapPlayer(world: World): void {
  if (world.crashed) return;
  flap(world.player);
  world.events.push({ type: 'flap' });
}

export function scrollSpeed(world: World): number {
  return world.baseSpeed * world.speedMultiplier;
}

/** Advances an active round by `dt` seconds. */
export function stepWorld(world: World, dt: number): void {
  if (world.crashed) {
    stepCrashed(world, dt);
    return;
  }

  updateSpeed(world, dt);
  const speed = scrollSpeed(world);
  world.distance += speed * dt;
  world.distanceSinceSpawn += speed * dt;

  stepPlayer(world.player, dt);
  bumpCeiling(world.player);
  for (const root of world.roots) stepRoot(root, dt, speed);
  for (const pickup of world.pickups) pickup.x -= speed * dt;
  stepCombo(world.combo, dt);

  spawnIfDue(world);
  if (checkCrash(world)) return;
  scorePasses(world);
  collectPickups(world);
  removeOffscreen(world);
}

/** After a crash the mushroom just falls to the ground; nothing else moves. */
function stepCrashed(world: World, dt: number): void {
  const player = world.player;
  if (playerHitsGround(player, world.groundY)) {
    player.y = world.groundY - player.radius;
    player.vy = 0;
    return;
  }
  stepPlayer(player, dt);
}

/** The sky is not deadly: the mushroom softly bumps off the top edge. */
function bumpCeiling(player: Player): void {
  if (player.y - player.radius > 0) return;
  player.y = player.radius;
  player.vy = Math.max(player.vy, 0);
}

function updateSpeed(world: World, dt: number): void {
  world.baseSpeed = Math.min(W.maxSpeed, world.baseSpeed + W.acceleration * dt);
  const target = 1 + Math.floor(world.rootsPassed / W.speedStepEvery) * W.speedStepAmount;
  const step = W.speedEaseRate * dt;
  world.speedMultiplier += Math.max(-step, Math.min(step, target - world.speedMultiplier));
}

function spawnIfDue(world: World): void {
  if (world.distanceSinceSpawn < R.spacing) return;
  world.distanceSinceSpawn -= R.spacing;

  const previous = world.roots.at(-1);
  const root = makeRoot(world.rng, world.width, world.height, world.rootsSpawned, previous?.gapCenter ?? null);
  const pickup = makePickup(world.rng, root, world.rootsSpawned, world.height);
  world.roots.push(root);
  if (pickup) world.pickups.push(pickup);
  world.rootsSpawned += 1;
}

function checkCrash(world: World): boolean {
  const player = world.player;
  const hitRoot = world.roots.some((root) => playerHitsRoot(player, root, world.groundY));
  if (!hitRoot && !playerHitsGround(player, world.groundY)) return false;

  world.crashed = true;
  // A crash knocks the mushroom downward, never upward.
  player.vy = Math.max(player.vy, 0);
  world.events.push({ type: 'crash', x: player.x, y: player.y });
  return true;
}

function scorePasses(world: World): void {
  for (const root of world.roots) {
    if (root.passed || root.x + root.width >= world.player.x) continue;
    root.passed = true;
    world.rootsPassed += 1;
    const enteredFever = extendCombo(world.combo);
    const points = pointsForPass(world.combo);
    world.score += points;
    world.events.push({ type: 'pass', points, multiplier: world.combo.multiplier });
    if (enteredFever) world.events.push({ type: 'fever' });
  }
}

function collectPickups(world: World): void {
  const player = world.player;
  for (const pickup of world.pickups) {
    if (pickup.collected) continue;
    if (!circlesTouch(player.x, player.y, player.radius, pickup.x, pickup.y, PK.radius, PK.collectRadiusFactor)) continue;
    pickup.collected = true;
    if (pickup.kind === 'coin') world.coins += 1;
    else world.diamonds += 1;
    world.events.push({ type: 'pickup', kind: pickup.kind, x: pickup.x, y: pickup.y });
  }
}

function removeOffscreen(world: World): void {
  world.roots = world.roots.filter((root) => root.x + root.width > -10);
  world.pickups = world.pickups.filter((pickup) => !pickup.collected && pickup.x > -20);
}
