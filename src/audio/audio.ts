import type { GameEvent } from '../gameplay/world';

/** Sounds for menus and rewards that are not gameplay events. */
export type UiSound = 'click' | 'buy' | 'reward' | 'error';

interface Note {
  from: number;
  to: number;
  seconds: number;
  wave: OscillatorType;
  volume: number;
  delay?: number;
}

const SOUNDS = {
  flap: [{ from: 420, to: 620, seconds: 0.09, wave: 'triangle', volume: 0.12 }],
  pass: [{ from: 660, to: 880, seconds: 0.08, wave: 'sine', volume: 0.1 }],
  nearMiss: [{ from: 1500, to: 1900, seconds: 0.1, wave: 'sine', volume: 0.08 }],
  coin: [{ from: 980, to: 1600, seconds: 0.12, wave: 'square', volume: 0.05 }],
  chime: [
    { from: 1320, to: 1320, seconds: 0.15, wave: 'sine', volume: 0.09 },
    { from: 1760, to: 1760, seconds: 0.2, wave: 'sine', volume: 0.08, delay: 0.08 },
  ],
  pop: [{ from: 600, to: 120, seconds: 0.25, wave: 'square', volume: 0.08 }],
  crash: [{ from: 220, to: 60, seconds: 0.4, wave: 'sawtooth', volume: 0.15 }],
  click: [{ from: 520, to: 560, seconds: 0.05, wave: 'triangle', volume: 0.08 }],
  error: [{ from: 200, to: 140, seconds: 0.18, wave: 'square', volume: 0.07 }],
  reward: [
    { from: 660, to: 660, seconds: 0.1, wave: 'triangle', volume: 0.09 },
    { from: 880, to: 880, seconds: 0.1, wave: 'triangle', volume: 0.09, delay: 0.09 },
    { from: 1320, to: 1320, seconds: 0.18, wave: 'triangle', volume: 0.09, delay: 0.18 },
  ],
} satisfies Record<string, Note[]>;

type SoundName = keyof typeof SOUNDS;

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
    const sound = soundFor(event);
    if (sound) this.play(sound);
  }

  ui(sound: UiSound): void {
    this.play(sound === 'buy' ? 'coin' : sound);
  }

  private play(name: SoundName): void {
    const ctx = this.context;
    if (!this.enabled || !ctx || ctx.state !== 'running') return;
    for (const note of SOUNDS[name] as Note[]) {
      const start = ctx.currentTime + (note.delay ?? 0);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = note.wave;
      osc.frequency.setValueAtTime(note.from, start);
      osc.frequency.exponentialRampToValueAtTime(note.to, start + note.seconds);
      gain.gain.setValueAtTime(note.volume, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + note.seconds);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + note.seconds);
    }
  }
}

function soundFor(event: GameEvent): SoundName | null {
  switch (event.type) {
    case 'flap':
      return 'flap';
    case 'pass':
      return 'pass';
    case 'pickup':
      return event.kind === 'coin' || event.kind === 'magnet' ? 'coin' : 'chime';
    case 'nearMiss':
      return 'nearMiss';
    case 'shieldPop':
      return 'pop';
    case 'milestone':
      return 'reward';
    case 'crash':
      return 'crash';
    case 'wind':
      return null;
  }
}
