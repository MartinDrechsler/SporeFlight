import { accepted, refused, submissionFor } from '../meta/leaderboard';
import { submitRun } from '../online/leaderboardApi';
import { toast } from '../ui/toast';
import type { GameContext } from './context';

let sending = false;

/**
 * Sends the leaderboard anything new (a better run, a new name or country).
 * Runs in the background; offline it simply waits for the next chance.
 */
export async function syncLeaderboard(ctx: GameContext): Promise<void> {
  const submission = submissionFor(ctx.save);
  if (!submission || sending) return;
  sending = true;
  try {
    const result = await submitRun(submission);
    if (result.ok) {
      accepted(ctx.save, submission);
      if (result.data.rank !== null) toast(`🏆 WORLD RANK #${result.data.rank}`);
    } else if (!result.retry) {
      refused(ctx.save, result.error);
      if (result.error === 'name') toast("YOUR NAME CAN'T BE SHOWN: CHANGE IT IN LEADERBOARD");
    }
    ctx.persist();
  } finally {
    sending = false;
  }
}
