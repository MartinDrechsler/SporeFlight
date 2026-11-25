/**
 * Every sound effect as data: a few voices played together. A tone is an
 * oscillator gliding from one pitch to another; a noise is filtered hiss,
 * which gives whooshes, clicks and the shimmer of metal and glass.
 * Volumes are before the effects' own master volume.
 */
export type Voice =
  | {
      kind: 'tone';
      wave: OscillatorType;
      /** Hz at the start, and at the end if it glides. */
      from: number;
      to?: number;
      seconds: number;
      volume: number;
      delay?: number;
      /** Seconds to fade in; short by default, for a crisp start. */
      attack?: number;
    }
  | {
      kind: 'noise';
      filter: BiquadFilterType;
      /** Filter frequency in Hz at the start, and at the end if it sweeps. */
      from: number;
      to?: number;
      q?: number;
      seconds: number;
      volume: number;
      delay?: number;
      attack?: number;
    };

const tone = (wave: OscillatorType, from: number, seconds: number, volume: number, more: Partial<Extract<Voice, { kind: 'tone' }>> = {}): Voice => ({
  kind: 'tone', wave, from, seconds, volume, ...more,
});
const noise = (filter: BiquadFilterType, from: number, seconds: number, volume: number, more: Partial<Extract<Voice, { kind: 'noise' }>> = {}): Voice => ({
  kind: 'noise', filter, from, seconds, volume, ...more,
});

/** Notes in Hz, so melodies read as music. */
const C5 = 523, E5 = 659, G5 = 784, B5 = 988, C6 = 1047, E6 = 1319, G6 = 1568, C7 = 2093, E7 = 2637, G7 = 3136, C8 = 4186;

/** Several notes one after another, starting at `delay`. */
const arpeggio = (wave: OscillatorType, notes: number[], gap: number, seconds: number, volume: number, delay = 0): Voice[] =>
  notes.map((from, i) => tone(wave, from, seconds, volume, { delay: delay + i * gap }));

/** A metal coin: two quick notes, a click, and a ring of high partials that fades slowly. */
const coinRing = (delay = 0): Voice[] => [
  noise('highpass', 6000, 0.03, 0.12, { delay }),
  tone('square', B5, 0.07, 0.045, { delay }),
  tone('square', E6, 0.28, 0.045, { delay: delay + 0.07 }),
  tone('sine', C8, 0.35, 0.025, { delay: delay + 0.07 }),
  tone('sine', E6 * 4.07, 0.3, 0.012, { delay: delay + 0.07 }),
];

