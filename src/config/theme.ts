/** Colours for one look of the forest. Each level picks a theme by id. */
export interface Theme {
  /** Sky gradient, top to bottom. */
  sky: readonly [string, string, string];
  hillsFar: string;
  hillsNear: string;
  ground: string;
  /** Glow colour: ground line, root caps, level badge. */
  accent: string;
  rootDark: string;
  rootLight: string;
  rootVein: string;
}

export type ThemeId =
  | 'classic' | 'glowfly' | 'amber' | 'ice' | 'purple'
  | 'red' | 'orange' | 'green' | 'crimson' | 'biolume';

const theme = (
  sky: [string, string, string],
  hillsFar: string,
  hillsNear: string,
  ground: string,
  accent: string,
  rootDark: string,
  rootLight: string,
  rootVein: string,
): Theme => ({ sky, hillsFar, hillsNear, ground, accent, rootDark, rootLight, rootVein });

export const THEMES: Record<ThemeId, Theme> = {
  classic: theme(['#03100d', '#071c17', '#0b2620'], '#0a1f1b', '#0d2a24', '#06140f', '#00f2c3', '#0b201c', '#1a4a40', 'rgba(0, 242, 195, 0.45)'),
  glowfly: theme(['#020806', '#051f15', '#0a2a1e'], '#071a13', '#0b281d', '#04140e', '#ffeb3b', '#0b3022', '#114532', 'rgba(255, 230, 80, 0.65)'),
  amber: theme(['#070502', '#151006', '#21180a'], '#120d05', '#1c1308', '#1c1305', '#ffaa00', '#382912', '#4f3c1d', 'rgba(255, 170, 0, 0.55)'),
  ice: theme(['#01050a', '#030f1c', '#071a2b'], '#03101c', '#061a2d', '#02101c', '#00e5ff', '#0a263d', '#133e5c', 'rgba(0, 229, 255, 0.55)'),
  purple: theme(['#05010a', '#10031c', '#19062b'], '#0c0216', '#140424', '#11021c', '#bd00ff', '#2b0a3d', '#40135c', 'rgba(189, 0, 255, 0.55)'),
  red: theme(['#080101', '#1c0303', '#2a0606'], '#140202', '#240404', '#1c0202', '#ff3c69', '#3d0a0a', '#5c1313', 'rgba(255, 60, 105, 0.55)'),
  orange: theme(['#080401', '#1c0d03', '#2a1406'], '#140902', '#241103', '#1c0c02', '#ff6e00', '#3d1c0a', '#5c2d13', 'rgba(255, 110, 0, 0.55)'),
  green: theme(['#020601', '#0a1c03', '#122a06'], '#071402', '#0c2404', '#0a1c02', '#32ff00', '#153d0a', '#225c13', 'rgba(50, 255, 0, 0.55)'),
  crimson: theme(['#050002', '#140007', '#21020d'], '#0f0005', '#1b000a', '#140007', '#e02476', '#330515', '#4d0a22', 'rgba(224, 36, 118, 0.55)'),
  biolume: theme(['#010605', '#031c17', '#062a22'], '#021410', '#03241b', '#021410', '#00f2c3', '#062d25', '#0a4237', 'rgba(0, 255, 200, 0.55)'),
};
