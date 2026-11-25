import type { AnimationId } from './animations';

/**
 * The Adventure story, told in short scenes between chapters: a few panels,
 * one line each, acted out by the avatar (plan: Schell's hero's journey, used
 * as a check). Each scene plays once; it can always be skipped.
 */
export interface StoryPanel {
  /** What the mushroom acts out (config/animations.ts). */
  animation: AnimationId;
  text: string;
  /** Lost sporelings to show around it. */
  sporelings?: number;
}

export const STORIES = {
  /** Before the first level: the call to adventure. */
  opening: [
    { animation: 'idle', text: 'Deep in the forest stands the Mother Tree. Its light keeps every spore glowing.' },
    { animation: 'nervous', text: 'But its light is fading. A grey Rot is creeping through its roots.' },
    { animation: 'sad', text: 'The sporelings, the little keepers of its light, have scattered and lost their way.', sporelings: 3 },
    { animation: 'proud', text: 'You are the last spore still glowing. Only you can bring them home.' },
    { animation: 'cheer', text: 'Your journey begins in the Whispering Woods.' },
  ],
  /** Before the first cave level: the woods are saved, the way goes down into the dark. */
  chapter2: [
    { animation: 'celebrate', text: 'The Stone Thrower crumbles. The Whispering Woods glow again.' },
    { animation: 'nervous', text: 'But the Rot runs deeper, down into the Glowcap Caverns, where no light reaches.' },
    { animation: 'idle', text: "An old glowcap, Old Lantern, flickers in the dark: 'Trust your own glow, little one.'" },
    { animation: 'sad', text: 'Sporelings hide down there, too scared to move.', sporelings: 4 },
    { animation: 'proud', text: 'The Bat Queen rules the caves. Her screech dims any light. Not yours.' },
  ],
} satisfies Record<string, readonly StoryPanel[]>;

export type StoryId = keyof typeof STORIES;

/** The scene that opens a chapter, played before its first level is flown (chapter 1's is the opening). */
export function chapterStory(chapter: number): StoryId | null {
  const id = `chapter${chapter}`;
  return id in STORIES ? (id as StoryId) : null;
}