export const SOUNDS = {
  // A jump: a soft squish as the mushroom squeezes, then a springy rising "boing" and a puff of air as it
  // stretches forward. Short and soft, since it plays on every tap.
  flap: [
    noise('lowpass', 900, 0.05, 0.11, { to: 260 }),
    tone('sine', 230, 0.13, 0.075, { to: 560, delay: 0.025 }),
    tone('triangle', 460, 0.09, 0.016, { to: 1120, delay: 0.025 }),
    noise('bandpass', 1100, 0.12, 0.045, { to: 2600, q: 1.4, delay: 0.03 }),
  ],
  pass: [tone('sine', C6, 0.05, 0.03)],
  // A sporeling rescued: a happy little two-note chirp and a soft chime.
  sporeling: [
    tone('sine', 880, 0.08, 0.06, { to: 1320 }),
    tone('sine', 1320, 0.12, 0.06, { to: 1760, delay: 0.09 }),
    tone('triangle', E6, 0.3, 0.02, { delay: 0.09 }),
  ],
  nearMiss: [noise('bandpass', 3200, 0.2, 0.16, { to: 700, q: 2 }), tone('sine', E6, 0.14, 0.04, { to: G6, delay: 0.04 })],
  coin: coinRing(),
  goldCoin: [...coinRing(), ...arpeggio('triangle', [E6, G6, C7, E7], 0.07, 0.25, 0.04, 0.12), noise('highpass', 8000, 0.4, 0.04, { delay: 0.12 })],
  diamond: [
    ...arpeggio('sine', [C7, E7, G7, C8], 0.05, 0.55, 0.045),
    tone('sine', C8 * 1.34, 0.7, 0.015, { delay: 0.15 }),
    noise('highpass', 9000, 0.25, 0.04, { attack: 0.05 }),
  ],
  shield: [noise('bandpass', 400, 0.3, 0.12, { to: 2200, q: 1 }), tone('triangle', 440, 0.3, 0.05, { to: 880 })],
  magnet: [tone('square', 220, 0.16, 0.035, { to: 880 }), tone('sawtooth', 110, 0.35, 0.03, { attack: 0.03 }), tone('sine', 1760, 0.2, 0.02, { delay: 0.12 })],
  shieldPop: [tone('sine', 600, 0.09, 0.12, { to: 1500 }), noise('highpass', 2000, 0.07, 0.1)],
  milestone: [...arpeggio('triangle', [C5, E5, G5], 0.1, 0.18, 0.07), tone('triangle', C6, 0.5, 0.07, { delay: 0.3 }), tone('triangle', G5, 0.5, 0.04, { delay: 0.3 })],
  crash: [
    tone('sine', 160, 0.4, 0.3, { to: 40 }),
    noise('lowpass', 1400, 0.4, 0.28, { to: 200 }),
    noise('bandpass', 2200, 0.1, 0.1, { q: 0.8 }),
  ],
  landed: [tone('sine', 120, 0.16, 0.15, { to: 60 }), noise('lowpass', 500, 0.12, 0.1)],
  finish: [
    ...arpeggio('triangle', [C5, E5, G5, C6], 0.11, 0.2, 0.07),
    ...[C6, E6, G6].map((note) => tone('triangle', note, 0.8, 0.04, { delay: 0.44 })),
    noise('highpass', 8000, 0.6, 0.03, { delay: 0.44, attack: 0.1 }),
  ],
  wind: [noise('bandpass', 300, 0.9, 0.12, { to: 700, q: 0.7, attack: 0.25 })],
  bossWarn: [tone('sawtooth', 80, 0.7, 0.08, { to: 60 }), tone('square', 55, 0.7, 0.04), noise('lowpass', 300, 0.7, 0.18, { attack: 0.1 })],
  bossThrow: [noise('bandpass', 300, 0.25, 0.14, { to: 1300, q: 1.5 }), tone('triangle', 320, 0.18, 0.06, { to: 140 })],
  // A crack and a diamond's glassy chime: every hit on a vein gives one.
  veinHit: [
    noise('highpass', 5000, 0.03, 0.1),
    tone('sine', 2349, 0.22, 0.07),
    tone('sine', 2349 * 2.76, 0.15, 0.025),
    ...arpeggio('sine', [C7, E7, G7], 0.045, 0.4, 0.035, 0.06),
  ],
  veinBreak: [
    noise('highpass', 3000, 0.45, 0.22),
    ...arpeggio('sine', [E7, G7, C8, E7 * 2], 0.035, 0.4, 0.04),
    tone('sine', 300, 0.2, 0.08, { to: 120 }),
  ],
  // Menus and rewards.
  click: [tone('triangle', 880, 0.04, 0.06), noise('highpass', 4000, 0.02, 0.04)],
  buy: [...coinRing(), ...coinRing(0.1)],
  error: [tone('square', 196, 0.12, 0.05, { to: 160 }), tone('square', 147, 0.18, 0.05, { delay: 0.13 })],
  reward: arpeggio('triangle', [G5, B5, 1175], 0.08, 0.2, 0.08),
  quest: [...arpeggio('triangle', [E6, G6, C7], 0.07, 0.18, 0.06), noise('highpass', 7000, 0.3, 0.03, { delay: 0.14 })],
  achievement: [
    ...arpeggio('square', [C5, G5, C6], 0.09, 0.16, 0.035),
    ...[C6, E6, G6, C7].map((note) => tone('triangle', note, 0.9, 0.04, { delay: 0.27 })),
    ...arpeggio('sine', [C7, E7, G7, C8], 0.06, 0.5, 0.025, 0.3),
  ],
  star: [tone('triangle', E6, 0.35, 0.07), tone('sine', E7, 0.4, 0.03, { delay: 0.03 }), noise('highpass', 8000, 0.2, 0.03)],
  newBest: [...arpeggio('square', [G5, C6, E6, G6], 0.08, 0.14, 0.035), tone('triangle', C7, 0.7, 0.05, { delay: 0.32 }), noise('highpass', 8000, 0.5, 0.03, { delay: 0.32 })],
  biome: [tone('sine', C5, 1.2, 0.05, { attack: 0.3 }), tone('sine', G5, 1.2, 0.04, { attack: 0.3 }), ...arpeggio('sine', [E6, G6, C7], 0.12, 0.6, 0.025, 0.25)],
} satisfies Record<string, Voice[]>;

export type SoundName = keyof typeof SOUNDS;

/**
 * Sounds heard over and over get a small random change of pitch each time
 * (this share up or down), so a hundred flaps never sound like one recording.
 */
export const PITCH_VARIATION: Partial<Record<SoundName, number>> = { flap: 0.06 };
