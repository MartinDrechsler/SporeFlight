import type { LevelConfig } from '../config/levels';
import type { RunStats } from '../config/rewards';
import { TUNING } from '../config/tuning';
import type { Random } from '../core/random';
import { circlesTouch, isNearMiss, playerHitsGround, playerHitsRoot } from './collision';
import { createPlayer, flap, stepPlayer, type Player } from './player';
import { isMagnetic, pickupPosition, pullToward, type Pickup, type PickupKind } from './pickups';
import { rootLeft, stepRoot, type Root } from './roots';
import { makePickup, makeRoot, makeWindZone, nextWindDistance, type Field } from './spawner';
import { windContains, type WindZone } from './wind';

const P = TUNING.player;
const W = TUNING.world;
const PK = TUNING.pickups;
const NM = TUNING.nearMiss;
const WD = TUNING.wind;

/** Things that happened during a step. Audio, effects, HUD and quests react to these. */
export type GameEvent =
  | { type: 'flap' }
  | { type: 'pass'; score: number; rootX: number }
  | { type: 'pickup'; kind: PickupKind; x: number; y: number; coins: number }
  | { type: 'nearMiss'; x: number; y: number }
  | { type: 'shieldPop'; x: number; y: number }
  | { type: 'milestone'; score: number }
  | { type: 'wind'; kind: WindZone['kind']; x: number; y: number }
  | { type: 'crash'; x: number; y: number }
  | { type: 'landed'; x: number; y: number };

/**
 * Everything about one round of play, from the first flap until a crash.
 * Lives, saving and screens are handled outside, by the states.
 */
export interface World extends Field {
  readonly width: number;
  readonly rng: Random;
  readonly level: LevelConfig;
  player: Player;
  roots: Root[];
  pickups: Pickup[];
  winds: WindZone[];
  /** Numbers for achievements and quests; `stats.score` is the round's score (1 per root). */
  stats: RunStats;
  rootsSpawned: number;
  rootsPassed: number;
  milestonesReached: number;
  /** Scroll speed in px/s before the multiplier. */
  baseSpeed: number;
  speedMultiplier: number;
  /** Total distance scrolled; backgrounds and crash markers are placed by it. */
  distance: number;
  distanceSinceSpawn: number;
  distanceToWind: number;
  shield: boolean;
  invulnerableTime: number;
  magnetTime: number;
  slowMotionTime: number;
  windWarningCooldown: number;
  crashed: boolean;
  /** Seconds since the crashed mushroom touched the ground; null while still flying or falling. */
  landedTime: number | null;
  /** Filled during `stepWorld`; the caller reads and clears it. */
  events: GameEvent[];
}

export function createWorld(width: number, height: number, level: LevelConfig, rng: Random): World {
  return {
    width,
    height,
    groundY: height - W.groundHeight,
    rng,
    level,
    player: createPlayer(width, height),
    roots: [],
    pickups: [],
    winds: [],
    stats: { score: 0, flaps: 0, coins: 0, diamonds: 0, nearMisses: 0 },
    rootsSpawned: 0,
    rootsPassed: 0,
    milestonesReached: 0,
    baseSpeed: level.speed,
    speedMultiplier: level.speedMultiplier,
    distance: 0,
    // The first root appears right away, at the right edge.
    distanceSinceSpawn: level.spacing,
    distanceToWind: nextWindDistance(rng),
    shield: false,
    invulnerableTime: 0,
    magnetTime: 0,
    slowMotionTime: 0,
    windWarningCooldown: 0,
    crashed: false,
    landedTime: null,
    events: [],
  };
}

export function flapPlayer(world: World): void {
  if (world.crashed) return;
  flap(world.player);
  world.stats.flaps += 1;
  world.events.push({ type: 'flap' });
}

export function scrollSpeed(world: World): number {
  return world.baseSpeed * world.speedMultiplier;
}

export function isInvulnerable(world: World): boolean {
  return world.invulnerableTime > 0;
}

