import { atan2, cos, sin } from '../core/fmath';
import { TUNING } from '../config/tuning';
import type { Random } from '../core/random';
import { circlesTouch } from './collision';
import { freePickup } from './pickups';
import type { BossId } from '../config/levels';
import type { World } from './world';

const B = TUNING.boss;

/**
 * How a volley is thrown. The Stone Thrower aims, fans and walls rocks; the
 * Bat Queen sends bats aimed, in a swaying swoop, in a wave with one opening,
 * and screeches to dim the light.
 */
export type ThrowPattern = 'aimed' | 'fan' | 'wall' | 'swoop' | 'screech';

/** Something the boss throws: a rock, or one of the Bat Queen's bats (which sways as it flies). */
export interface Rock {
  kind: 'rock' | 'bat';
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  passed: boolean;
  /** Seconds in flight. */
  age: number;
  /** How far it sways up and down as it flies, px (0: straight). */
  sway: number;
}

/**
 * The Stone Thrower. It hovers at the right edge and throws rocks in random
 * patterns. Before every throw its eyes flare for a moment (`warning`), so a
 * hit is always fair. It throws faster as the fight goes on, with a short
 * breather halfway.
 */
export interface Boss {
  id: BossId;
  x: number;
  y: number;
  /** Seconds the fight has lasted. */
  time: number;
  /** Length of the fight, s. */
  seconds: number;
  /** Seconds until the next throw. */
  nextThrow: number;
  /** The volley that is being announced. */
  pattern: ThrowPattern;
  breatherTaken: boolean;
  leaving: boolean;
  rocks: Rock[];
  /** Seconds until the next coin floats in. */
  nextCoin: number;
  diamondDropped: boolean;
  /** Seconds the light stays dimmed by a screech. */
  dim: number;
}

export function createBoss(world: World, seconds: number, id: BossId): Boss {
  return {
    id,
    x: world.width + B.bodyRadius * 2,
    y: world.height * 0.42,
    time: 0,
    seconds,
    nextThrow: B.firstThrowAfter,
    pattern: 'aimed',
    breatherTaken: false,
    leaving: false,
    rocks: [],
    nextCoin: B.coinEverySeconds,
    diamondDropped: false,
    dim: 0,
  };
}

/** True while the next throw is being announced; the eyes flare. */
export function isWarning(boss: Boss): boolean {
  return !boss.leaving && boss.nextThrow <= B.warnSeconds;
}

/** The fight is over; the monster backs away while its last rocks fly on. */
export function sendAway(boss: Boss): void {
  boss.leaving = true;
}

/** Moves the monster and its rocks, throws when due, and scores dodged rocks. */
export function stepBoss(world: World, dt: number): void {
  const boss = world.boss;
  if (!boss) return;
  boss.time += dt;
  boss.dim = Math.max(0, boss.dim - dt);
  moveBody(world, boss, dt);
  moveRocks(world, boss, dt);
  if (boss.leaving) {
    if (boss.x > world.width + B.bodyRadius * 2 && boss.rocks.length === 0) world.boss = null;
    return;
  }
  dropValuables(world, boss, dt);

  const progress = Math.min(1, boss.time / boss.seconds);
  if (!boss.breatherTaken && progress >= 0.5) {
    boss.breatherTaken = true;
    boss.nextThrow += B.breatherSeconds;
  }
  const before = boss.nextThrow;
  boss.nextThrow -= dt;
  if (before > B.warnSeconds && boss.nextThrow <= B.warnSeconds) {
    boss.pattern = boss.id === 'batQueen' ? queenPattern(world.rng, progress) : choosePattern(world.rng, progress);
    world.events.push({ type: 'bossWarn', x: boss.x, y: boss.y });
  }
  if (boss.nextThrow > 0) return;
  throwRocks(world, boss, progress);
  boss.nextThrow = B.startInterval + (B.endInterval - B.startInterval) * progress;
}

/** The rock touching the mushroom, if any. */
export function rockHittingPlayer(world: World): Rock | null {
  const { player, boss } = world;
  if (!boss) return null;
  return boss.rocks.find((rock) => circlesTouch(player.x, player.y, player.radius, rock.x, rock.y, B.rockRadius, 0.85)) ?? null;
}

export function removeRock(world: World, rock: Rock): void {
  if (world.boss) world.boss.rocks = world.boss.rocks.filter((r) => r !== rock);
}

function moveBody(world: World, boss: Boss, dt: number): void {
  const home = world.width - B.insetFromRight;
  const target = boss.leaving ? world.width + B.bodyRadius * 3 : home;
  const speed = (world.width / B.enterSeconds) * dt;
  boss.x += Math.max(-speed, Math.min(speed, target - boss.x));
  boss.y = world.height * 0.42 + sin(boss.time * B.bobSpeed) * B.bobAmplitude;
}

