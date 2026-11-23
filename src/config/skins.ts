/** Colours of the mushroom, bought in the shop with coins. */
export interface Skin {
  id: string;
  name: string;
  cost: number;
  capLight: string;
  capMain: string;
  capDark: string;
  spots: string;
  glow: string;
}

export const SKINS: readonly Skin[] = [
  { id: 'classic', name: 'CLASSIC PINK', cost: 0, capLight: '#ff5e9c', capMain: '#e02476', capDark: '#7a053c', spots: '#00f2c3', glow: '#e02476' },
  { id: 'emerald', name: 'EMERALD GREEN', cost: 15, capLight: '#33ff99', capMain: '#00b359', capDark: '#004d26', spots: '#ffd700', glow: '#00ff80' },
  { id: 'cosmic', name: 'COSMIC BLUE', cost: 30, capLight: '#33ccff', capMain: '#0055ff', capDark: '#002266', spots: '#ff3c69', glow: '#00baff' },
  { id: 'golden', name: 'GOLDEN SPORE', cost: 50, capLight: '#fff2a3', capMain: '#ffd700', capDark: '#b59300', spots: '#ffffff', glow: '#ffd700' },
];

export const DEFAULT_SKIN_ID = 'classic';

/** Unknown ids fall back to the default skin, so a bad save can never break drawing. */
export function skinById(id: string): Skin {
  return SKINS.find((skin) => skin.id === id) ?? SKINS[0]!;
}
