import { DIAMOND } from '../config/sprites';
import { drawSprite, spriteImage } from './sprites';

/**
 * The player's savings, on show beside the home avatar: neat stacks of coins
 * to its lower left and a pyramid of diamonds to its right, each with its
 * number at its outer side. One coin or diamond is drawn for each one owned, up to what fits;
 * past that the pile stays full and the number tells the rest.
 *
 * When the amount changes (a purchase, a reward), the piles change one piece
 * at a time: spent pieces pop off the top, new ones drop on.
 */
const PILES = {
  /** Coins per stack, and stacks side by side. */
  coinsPerStack: 10,
  coinStacks: 5,
  /** Diamonds in the bottom row of the pyramid; each row above holds one fewer. */
  diamondBase: 5,
  /** Seconds a piece takes to drop on or pop off. */
  flySeconds: 0.35,
  /** Seconds between pieces, and the most a whole change may take. */
  maxStep: 0.08,
  maxChange: 1.2,
};

export const MAX_COINS_SHOWN = PILES.coinsPerStack * PILES.coinStacks;
export const MAX_DIAMONDS_SHOWN = (PILES.diamondBase * (PILES.diamondBase + 1)) / 2;

type Kind = 'coin' | 'diamond';

interface Flight {
  kind: Kind;
  /** Place in the pile (0 = first coin of the first stack, or the bottom-left diamond). */
  index: number;
  /** Dropping on (in) or popping off (out). */
  dir: 'in' | 'out';
  age: number;
}

/** How many pieces each pile shows right now, and the pieces on their way on or off. */
export class TreasurePiles {
  private shown: Record<Kind, number>;
  private wait: Record<Kind, number> = { coin: 0, diamond: 0 };
  /** Seconds between pieces for the change under way, set when the amount to reach changes. */
  private pace: Record<Kind, number> = { coin: 0, diamond: 0 };
  private aim: Record<Kind, number>;
  private flights: Flight[] = [];

  constructor(coins: number, diamonds: number) {
    this.shown = { coin: coins, diamond: diamonds };
    this.aim = { coin: coins, diamond: diamonds };
  }

  /** Moves the piles one piece at a time towards the amounts the player has. */
  update(dt: number, coins: number, diamonds: number): void {
    this.step('coin', coins, dt);
    this.step('diamond', diamonds, dt);
    for (const flight of this.flights) flight.age += dt;
    this.flights = this.flights.filter((f) => f.age < PILES.flySeconds);
  }

  count(kind: Kind): number {
    return this.shown[kind];
  }

  /** Where a piece is in its flight: 0 just started, 1 done; null when it is not flying. */
  flight(kind: Kind, index: number, dir: 'in' | 'out'): number | null {
    const found = this.flights.find((f) => f.kind === kind && f.index === index && f.dir === dir);
    return found ? found.age / PILES.flySeconds : null;
  }

  outgoing(kind: Kind): readonly Flight[] {
    return this.flights.filter((f) => f.kind === kind && f.dir === 'out');
  }

  private step(kind: Kind, target: number, dt: number): void {
    const diff = target - this.shown[kind];
    if (diff === 0) {
      this.wait[kind] = 0;
      return;
    }
    // Big changes go faster, so even 300 coins spent take about a second.
    if (target !== this.aim[kind]) {
      this.aim[kind] = target;
      this.pace[kind] = Math.min(PILES.maxStep, PILES.maxChange / Math.abs(diff));
    }
    this.wait[kind] -= dt;
    while (this.wait[kind] <= 0 && this.shown[kind] !== target) {
      this.wait[kind] += this.pace[kind];
      if (target > this.shown[kind]) {
        this.flights.push({ kind, index: this.shown[kind], dir: 'in', age: 0 });
        this.shown[kind] += 1;
      } else {
        this.shown[kind] -= 1;
        this.flights.push({ kind, index: this.shown[kind], dir: 'out', age: 0 });
      }
    }
  }
}

/** Where the avatar stands on the home screen: centre x, the line its foot rests on, its radius. */
export interface TreasurePlace {
  x: number;
  y: number;
  r: number;
}

export function drawTreasure(ctx: CanvasRenderingContext2D, piles: TreasurePiles, place: TreasurePlace): void {
  drawCoins(ctx, piles, place);
  drawDiamonds(ctx, piles, place);
}

