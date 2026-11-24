import menuUrl from './music/menu.mp3?url';
import flightUrl from './music/flight.mp3?url';

export type Track = 'menu' | 'flight';

/**
 * The two music loops. Each file holds one full musical loop of `loopSeconds`
 * plus an extra second, so the loop point is never at the very end of the
 * decoded audio, where some browsers add silence.
 */
const TRACKS: Record<Track, { url: string; loopSeconds: number; volume: number }> = {
  menu: { url: menuUrl, loopSeconds: 27.428, volume: 0.42 },
  flight: { url: flightUrl, loopSeconds: 39.7245, volume: 0.32 },
};

const FADE_SECONDS = 0.8;

interface Playing {
  track: Track;
  source: AudioBufferSourceNode;
  gain: GainNode;
}

/**
 * Plays one track at a time, looping without a gap, and crossfades when the
 * wanted track changes. Files load only when first wanted.
 */
export class Music {
  private readonly buffers = new Map<Track, Promise<AudioBuffer | null>>();
  private playing: Playing | null = null;
  private wanted: Track | null = null;

  constructor(
    private readonly context: AudioContext,
    private readonly output: AudioNode,
  ) {}

  /** Asks for a track (or silence); does nothing if it is already the one playing. */
  want(track: Track | null): void {
    if (track === this.wanted) return;
    this.wanted = track;
    this.fadeOut();
    if (track) void this.start(track);
  }

  private async start(track: Track): Promise<void> {
    const buffer = await this.load(track);
    // The wish may have changed while the file was loading.
    if (!buffer || this.wanted !== track || this.playing) return;
    const ctx = this.context;
    const { loopSeconds, volume } = TRACKS[track];
    const offset = firstSound(buffer);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = offset;
    source.loopEnd = Math.min(buffer.duration, offset + loopSeconds);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + FADE_SECONDS);
    source.connect(gain).connect(this.output);
    source.start(0, offset);
    this.playing = { track, source, gain };
  }

  private fadeOut(): void {
    const playing = this.playing;
    if (!playing) return;
    this.playing = null;
    const now = this.context.currentTime;
    playing.gain.gain.cancelScheduledValues(now);
    playing.gain.gain.setValueAtTime(playing.gain.gain.value, now);
    playing.gain.gain.exponentialRampToValueAtTime(0.0001, now + FADE_SECONDS);
    playing.source.stop(now + FADE_SECONDS);
  }

  private load(track: Track): Promise<AudioBuffer | null> {
    let buffer = this.buffers.get(track);
    if (!buffer) {
      buffer = fetch(TRACKS[track].url)
        .then((response) => response.arrayBuffer())
        .then((data) => this.context.decodeAudioData(data))
        .catch(() => null);
      this.buffers.set(track, buffer);
    }
    return buffer;
  }
}

/**
 * Seconds of silence a decoder put before the music. It differs between
 * browsers, so the loop is measured from the first sound, not from zero.
 */
function firstSound(buffer: AudioBuffer): number {
  const samples = buffer.getChannelData(0);
  const limit = Math.min(samples.length, Math.floor(buffer.sampleRate * 0.25));
  for (let i = 0; i < limit; i++) if (Math.abs(samples[i]!) > 0.003) return i / buffer.sampleRate;
  return 0;
}