/** All coins collected this round, ready to be banked. */
export function roundCoins(world: World): number {
  return world.stats.coins;
}

/** Advances a round by `dt` seconds of real time. */
export function stepWorld(world: World, realDt: number): void {
  if (world.crashed) {
    stepCrashed(world, realDt);
    return;
  }

  // A near miss briefly slows the whole world down.
  const dt = world.slowMotionTime > 0 ? realDt * NM.slowMotionFactor : realDt;
  world.slowMotionTime = Math.max(0, world.slowMotionTime - realDt);
  tickTimers(world, dt);

  updateSpeed(world, dt);
  const speed = scrollSpeed(world);
  world.distance += speed * dt;

  updateWind(world, dt, speed);
  stepPlayer(world.player, dt);
  if (keepInBounds(world)) return;

  spawnRootIfDue(world, speed * dt);
  for (const root of world.roots) stepRoot(root, dt, speed);
  if (checkRootCollisions(world)) return;

  attractPickups(world, dt);
  scorePasses(world);
  collectPickups(world);
  checkNearMisses(world);
  checkMilestones(world);
  removeOffscreen(world);
}

/** After a crash the mushroom just falls to the ground; nothing else moves. */
function stepCrashed(world: World, dt: number): void {
  const player = world.player;
  if (world.landedTime !== null) {
    world.landedTime += dt;
    return;
  }
  stepPlayer(player, dt);
  if (playerHitsGround(player, world.groundY) && player.vy >= 0) {
    player.y = world.groundY - player.radius;
    player.vy = 0;
    world.landedTime = 0;
    world.events.push({ type: 'landed', x: player.x, y: player.y });
  }
}

/** Where along the level the mushroom fell; its mushroom clump grows here. */
export function crashSpot(world: World): number {
  return world.distance + world.player.x;
}

function tickTimers(world: World, dt: number): void {
  world.invulnerableTime = Math.max(0, world.invulnerableTime - dt);
  world.magnetTime = Math.max(0, world.magnetTime - dt);
  world.windWarningCooldown = Math.max(0, world.windWarningCooldown - dt);
}

function updateSpeed(world: World, dt: number): void {
  world.baseSpeed = Math.min(Math.max(W.maxSpeed, world.level.speed), world.baseSpeed + W.acceleration * dt);
  const steps = Math.floor(world.rootsPassed / W.speedStepEvery);
  const target = world.level.speedMultiplier + steps * W.speedStepAmount;
  const step = W.speedEaseRate * dt;
  world.speedMultiplier += Math.max(-step, Math.min(step, target - world.speedMultiplier));
}

function updateWind(world: World, dt: number, speed: number): void {
  for (const zone of world.winds) zone.x -= speed * dt;
  world.winds = world.winds.filter((zone) => zone.x + zone.width > 0);

  const windFrom = world.level.windFromRoot;
  if (windFrom !== null && world.rootsPassed >= windFrom) {
    world.distanceToWind -= speed * dt;
    if (world.distanceToWind <= 0) {
      world.winds.push(makeWindZone(world.rng, world.width));
      world.distanceToWind = nextWindDistance(world.rng);
    }
  }

  const player = world.player;
  for (const zone of world.winds) {
    if (!windContains(zone, player)) continue;
    player.vy += (zone.kind === 'updraft' ? -WD.force : WD.force) * dt;
    if (world.windWarningCooldown === 0) {
      world.windWarningCooldown = WD.warningCooldownSeconds;
      world.events.push({ type: 'wind', kind: zone.kind, x: player.x, y: player.y });
    }
  }
}

/** Ceiling bumps softly; the ground is deadly unless the mushroom is invulnerable. Returns true on crash. */
function keepInBounds(world: World): boolean {
  const player = world.player;
  if (player.y - player.radius <= 0) {
    player.y = player.radius;
    player.vy = Math.max(player.vy, 0);
  }
  if (!playerHitsGround(player, world.groundY)) return false;
  player.y = world.groundY - player.radius;
  if (isInvulnerable(world)) {
    player.vy = Math.min(player.vy, 0);
    return false;
  }
  crash(world);
  return true;
}