function moveRocks(world: World, boss: Boss, dt: number): void {
  for (const rock of boss.rocks) {
    rock.age += dt;
    rock.x += rock.vx * dt;
    // A swaying bat: its height follows a wave around its straight path.
    rock.y += (rock.vy + rock.sway * B.swoopBeat * cos(rock.age * B.swoopBeat)) * dt;
    rock.spin += dt * 6;
    if (!rock.passed && rock.x + B.rockRadius < world.player.x - world.player.radius) {
      rock.passed = true;
      world.stats.score += 1;
      world.events.push({ type: 'pass', score: world.stats.score, rootX: rock.x });
    }
  }
  boss.rocks = boss.rocks.filter((rock) => rock.x > -B.rockRadius * 2 && rock.y > -100 && rock.y < world.height + 100);
}

/** The Bat Queen: single bats first, then swoops; later waves with one opening, and screeches that dim the light. */
function queenPattern(rng: Random, progress: number): ThrowPattern {
  if (progress < 0.2) return 'aimed';
  if (progress < 0.5) return rng.chance(0.5) ? 'aimed' : 'swoop';
  const roll = rng.next();
  return roll < 0.2 ? 'aimed' : roll < 0.5 ? 'swoop' : roll < 0.8 ? 'wall' : 'screech';
}

/** Early on only single aimed rocks; fans join, then walls with one opening. */
function choosePattern(rng: Random, progress: number): ThrowPattern {
  if (progress < 0.2) return 'aimed';
  if (progress < 0.5) return rng.chance(0.5) ? 'aimed' : 'fan';
  const roll = rng.next();
  return roll < 0.3 ? 'aimed' : roll < 0.65 ? 'fan' : 'wall';
}

function throwRocks(world: World, boss: Boss, progress: number): void {
  const speed = B.startRockSpeed + (B.endRockSpeed - B.startRockSpeed) * progress;
  const from = { x: boss.x - B.bodyRadius * 0.6, y: boss.y };
  const aim = atan2(world.player.y - from.y, world.player.x - from.x);
  const kind = boss.id === 'batQueen' ? 'bat' : 'rock';
  const add = (x: number, y: number, angle: number, sway = 0): void => {
    boss.rocks.push({ kind, x, y, vx: cos(angle) * speed, vy: sin(angle) * speed, spin: 0, passed: false, age: 0, sway });
  };
  switch (boss.pattern) {
    case 'aimed':
      add(from.x, from.y, aim);
      break;
    case 'fan':
      for (const offset of [-B.fanSpread, 0, B.fanSpread]) add(from.x, from.y, aim + offset);
      break;
    case 'wall': {
      // A column of rocks flying straight, with one opening to slip through.
      const top = TUNING.player.radius * 2;
      const gapCenter = world.rng.range(top + B.wallGap / 2, world.groundY - B.wallGap / 2 - top);
      for (let y = top; y < world.groundY - B.rockRadius; y += B.wallSpacing) {
        if (Math.abs(y - gapCenter) < B.wallGap / 2) continue;
        add(from.x, y, Math.PI);
      }
      break;
    }
    case 'swoop':
      // A line of bats at the mushroom's height, swaying in step: slip through where the wave opens.
      for (let i = 0; i < B.swoopCount; i++) add(from.x + i * B.swoopSpacing, world.player.y, Math.PI, B.swoopSway);
      break;
    case 'screech':
      // The light dims for a while, and one bat comes at the mushroom in the dark.
      boss.dim = B.screechSeconds;
      add(from.x, from.y, aim);
      world.events.push({ type: 'bossScreech', x: boss.x, y: boss.y });
      return;
  }
  world.events.push({ type: 'bossThrow', x: from.x, y: from.y });
}

/** Coins float in now and then, and one diamond at the breather, for the stars. */
function dropValuables(world: World, boss: Boss, dt: number): void {
  boss.nextCoin -= dt;
  const y = (): number => world.rng.range(world.height * 0.2, world.groundY - 80);
  if (boss.nextCoin <= 0) {
    boss.nextCoin += B.coinEverySeconds;
    world.pickups.push(freePickup('coin', world.width + 20, y()));
    world.offered.coins += 1;
  }
  if (!boss.diamondDropped && boss.time >= boss.seconds / 2) {
    boss.diamondDropped = true;
    world.pickups.push(freePickup('diamond', world.width + 20, world.height * 0.42));
    world.offered.diamonds += 1;
  }
}
