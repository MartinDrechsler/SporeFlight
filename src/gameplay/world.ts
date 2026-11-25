import type { FlightMode, LevelConfig } from '../config/levels';
import { setMode } from './modes';
import { hazardHittingPlayer, stepHazards, type Hazard } from './hazards';
import type { RunStats } from '../config/rewards';
import { TUNING } from '../config/tuning';
import { createRandom, type Random } from '../core/random';
import { circlesTouch, isNearMiss, isPastNearMissZone, playerHitsGround, playerHitsRoot } from './collision';
import { createPlayer, flap, stepPlayer, type Player } from './player';
import { detach, isMagnetic, pickupPosition, pullToward, scrollPickup, type Pickup, type PickupKind } from './pickups';
import { extraGap, rootLeft, stepRoot, type Root } from './roots';
import { removeRock, rockHittingPlayer, stepBoss, type Boss } from './boss';
import { bounceOffVeins } from './veins';
import { createCourse, stepCourse, type Course } from './course';
import { makeWindZone, nextWindDistance, type Field } from './spawner';
import { windContains, type WindZone } from './wind';

const P = TUNING.player;
const W = TUNING.world;
const PK = TUNING.pickups;
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
  /** Past the level's checkpoint: a crash from here on may restart from it. */
  | { type: 'checkpoint'; x: number }
  /** A stalactite starts to drip: it will drop when the mushroom is below. */
  | { type: 'drip'; x: number }
  /** Through a portal: the flight mode changes. */
  | { type: 'portal'; x: number; mode: FlightMode }
  /** Through a secret gap: the level is finished and a secret level found. */
  | { type: 'secret'; x: number; y: number }
  | { type: 'wind'; kind: WindZone['kind']; x: number; y: number }
  | { type: 'crash'; x: number; y: number }
  | { type: 'landed'; x: number; y: number }
  /** The mushroom bounced off a crystal vein and cracked a diamond out of it (`hits` so far). */
  | { type: 'veinHit'; x: number; y: number; hits: number }
  /** The vein broke open on its last hit (its last diamond came with that hit). */
  | { type: 'veinBreak'; x: number; y: number }
  /** The Stone Thrower is about to throw (its eyes flare). */
  | { type: 'bossWarn'; x: number; y: number }
  | { type: 'bossThrow'; x: number; y: number }
  /** The Bat Queen screeches: the light dims for a while. */
  | { type: 'bossScreech'; x: number; y: number }
  /** The mushroom flew through the finish gate. */
  | { type: 'finish'; x: number; y: number };

/**
 * Everything about one round of play, from the first flap until a crash or the finish gate.
 * Lives, saving and screens are handled outside, by the states.
 */
/** A ring across the field after a root: passing it switches the flight mode. */
export interface Portal {
  x: number;
  mode: FlightMode;
  passed: boolean;
}

/** A passed checkpoint: the first root after it, and what the run had earned and been offered by then. */
export interface Checkpoint {
  root: number;
  stats: RunStats;
  offered: { coins: number; diamonds: number; sporelings: number };
}

export interface World extends Field {
  readonly width: number;
  /** The round's seed: with the taps below, enough to replay the round exactly. */
  readonly seed: number;
  /** Where the mushroom started, px from the top. */
  readonly startY: number;
  /** Steps played so far (while flying). */
  steps: number;
  /** The step at which each flap happened, in order. */
  taps: number[];
  /** Randomness for this attempt (boss attacks), from `seed`. */
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
  /** Bats and stalactites between roots. */
  hazards: Hazard[];
  /** Portals ahead and behind: rings that switch the flight mode as the mushroom passes them. */
  portals: Portal[];
  /** The level's checkpoint once passed: where a restart begins, with what had been earned by then. */
  checkpoint: Checkpoint | null;
  /** Valuables that appeared this round, for the star rating. */
  offered: { coins: number; diamonds: number; sporelings: number };
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
  /** Seconds until a crystal vein can crack again (one crack per touch). */
  veinCooldown: number;
  windWarningCooldown: number;
  crashed: boolean;
  /** Seconds since the crashed mushroom touched the ground; null while still flying or falling. */
  landedTime: number | null;
  /** Filled during `stepWorld`; the caller reads and clears it. */
  events: GameEvent[];
}