function drawCoins(ctx: CanvasRenderingContext2D, piles: TreasurePiles, { x, y, r }: TreasurePlace): void {
  const w = r * 0.52;
  const face = w * 0.36;
  const thick = w * 0.22;
  const gap = w * 1.12;
  // Stack 0 stands nearest the avatar; the others line up to the left.
  const near = x - r * 1.3 - w / 2;
  const at = (index: number): { cx: number; cy: number } => ({
    cx: near - Math.floor(index / PILES.coinsPerStack) * gap,
    cy: y - (index % PILES.coinsPerStack) * thick - face / 2 - thick,
  });

  const count = Math.min(piles.count('coin'), MAX_COINS_SHOWN);
  for (let i = 0; i < count; i++) {
    const { cx, cy } = at(i);
    const drop = piles.flight('coin', i, 'in');
    // A new coin falls onto its stack.
    const offset = drop === null ? 0 : -(1 - easeOut(drop)) * r * 1.2;
    drawCoin(ctx, cx, cy + offset, w, face, thick, drop === null ? 1 : Math.min(1, drop * 2));
  }
  for (const flight of piles.outgoing('coin')) {
    if (flight.index >= MAX_COINS_SHOWN) continue;
    const { cx, cy } = at(flight.index);
    const p = flight.age / PILES.flySeconds;
    drawCoin(ctx, cx, cy - easeOut(p) * r * 0.9, w, face, thick, 1 - p);
  }

  // The number stands at the pile's outer side, level with its bottom row (small phones have no room below).
  const stacks = Math.max(1, Math.min(PILES.coinStacks, Math.ceil(count / PILES.coinsPerStack)));
  const outer = near - (stacks - 1) * gap - w / 2 - r * 0.12;
  label(ctx, String(piles.count('coin')), outer, y - thick - face / 2, r, '#ffd23f', 'right');
}

/** One coin lying flat: its edge, then its face on top. */
function drawCoin(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, face: number, thick: number, alpha: number): void {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#c98f12';
  ctx.beginPath();
  ctx.ellipse(cx, cy + thick, w / 2, face / 2, 0, 0, Math.PI);
  ctx.lineTo(cx - w / 2, cy);
  ctx.ellipse(cx, cy, w / 2, face / 2, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#7a4f00';
  ctx.lineWidth = Math.max(1, w * 0.06);
  ctx.stroke();
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.ellipse(cx, cy, w / 2, face / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // The stamped ring and a glint, as on the coin icon.
  ctx.strokeStyle = '#e0a91e';
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.32, face * 0.32, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#fff3b0';
  ctx.beginPath();
  ctx.ellipse(cx - w * 0.18, cy - face * 0.12, w * 0.08, face * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawDiamonds(ctx: CanvasRenderingContext2D, piles: TreasurePiles, { x, y, r }: TreasurePlace): void {
  const size = r * 0.42;
  const image = spriteImage(DIAMOND);
  const height = (size * image.height) / image.width;
  const across = size * 0.92;
  const up = height * 0.72;
  const center = x + r * 1.3 + (PILES.diamondBase * across) / 2;
  const count = Math.min(piles.count('diamond'), MAX_DIAMONDS_SHOWN);
  // Rows fill from the bottom; each row is centred on the pile.
  const at = (index: number, total: number): { cx: number; cy: number } => {
    let row = 0;
    let start = 0;
    while (index >= start + PILES.diamondBase - row) {
      start += PILES.diamondBase - row;
      row += 1;
    }
    const inRow = Math.min(PILES.diamondBase - row, Math.max(0, total - start));
    return { cx: center + (index - start - (inRow - 1) / 2) * across, cy: y - height / 2 - row * up };
  };

  for (let i = 0; i < count; i++) {
    const { cx, cy } = at(i, count);
    const drop = piles.flight('diamond', i, 'in');
    ctx.globalAlpha = drop === null ? 1 : Math.min(1, drop * 2);
    drawSprite(ctx, DIAMOND, cx, cy - (drop === null ? 0 : (1 - easeOut(drop)) * r * 1.2), size);
  }
  for (const flight of piles.outgoing('diamond')) {
    if (flight.index >= MAX_DIAMONDS_SHOWN) continue;
    // It pops off from where it lay, as the top piece of a pile one bigger.
    const { cx, cy } = at(flight.index, flight.index + 1);
    const p = flight.age / PILES.flySeconds;
    ctx.globalAlpha = 1 - p;
    drawSprite(ctx, DIAMOND, cx, cy - easeOut(p) * r * 0.9, size);
  }
  ctx.globalAlpha = 1;
  const row = Math.min(PILES.diamondBase, Math.max(1, count));
  label(ctx, String(piles.count('diamond')), center + (row * across) / 2 + r * 0.12, y - height / 2, r, '#3fd8ff', 'left');
}

/** A pile's number, in the game's pixel font, at (x, y): `align` says which side of x the text goes. */
function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, r: number, color: string, align: CanvasTextAlign): void {
  ctx.font = `${Math.round(Math.max(16, r * 0.62))}px VT323, monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(3, 16, 13, 0.85)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function easeOut(p: number): number {
  return 1 - (1 - p) ** 3;
}
