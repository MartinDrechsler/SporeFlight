import { STORIES, type StoryPanel } from '../config/story';
import { skinById } from '../config/skins';
import type { State } from '../core/stateMachine';
import { AvatarStage } from '../ui/avatarStage';
import { byId, setText } from '../ui/dom';
import { showScreens } from '../ui/screens';
import type { GameContext } from './context';

/**
 * A story scene: panel after panel, the mushroom acting each one out with a
 * line of text under it. NEXT moves on, SKIP ends it; either way it is marked
 * seen so it plays once, and the game goes on where it was heading.
 */
export function storyState(ctx: GameContext): State {
  const stage = new AvatarStage(byId<HTMLCanvasElement>('story-stage'), { skin: skinById(ctx.save.activeSkin) });
  let panels: readonly StoryPanel[] = [];
  let index = 0;

  const show = (): void => {
    const panel = panels[index]!;
    stage.play(panel.animation, { skin: skinById(ctx.save.activeSkin), sporelings: panel.sporelings ?? 0 });
    setText(byId('story-text'), panel.text);
    setText(byId('story-page'), `${index + 1}/${panels.length}`);
    setText(byId('story-next'), index === panels.length - 1 ? "LET'S GO" : 'NEXT');
  };

  const end = (): void => {
    if (!ctx.save.storySeen.includes(ctx.story.id)) ctx.save.storySeen.push(ctx.story.id);
    ctx.persist();
    ctx.go(ctx.story.then);
  };

  byId('story-next').addEventListener('click', () => {
    ctx.audio.unlock();
    ctx.audio.ui('click');
    if (index >= panels.length - 1) end();
    else {
      index += 1;
      show();
    }
  });
  byId('story-skip').addEventListener('click', () => {
    ctx.audio.ui('click');
    end();
  });

  return {
    enter() {
      panels = STORIES[ctx.story.id];
      index = 0;
      show();
      showScreens('story');
    },

    update(dt) {
      stage.update(dt);
    },
  };
}
