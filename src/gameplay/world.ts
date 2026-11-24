import type { LevelConfig } from '../config/levels';
import type { RunStats } from '../config/rewards';
import { TUNING } from '../config/tuning';
import { createRandom, type Random } from '../core/random';
import { circlesTouch, isNearMiss, playerHitsGround, playerHitsRoot } from './collision';
import { createPlayer, flap, stepPlayer, type Player } from './player';
import { isMagnetic, pickupPosition, pullToward, scrollPickup, type Pickup, type PickupKind } from './pickups';
import { rootLeft, stepRoot, type Root } from './roots';
import { removeRock, rockHittingPlayer, stepBoss, type Boss } from './boss';
import { createCourse, stepCourse, type Course } from './course';
import { makeWindZone, nextWindDistance, type Field } from './spawner';
import { windContains, type WindZone } from './wind';

const P = TUNING.player;
const W = TUNING.world;
const PK = TUNING.pickups;
const NM = TUNING.nearMiss;
const WD = TUNING.wind;
/** Base of the per-level seed for fixed layouts. */
const LAYOUT_SEED = 7_000;

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
  | { type: 'landed'; x: number; y: number }
  /** The Stone Thrower is about to throw (its eyes flare). */
  | { type: 'bossWarn'; x: number; y: number }
  | { type: 'bossThrow'; x: number; y: number }
  /** The mushroom flew through the finish gate. */
  | { type: 'finish'; x: number; y: number };

/**
 * Everything about one round of play, from the first flap until a crash or the finish gate.
 * Lives, saving and screens are handled outside, by the states.
 */
export interface World extends Field {
  readonly width: number;
  /** Randomness for this attempt (boss attacks). */
  readonly rng: Random;
  /** Randomness for roots, pickups and wind; seeded by the level when its layout is fixed. */
  readonly layoutRng: Random;
  readonly level: LevelConfig;
  course: Course;
  /** The Stone Thrower, during a boss stage and while it leaves. */
  boss: Boss | null;
  player: Player;
  roots: Root[];
  pickups: Pickup[];
  winds: WindZone[];
  /** Numbers for achievements and quests; `stats.score` is the round's score (1 per root). */
  stats: RunStats;
  /** Valuables that appeared this round, for the star rating. */
  offered: { coins: number; diamonds: number };
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
  // A fixed layout is the same on every attempt: its randomness is seeded by the level alone.
  const layoutRng = level.fixedLayout ? createRandom(LAYOUT_SEED + level.id) : rng;
  return {
    width,
    height,
    groundY: height - W.groundHeight,
    rng,
    layoutRng,
    level,
    course: createCourse(),
    boss: null,
    player: createPlayer(width, height),
    roots: [],
    pickups: [],
    winds: [],
    stats: { score: 0, flaps: 0, coins: 0, diamonds: 0, nearMisses: 0 },
    offered: { coins: 0, diamonds: 0 },
    rootsSpawned: 0,
    rootsPassed: 0,
    milestonesReached: 0,
    baseSpeed: level.speed,
    speedMultiplier: level.speedMultiplier,
    distance: 0,
    // The first root appears right away, at the right edge.
    distanceSinceSpawn: level.spacing,
    distanceToWind: nextWindDistance(layoutRng),
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
  if (world.course.finished) {
    stepFinished(world, realDt);
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

  stepCourse(world, speed * dt, dt);
  for (const root of world.roots) stepRoot(root, dt, speed);
  for (const pickup of world.pickups) scrollPickup(pickup, speed * dt);
  stepBoss(world, dt);
  if (checkHits(world)) return;

  attractPickups(world, dt);
  scorePasses(world);
  collectPickups(world);
  checkNearMisses(world);
  checkMilestones(world);
  removeOffscreen(world);
}

/** Through the gate: the forest drifts on while the mushroom glides to a calm hover. Nothing can hurt it. */
function stepFinished(world: World, dt: number): void {
  const speed = scrollSpeed(world);
  world.distance += speed * dt;
  for (const root of world.roots) stepRoot(root, dt, speed);
  for (const pickup of world.pickups) scrollPickup(pickup, speed * dt);
  stepBoss(world, dt);
  if (world.course.gateX !== null) world.course.gateX -= speed * dt;
  const player = world.player;
  player.vy = 0;
  player.y += (world.height * 0.42 - player.y) * Math.min(1, dt * 2);
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
      world.winds.push(makeWindZone(world.layoutRng, world.width));
      world.distanceToWind = nextWindDistance(world.layoutRng);
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

/** Roots and rocks are deadly. Returns true when the round ended; a shield absorbs one hit instead. */
function checkHits(world: World): boolean {
  if (isInvulnerable(world)) return false;
  const rock = rockHittingPlayer(world);
  // A rock that is absorbed shatters, so it cannot hit twice.
  if (rock) removeRock(world, rock);
  const hit = rock !== null || world.roots.some((root) => playerHitsRoot(world.player, root, world.groundY));
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

/** Endless only: in a level, the finish gate is the goal. */
function checkMilestones(world: World): void {
  if (!world.level.progressive) return;
  const next = TUNING.milestones[world.milestonesReached];
  if (next === undefined || world.stats.score < next) return;
  world.milestonesReached += 1;
  world.events.push({ type: 'milestone', score: next });
}

function removeOffscreen(world: World): void {
  world.roots = world.roots.filter((root) => rootLeft(root) + root.width > -20);
  world.pickups = world.pickups.filter((pickup) => !pickup.collected && pickupPosition(pickup).x > -20);
}
