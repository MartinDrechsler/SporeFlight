import type { State } from '../core/stateMachine';
import { claimQuest, dayKey, msUntilReset, refreshQuests } from '../meta/quests';
import { byId, setText } from '../ui/dom';
import { renderQuests } from '../ui/panels';
import { showScreens } from '../ui/screens';
import { toast } from '../ui/toast';
import type { GameContext } from './context';
import { onBack } from './menu';

/** Today's three quests, their progress, rewards to claim and time until reset. */
export function questsState(ctx: GameContext): State {
  onBack(ctx, 'screen-quests', 'start');

  const render = (): void =>
    renderQuests(ctx.save, (index) => {
      const reward = claimQuest(ctx.save, index);
      if (reward === 0) return;
      ctx.persist();
      ctx.audio.ui('buy');
      toast(`+${reward} COINS CLAIMED!`);
      render();
    });

  return {
    enter() {
      if (refreshQuests(ctx.save, dayKey(ctx.now()), ctx.rng)) ctx.persist();
      render();
      showScreens('quests');
    },

    update() {
      const now = ctx.now();
      if (refreshQuests(ctx.save, dayKey(now), ctx.rng)) {
        ctx.persist();
        render();
      }
      setText(byId('quests-timer'), `RESETS IN ${clock(msUntilReset(now))}`);
    },
  };
}

function clock(ms: number): string {
  const total = Math.floor(ms / 1000);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}
