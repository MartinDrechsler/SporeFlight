/**
 * Fixed-time-step game loop. The simulation always advances in equal steps,
 * so a flap feels identical on every phone and bugs replay the same way.
 * Rendering happens once per display frame.
 */
export const STEP_SECONDS = 1 / 60;

/** Never simulate more than this per frame, so a long stall cannot freeze the game. */
const MAX_FRAME_SECONDS = 0.25;

export interface Loop {
  start(): void;
  stop(): void;
  /** Advance the simulation by an exact amount of time (used by tests). */
  advance(seconds: number): void;
}

export function createLoop(update: (dt: number) => void, render: () => void): Loop {
  let running = false;
  let lastTime = 0;
  let accumulator = 0;
  let frameId = 0;

  const frame = (now: number): void => {
    if (!running) return;
    const elapsed = Math.min((now - lastTime) / 1000, MAX_FRAME_SECONDS);
    lastTime = now;
    accumulator += elapsed;
    while (accumulator >= STEP_SECONDS) {
      update(STEP_SECONDS);
      accumulator -= STEP_SECONDS;
    }
    render();
    frameId = requestAnimationFrame(frame);
  };

  return {
    start() {
      if (running) return;
      running = true;
      accumulator = 0;
      lastTime = performance.now();
      frameId = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(frameId);
    },
    advance(seconds) {
      const steps = Math.max(1, Math.round(seconds / STEP_SECONDS));
      for (let i = 0; i < steps; i++) update(STEP_SECONDS);
      render();
    },
  };
}
