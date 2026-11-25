import { describe, expect, it } from 'vitest';
import { MAX_COINS_SHOWN, MAX_DIAMONDS_SHOWN, TreasurePiles } from '../src/render/treasure';

const run = (piles: TreasurePiles, seconds: number, coins: number, diamonds: number): void => {
  for (let t = 0; t < seconds; t += 1 / 60) piles.update(1 / 60, coins, diamonds);
};

describe('home coin and diamond piles', () => {
  it('start with exactly what the player has, with nothing flying', () => {
    const piles = new TreasurePiles(15, 3);
    expect([piles.count('coin'), piles.count('diamond')]).toEqual([15, 3]);
    expect(piles.outgoing('coin')).toHaveLength(0);
  });

  it('a purchase takes coins off the top one at a time, popping them off', () => {
    const piles = new TreasurePiles(15, 3);
    piles.update(1 / 60, 5, 3);
    expect(piles.count('coin')).toBe(14);
    expect(piles.outgoing('coin')[0]?.index).toBe(14);
    run(piles, 2, 5, 3);
    expect(piles.count('coin')).toBe(5);
    expect(piles.outgoing('coin')).toHaveLength(0);
  });

  it('new pieces drop on one at a time', () => {
    const piles = new TreasurePiles(0, 1);
    piles.update(1 / 60, 2, 2);
    expect([piles.count('coin'), piles.count('diamond')]).toEqual([1, 2]);
    expect(piles.flight('coin', 0, 'in')).not.toBeNull();
    expect(piles.flight('diamond', 1, 'in')).not.toBeNull();
  });

  it('even a big change catches up within about a second', () => {
    const piles = new TreasurePiles(400, 30);
    run(piles, 1.3, 20, 0);
    expect([piles.count('coin'), piles.count('diamond')]).toEqual([20, 0]);
  });

  it('shows up to 50 coins in 5 stacks and 15 diamonds in a pyramid', () => {
    expect([MAX_COINS_SHOWN, MAX_DIAMONDS_SHOWN]).toEqual([50, 15]);
  });
});
