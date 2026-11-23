/**
 * Rewarded video ads, the game's revenue stream: watching one refills lives.
 * The rest of the game only knows this interface, so the real ad network
 * (e.g. AdMob when wrapped as an app) replaces the mock without other changes.
 */
export interface RewardedAds {
  /** Shows an ad. Resolves true only if the player watched it to the end. */
  show(): Promise<boolean>;
}

/** Stand-in until a real ad network is connected: "plays" for a few seconds, then rewards. */
export function createMockAds(seconds: number): RewardedAds {
  return {
    show: () => new Promise((resolve) => setTimeout(() => resolve(true), seconds * 1000)),
  };
}