/**
 * A new round. `startY` lets the menu's hovering mushroom carry straight on
 * into the round without jumping.
 */
export function createWorld(width: number, height: number, level: LevelConfig, seed: number, startY?: number): World {
  const rng = createRandom(seed);
  // A fixed layout is the same on every attempt: its randomness is seeded by the level alone.
  const layoutRng = level.fixedLayout ? createRandom(LAYOUT_SEED + level.id) : rng;
  const player = createPlayer(width, height);
  if (startY !== undefined) player.y = startY;
  setMode(player, level.startMode);
  return {
    width,
    height,
    groundY: height - W.groundHeight,
    seed: seed >>> 0,
    startY: player.y,
    steps: 0,
    taps: [],
    rng,
    layoutRng,
    level,
    course: createCourse(),
    boss: null,
    player,
    roots: [],
    pickups: [],
    winds: [],
    stats: { score: 0, flaps: 0, coins: 0, diamonds: 0, nearMisses: 0, veins: 0, sporelings: 0 },
    checkpoint: null,
    portals: [],
    hazards: [],
    offered: { coins: 0, diamonds: 0, sporelings: 0 },
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
    veinCooldown: 0,
    windWarningCooldown: 0,
    crashed: false,
    landedTime: null,
    events: [],
  };
}

/** The only way to flap. It also records the step, so the round can be replayed. */
export function flapPlayer(world: World): void {
  if (world.crashed) return;
  world.taps.push(world.steps);
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

/** Advances a round by `dt` seconds. */
export function stepWorld(world: World, dt: number): void {
  if (world.crashed) {
    stepCrashed(world, dt);
    return;
  }
  if (world.course.finished) {
    stepFinished(world, dt);
    return;
  }
  world.steps += 1;
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
  passPortals(world, speed * dt);
  stepHazards(world, speed * dt, dt);
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
  stepHazards(world, speed * dt, dt);
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
  world.veinCooldown = Math.max(0, world.veinCooldown - dt);
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
  // A crystal vein is never deadly: touching it bounces the mushroom away first.
  bounceOffVeins(world);
  if (isInvulnerable(world)) return false;
  const rock = rockHittingPlayer(world);
  // A rock that is absorbed shatters, so it cannot hit twice.
  if (rock) removeRock(world, rock);
  // So does a bat or stalactite.
  const hazard = hazardHittingPlayer(world);
  if (hazard) world.hazards = world.hazards.filter((h) => h !== hazard);
  const hit = rock !== null || hazard !== null || world.roots.some((root) => playerHitsRoot(world.player, root, world.groundY));
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
    const extra = extraGap(root);
    if (root.extra?.secret && extra && world.player.y > extra.top && world.player.y < extra.bottom) {
      world.course.finished = true;
      world.course.secret = true;
      world.events.push({ type: 'secret', x: world.player.x, y: world.player.y });
    }
    if (root.checkpoint && !world.checkpoint) {
      world.checkpoint = { root: root.index + 1, stats: { ...world.stats }, offered: { ...world.offered } };
      world.events.push({ type: 'checkpoint', x: rootLeft(root) + root.width });
    }
  }
}

function collectPickups(world: World): void {
  const player = world.player;
  for (const pickup of world.pickups) {
    if (pickup.collected) continue;
    const { x, y } = pickupPosition(pickup);
    const radius = pickup.kind === 'goldCoin' ? PK.goldenRadius : PK.radius;
    if (!circlesTouch(player.x, player.y, player.radius, x, y, radius, PK.collectRadiusFactor)) continue;
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
    case 'goldCoin':
      world.stats.coins += TUNING.pickups.goldenCoinValue;
      return TUNING.pickups.goldenCoinValue;
    case 'diamond':
      world.stats.diamonds += 1;
      return 0;
    case 'shield':
      world.shield = true;
      return 0;
    case 'magnet':
      world.magnetTime = TUNING.magnet.seconds;
      return 0;
    case 'sporeling':
      world.stats.sporelings += 1;
      return 0;
  }
}

