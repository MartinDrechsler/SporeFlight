/**
 * Adventure is told in five chapters, one world each, every one ending with a
 * boss (plan: the "Spore Flight: Adventure chapters plan" doc). Which levels
 * belong to a chapter, and their order, is in config/levels.ts. A chapter
 * with no levels yet shows on the map as coming soon.
 */
export interface Chapter {
  id: number;
  name: string;
  /** One line under the name on the map. */
  tagline: string;
  /** The chapter's colour on the map. */
  color: string;
}

export const CHAPTERS: readonly Chapter[] = [
  { id: 1, name: 'WHISPERING WOODS', tagline: 'The Mother Tree is fading. Find the lost sporelings.', color: '#00f2c3' },
  { id: 2, name: 'GLOWCAP CAVERNS', tagline: 'Down into the dark, where only your glow lights the way.', color: '#7fe6ff' },
  { id: 3, name: 'BRAMBLE MARSH', tagline: 'Fog, snapping reeds, and the first sight of the Rot.', color: '#9fd356' },
  { id: 4, name: 'SKY CANOPY', tagline: 'Above the clouds, into the storm.', color: '#ffd23f' },
  { id: 5, name: 'THE HEARTWOOD', tagline: 'Inside the Tree, the Rot waits at its heart.', color: '#bd00ff' },
];
