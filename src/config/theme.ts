/** Colours for one look of the forest. Adventure levels will add more themes. */
export interface Theme {
  skyTop: string;
  skyBottom: string;
  hillsFar: string;
  hillsNear: string;
  ground: string;
  groundGlow: string;
  rootDark: string;
  rootLight: string;
  rootVein: string;
  spore: string;
}

export const FOREST_THEME: Theme = {
  skyTop: '#03100d',
  skyBottom: '#0b2620',
  hillsFar: '#0a1f1b',
  hillsNear: '#0d2a24',
  ground: '#06140f',
  groundGlow: '#00f2c3',
  rootDark: '#0b201c',
  rootLight: '#1a4a40',
  rootVein: 'rgba(0, 242, 195, 0.45)',
  spore: 'rgba(214, 255, 160, 0.8)',
};

/** Colours of the mushroom. Shop skins will add more of these. */
export interface Skin {
  capLight: string;
  capMain: string;
  capDark: string;
  spots: string;
  glow: string;
}

export const CLASSIC_SKIN: Skin = {
  capLight: '#ff5e9c',
  capMain: '#e02476',
  capDark: '#7a053c',
  spots: '#00f2c3',
  glow: '#e02476',
};
