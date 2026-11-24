import type { GameEvent } from '../gameplay/world';
import { Music, type Track } from './music';
import { PITCH_VARIATION, SOUNDS, type SoundName, type Voice } from './sounds';

/** Sounds for menus and rewards that are not gameplay events. */
export type UiSound = 'click' | 'buy' | 'reward' | 'error' | 'quest' | 'achievement' | 'biome' | 'star' | 'newBest';

/** Master volume of the effects, above the music. */
const EFFECTS_VOLUME = 0.9;

/**
 * Music and sound effects. Effects are synthesized (no files); the music is
 * two loops loaded when first wanted. Browsers only allow sound after a user
 * gesture, so `unlock` is called on the first tap. Every method is safe to
 * call at any time, even if audio is unavailable.
 */
export class Audio {
  private context: AudioContext | null = null;
  private effects: GainNode | null = null;
  private music: Music | null = null;
  private noise: AudioBuffer | null = null;
  /** The track wanted before audio was unlocked, started on unlock. */
  private track: Track | null = null;
  private hidden = false;
  private musicGain: GainNode | null = null;
  private musicVolume: number;
  enabled: boolean;

  constructor(enabled: boolean, musicVolume: number) {
    this.enabled = enabled;
    this.musicVolume = musicVolume;
  }

  unlock(): void {
    if (!this.context) this.create();
    const ctx = this.context;
    // iOS starts a context only when a sound is played inside the gesture, so play a silent one.
    if (ctx && ctx.state !== 'running' && this.enabled && !this.hidden) {
      const silence = ctx.createBufferSource();
      silence.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      silence.connect(ctx.destination);
      silence.start();
    }
    this.applyState();
  }

  /** Sound on or off (the speaker button). */
  setEnabled(on: boolean): void {
    this.enabled = on;
    this.applyState();
  }

  /** The app went to the background or came back. */
  setHidden(hidden: boolean): void {
    this.hidden = hidden;
    this.applyState();
  }

  /** Which loop should play now; called every frame, it only acts on a change. */
  setMusic(track: Track | null): void {
    this.track = track;
    // Music turned all the way down is not just silent but stopped, so nothing loads or plays.
    this.music?.want(this.musicVolume > 0 ? track : null);
  }

  /** Music loudness from 0 to 1 (settings); applies at once, effects are not touched. */
  setMusicVolume(volume: number): void {
    this.musicVolume = volume;
    if (this.musicGain && this.context) this.musicGain.gain.setTargetAtTime(volume, this.context.currentTime, 0.05);
    this.setMusic(this.track);
  }

  react(event: GameEvent): void {
    const sound = soundFor(event);
    if (sound) this.play(sound);
  }

  ui(sound: UiSound): void {
    this.play(sound);
  }

  private create(): void {
    try {
      const ctx = new AudioContext();
      this.effects = ctx.createGain();
      this.effects.gain.value = EFFECTS_VOLUME;
      this.effects.connect(ctx.destination);
      this.noise = whiteNoise(ctx);
      this.musicGain = ctx.createGain();
      this.musicGain.gain.value = this.musicVolume;
      this.musicGain.connect(ctx.destination);
      this.music = new Music(ctx, this.musicGain);
      this.setMusic(this.track);
      this.context = ctx;
    } catch {
      this.context = null;
    }
  }

  /** Muted or hidden: the whole audio clock stops, so nothing plays and no battery is spent. */
  private applyState(): void {
    const ctx = this.context;
    if (!ctx) return;
    // 'interrupted' (iOS) counts as stopped too, so it is resumed on the next gesture.
    if (this.enabled && !this.hidden) {
      if (ctx.state !== 'running') void ctx.resume();
    } else if (ctx.state === 'running') {
      void ctx.suspend();
    }
  }

  private play(name: SoundName): void {
    const ctx = this.context;
    if (!this.enabled || !ctx || !this.effects || ctx.state !== 'running') return;
    const vary = PITCH_VARIATION[name] ?? 0;
    const pitch = 1 + (Math.random() * 2 - 1) * vary;
    for (const voice of SOUNDS[name] as Voice[]) this.voice(ctx, this.effects, voice, pitch);
  }

  /** Plays one voice; `pitch` scales every frequency (1 = as written). */
  private voice(ctx: AudioContext, output: AudioNode, voice: Voice, pitch: number): void {
    const start = ctx.currentTime + (voice.delay ?? 0);
    const end = start + voice.seconds;
    const attack = Math.min(voice.attack ?? 0.004, voice.seconds / 2);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(voice.volume, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    gain.connect(output);

    let source: AudioScheduledSourceNode;
    if (voice.kind === 'tone') {
      const osc = ctx.createOscillator();
      osc.type = voice.wave;
      osc.frequency.setValueAtTime(voice.from * pitch, start);
      if (voice.to) osc.frequency.exponentialRampToValueAtTime(voice.to * pitch, end);
      osc.connect(gain);
      source = osc;
    } else {
      const hiss = ctx.createBufferSource();
      hiss.buffer = this.noise;
      hiss.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = voice.filter;
      filter.Q.value = voice.q ?? 1;
      filter.frequency.setValueAtTime(voice.from * pitch, start);
      if (voice.to) filter.frequency.exponentialRampToValueAtTime(voice.to * pitch, end);
      hiss.connect(filter).connect(gain);
      source = hiss;
    }
    source.start(start);
    source.stop(end + 0.02);
  }
}

function whiteNoise(ctx: AudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

export function soundFor(event: GameEvent): SoundName | null {
  switch (event.type) {
    case 'flap':
      return 'flap';
    case 'pass':
      return 'pass';
    case 'pickup':
      return event.kind;
    case 'nearMiss':
      return 'nearMiss';
    case 'shieldPop':
      return 'shieldPop';
    case 'milestone':
      return 'milestone';
    case 'crash':
      return 'crash';
    case 'wind':
      return 'wind';
    case 'landed':
      return 'landed';
    case 'finish':
      return 'finish';
    case 'bossWarn':
      return 'bossWarn';
    case 'bossThrow':
      return 'bossThrow';
    case 'veinHit':
      return 'veinHit';
    case 'veinBreak':
      return 'veinBreak';
  }
}
