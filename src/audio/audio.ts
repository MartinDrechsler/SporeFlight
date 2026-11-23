import type { GameEvent } from '../gameplay/world';

/**
 * Small synthesized sound effects (no audio files to load). Browsers only
 * allow sound after a user gesture, so `unlock` is called on the first tap.
 * Every method is safe to call at any time, even if audio is unavailable.
 */
export class Audio {
  private context: AudioContext | null = null;
  enabled: boolean;

  constructor(enabled: boolean) {
    this.enabled = enabled;
  }

  unlock(): void {
    if (this.context) {
      void this.context.resume();
      return;
    }
    try {
      this.context = new AudioContext();
    } catch {
      this.context = null;
    }
  }

  react(event: GameEvent): void {
    switch (event.type) {
      case 'flap':
        this.tone(420, 620, 0.09, 'triangle', 0.12);
        break;
      case 'pass':
        this.tone(660, 880, 0.08, 'sine', 0.1);
        break;
      case 'fever':
        this.tone(520, 1040, 0.35, 'sawtooth', 0.08);
        break;
      case 'pickup':
        this.tone(event.kind === 'coin' ? 980 : 1320, 1600, 0.12, 'square', 0.06);
        break;
      case 'crash':
        this.tone(220, 60, 0.4, 'sawtooth', 0.15);
        break;
    }
  }

  private tone(from: number, to: number, seconds: number, wave: OscillatorType, volume: number): void {
    const ctx = this.context;
    if (!this.enabled || !ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(from, now);
    osc.frequency.exponentialRampToValueAtTime(to, now + seconds);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + seconds);
  }
}