/**
 * A root brushed closely becomes a near miss only once the mushroom is past it
 * alive: this runs after the hit checks, so a crash never shows one.
 */
function checkNearMisses(world: World): void {
  for (const root of world.roots) {
    if (root.nearMiss === 'none' && !isInvulnerable(world) && isNearMiss(world.player, root, world.groundY)) root.nearMiss = 'close';
    if (root.nearMiss !== 'close' || !isPastNearMissZone(world.player, root)) continue;
    root.nearMiss = 'counted';
    world.stats.nearMisses += 1;
    world.events.push({ type: 'nearMiss', x: world.player.x, y: world.player.y });
  }
}

/** Endless only: in a level, the finish gate is the goal. */
/**
 * Restarts a round from its level's checkpoint: the course runs on (roots,
 * pickups and wind spawn exactly as they did, so the layout stays the same)
 * without the mushroom, until the checkpoint is passed. Then the run gets
 * back what it had earned by then, and a moment of grace to find its rhythm.
 */
export function startFromCheckpoint(world: World, checkpoint: Checkpoint): void {
  const dt = 1 / 60;
  for (let guard = 0; world.rootsPassed < checkpoint.root && guard < 60 * 600; guard++) {
    updateSpeed(world, dt);
    const speed = scrollSpeed(world);
    world.distance += speed * dt;
    updateWind(world, dt, speed);
    stepCourse(world, speed * dt, dt);
    for (const root of world.roots) stepRoot(root, dt, speed);
    for (const pickup of world.pickups) scrollPickup(pickup, speed * dt);
    passPortals(world, speed * dt);
    stepHazards(world, speed * dt, dt);
    for (const root of world.roots) {
      if (root.passed || rootLeft(root) + root.width >= world.player.x) continue;
      root.passed = true;
      world.rootsPassed += 1;
    }
    removeOffscreen(world);
  }
  // Behind the mushroom is the past: what was collected there is in the checkpoint's stats.
  world.pickups = world.pickups.filter((pickup) => pickupPosition(pickup).x > world.player.x);
  world.stats = { ...checkpoint.stats };
  world.offered = { ...checkpoint.offered };
  world.checkpoint = checkpoint;
  world.events.length = 0;
  world.player.vy = 0;
  world.player.climbing = false;
  world.player.y = world.height * TUNING.player.startYFraction;
  world.invulnerableTime = TUNING.checkpoint.graceSeconds;
}

/** Moves the portals along; passing one switches the mushroom's flight mode. */
function passPortals(world: World, travelled: number): void {
  for (const portal of world.portals) {
    portal.x -= travelled;
    if (portal.passed || portal.x > world.player.x) continue;
    portal.passed = true;
    if (world.player.mode === portal.mode) continue;
    setMode(world.player, portal.mode);
    world.events.push({ type: 'portal', x: portal.x, mode: portal.mode });
  }
  world.portals = world.portals.filter((portal) => portal.x > -60);
}

function checkMilestones(world: World): void {
  if (!world.level.progressive) return;
  const next = TUNING.milestones[world.milestonesReached];
  if (next === undefined || world.stats.score < next) return;
  world.milestonesReached += 1;
  world.events.push({ type: 'milestone', score: next });
}

function removeOffscreen(world: World): void {
  const gone = world.roots.filter((root) => rootLeft(root) + root.width <= -20);
  // A missed pickup must not stop with its root: it drifts on and leaves the screen by itself.
  for (const pickup of world.pickups) if (pickup.root && gone.includes(pickup.root)) detach(pickup);
  world.roots = world.roots.filter((root) => !gone.includes(root));
  world.pickups = world.pickups.filter((pickup) => !pickup.collected && pickupPosition(pickup).x > -20);
}
