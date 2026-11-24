/**
 * Rewarded video ads, the game's revenue stream: watching one (or skipping
 * it once skipping is allowed) refills lives. The rest of the game only
 * knows this interface, so a real ad network replaces the mock here alone.
 */
export interface RewardedAds {
  /** Plays an ad. Resolves true when the player earned the reward. */
  show(): Promise<boolean>;
}

/**
 * Stand-in until a real ad network is connected. Like a real ad SDK it draws
 * its own screen (#screen-ad): a countdown, and a Skip button that appears
 * after `skippableAfter` seconds. Finishing or skipping both earn the reward.
 */
export function createMockAds(seconds: number, skippableAfter: number): RewardedAds {
  return {
    show: () =>
      new Promise((resolve) => {
        const timer = document.getElementById('ad-timer');
        const skip = document.getElementById('ad-skip');
        let left = seconds;
        let done = false;
        const finish = (): void => {
          if (done) return;
          done = true;
          clearInterval(tick);
          skip?.removeEventListener('click', finish);
          resolve(true);
        };
        const paint = (): void => {
          if (timer) timer.textContent = String(Math.ceil(left));
          if (skip) skip.hidden = seconds - left < skippableAfter && seconds > 0;
        };
        skip?.addEventListener('click', finish);
        paint();
        const tick = setInterval(() => {
          left = Math.max(0, left - 0.1);
          paint();
          if (left === 0) finish();
        }, 100);
        if (seconds === 0) finish();
      }),
  };
}
