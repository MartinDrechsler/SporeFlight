/**
 * Looks for the mushroom: cap colours (skins) and glow trails. They never
 * change how the game plays, so the leaderboard stays fair.
 */

/** What a look costs: coins, diamonds, or earning a badge (it cannot be bought). */
export type Price = { coins: number } | { diamonds: number } | { badge: string };

export const FREE: Price = { coins: 0 };

export interface Skin {
  id: string;
  name: string;
  price: Price;
  capLight: string;
  capMain: string;
  capDark: string;
  spots: string;
  glow: string;
}

export const SKINS: readonly Skin[] = [
  { id: 'classic', name: 'CLASSIC RED', price: FREE, capLight: '#ff7a6b', capMain: '#e5483f', capDark: '#b02c25', spots: '#fff7ee', glow: '#ff6a55' },
  { id: 'emerald', name: 'EMERALD GREEN', price: { coins: 50 }, capLight: '#33ff99', capMain: '#00b359', capDark: '#004d26', spots: '#ffd700', glow: '#00ff80' },
  { id: 'cosmic', name: 'COSMIC BLUE', price: { coins: 120 }, capLight: '#33ccff', capMain: '#0055ff', capDark: '#002266', spots: '#ff3c69', glow: '#00baff' },
  { id: 'golden', name: 'GOLDEN SPORE', price: { coins: 250 }, capLight: '#fff2a3', capMain: '#ffd700', capDark: '#b59300', spots: '#ffffff', glow: '#ffd700' },
  { id: 'crystal', name: 'CRYSTAL CAP', price: { diamonds: 5 }, capLight: '#e0fbff', capMain: '#7fe6ff', capDark: '#1b7c99', spots: '#ffffff', glow: '#7fe6ff' },
  { id: 'midnight', name: 'MIDNIGHT BLOOM', price: { diamonds: 10 }, capLight: '#c79bff', capMain: '#6a2bd9', capDark: '#22064f', spots: '#ffe066', glow: '#b26bff' },
];

export const DEFAULT_SKIN_ID = 'classic';

/** Unknown ids fall back to the default skin, so a bad save can never break drawing. */
export function skinById(id: string): Skin {
  return SKINS.find((skin) => skin.id === id) ?? SKINS[0]!;
}
