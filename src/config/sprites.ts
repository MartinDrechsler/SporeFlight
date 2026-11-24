/**
 * Pixel-art icons as data: each row is a line of pixels, each letter a colour
 * from the sprite's palette, '.' is see-through. The same pictures are drawn on
 * the canvas (pickups) and used as images in the menus and HUD, so they always match.
 */
export interface Sprite {
  rows: readonly string[];
  palette: Readonly<Record<string, string>>;
}

const OUTLINE = '#1c0f24';

/** A full life: a red heart with a dark outline, a shine and a shadow on the lower right. */
export const HEART: Sprite = {
  palette: { K: OUTLINE, R: '#ff3c69', D: '#b5163f', W: '#ffd0dc' },
  rows: [
    '.KKK...KKK.',
    'KRRRK.KRRRK',
    'KRWRRKRRRRK',
    'KRWRRRRRRRK',
    'KRRRRRRRRDK',
    '.KRRRRRRDK.',
    '..KRRRRDK..',
    '...KRRDK...',
    '....KDK....',
    '.....K.....',
  ],
};

/** A lost life: the same heart, empty. */
export const HEART_EMPTY: Sprite = {
  palette: { K: OUTLINE, E: '#3b2638', S: '#4e3449' },
  rows: [
    '.KKK...KKK.',
    'KEEEK.KEEEK',
    'KESEEKEEEEK',
    'KESEEEEEEEK',
    'KEEEEEEEEEK',
    '.KEEEEEEEK.',
    '..KEEEEEK..',
    '...KEEEK...',
    '....KEK....',
    '.....K.....',
  ],
};

/** A gold coin seen from the front: a raised rim, a stamped inner ring and a shine on the upper left. */
export const COIN: Sprite = {
  palette: { K: '#5a3a00', Y: '#ffd23f', O: '#d18f00', W: '#fff6c8', L: '#ffe680' },
  rows: [
    '....KKKK....',
    '..KKYYYYKK..',
    '.KYWWYYYYOK.',
    '.KWLOOOOLYOK',
    'KYWOLLLLOYOK',
    'KYYOLYYLOYOK',
    'KYYOLYYLOYOK',
    'KYYOLLLLOYOK',
    '.KYLOOOOLOK.',
    '.KOYYYYYYOK.',
    '..KKOOOOKK..',
    '....KKKK....',
  ],
};

/**
 * A brilliant-cut diamond from the side: a flat table on top, slanted crown
 * facets, the girdle, and the pavilion narrowing to a point.
 */
export const DIAMOND: Sprite = {
  palette: { K: '#0b2a44', W: '#ffffff', C: '#9cf0ff', B: '#3cc6f0', D: '#1683b8' },
  rows: [
    '...KKKKKKK...',
    '..KWWCCCCBK..',
    '.KWCCWCCBCBK.',
    'KCCBCCWCCBCDK',
    'KKKKKKKKKKKKK',
    '.KCBCCBDCBDK.',
    '..KCBCBDBDK..',
    '...KCBCDBK...',
    '....KCBDK....',
    '.....KBK.....',
    '......K......',
  ],
};

export const SPRITES = { heart: HEART, heartEmpty: HEART_EMPTY, coin: COIN, diamond: DIAMOND } as const;
export type SpriteName = keyof typeof SPRITES;