function spawnRootIfDue(world: World, travelled: number): void {
  world.distanceSinceSpawn += travelled;
  if (world.distanceSinceSpawn < world.level.spacing) return;
  world.distanceSinceSpawn -= world.level.spacing;

  const previous = world.roots.at(-1);
  const root = makeRoot(world.rng, world.level, world, world.width, world.rootsSpawned, previous?.gapCenter ?? null);
  const pickup = makePickup(world.rng, root, world.rootsSpawned, world.level, world);
  world.roots.push(root);
  if (pickup) world.pickups.push(pickup);
  world.rootsSpawned += 1;
}

/** Returns true when the round ended. A shield absorbs one hit instead. */
function checkRootCollisions(world: World): boolean {
  if (isInvulnerable(world)) return false;
  const hit = world.roots.some((root) => playerHitsRoot(world.player, root, world.groundY));
  if (!hit) return false;

  if (world.shield) {
    world.shield = false;
    world.invulnerableTime = TUNING.shield.graceSeconds;
    world.events.push({ type: 'shieldPop', x: world.player.x, y: world.player.y });
    return false;
  }
  crash(world);
  return true;
}

function crash(world: World): void {
  world.crashed = true;
  world.player.vy = P.crashHopVelocity;
  world.events.push({ type: 'crash', x: world.player.x, y: world.player.y });
}

function attractPickups(world: World, dt: number): void {
  if (world.magnetTime <= 0) return;
  for (const pickup of world.pickups) {
    if (isMagnetic(pickup)) pullToward(pickup, world.player.x, world.player.y, dt);
  }
}

function scorePasses(world: World): void {
  for (const root of world.roots) {
    if (root.passed || rootLeft(root) + root.width >= world.player.x) continue;
    root.passed = true;
    world.rootsPassed += 1;
    world.stats.score += 1;
    world.events.push({ type: 'pass', score: world.stats.score, rootX: rootLeft(root) + root.width / 2 });
  }
}

function collectPickups(world: World): void {
  const player = world.player;
  for (const pickup of world.pickups) {
    if (pickup.collected) continue;
    const { x, y } = pickupPosition(pickup);
    if (!circlesTouch(player.x, player.y, player.radius, x, y, PK.radius, PK.collectRadiusFactor)) continue;
    pickup.collected = true;
    world.events.push({ type: 'pickup', kind: pickup.kind, x, y, coins: applyPickup(world, pickup.kind) });
  }
}

/** Applies a pickup's effect and returns the coins it was worth. */
function applyPickup(world: World, kind: PickupKind): number {
  switch (kind) {
    case 'coin':
      world.stats.coins += 1;
      return 1;
    case 'diamond':
      world.stats.diamonds += 1;
      return 0;
    case 'shield':
      world.shield = true;
      return 0;
    case 'magnet':
      world.magnetTime = TUNING.magnet.seconds;
      return 0;
  }
}

function checkNearMisses(world: World): void {
  if (isInvulnerable(world)) return;
  for (const root of world.roots) {
    if (root.nearMissCounted || !isNearMiss(world.player, root, world.groundY)) continue;
    root.nearMissCounted = true;
    world.stats.nearMisses += 1;
    world.slowMotionTime = NM.slowMotionSeconds;
    world.events.push({ type: 'nearMiss', x: world.player.x, y: world.player.y });
  }
}

function checkMilestones(world: World): void {
  const next = TUNING.milestones[world.milestonesReached];
  if (next === undefined || world.stats.score < next) return;
  world.milestonesReached += 1;
  world.events.push({ type: 'milestone', score: next });
}

function removeOffscreen(world: World): void {
  world.roots = world.roots.filter((root) => rootLeft(root) + root.width > -20);
  world.pickups = world.pickups.filter((pickup) => !pickup.collected && pickupPosition(pickup).x > -20);
}
