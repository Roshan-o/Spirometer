/**
 * lib/audio/swaraGlider.ts
 *
 * Breath-driven swara glider, adapted from the Gamaka Slider (index.html):
 * a sawtooth oscillator through a warm lowpass filter, gliding to the pitch
 * that matches the balls' height on a logarithmic scale.
 *
 * The three ball heights (0–1 each) stack into one position from 0 (all
 * resting) to 3 (all at the top):
 *   Chamber 1 (blue)   0 → 1 : breath noise slowly focusing into Ga
 *   Chamber 2 (green)  1 → 2 : Ga glides up to Pa
 *   Chamber 3 (orange) 2 → 3 : Pa glides up to high Sa
 * Near the top of each chamber (and the bottom of the next) the pitch holds
 * the exact swara, so a breath held there is heard as a clean Ga, Pa or Sa'.
 *
 * A soft Sa drone (like a tanpura) plays while the session runs. A swara is
 * only heard as Ga or Pa relative to Sa; without it the ear takes the first
 * clear note (Ga) as Sa, and the rest sound like the wrong swaras.
 */

/** Default tonic: 256 Hz, the textbook Sa. Ga, Pa and high Sa are then 320, 384 and 512 Hz. */
export const DEFAULT_SA_HZ = 256;

// Just-intonation ratios, the way a tanpura is tuned: Ga (antara gandharam) 5/4,
// Pa 3/2, high Sa 2/1. Equal-tempered Ga is 14 cents sharp of 5/4 and sounds off.
const GA = 5 / 4;
const PA = 3 / 2;
const SA_HIGH = 2;

/** Share of a chamber's travel, at each end, that holds the exact swara instead of gliding. */
const HOLD = 0.1;

const VOICE_LEVEL = 0.15;
/** Quiet enough to sit behind the breath voice, loud enough to anchor the ear on Sa. */
const DRONE_LEVEL = 0.05;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Map a stacked ball position (0–3) to the pitch and the amount of breath noise (1 = all noise). */
export function swaraAt(position: number, sa = DEFAULT_SA_HZ) {
  const p = Math.max(0, Math.min(3, position));
  const chamber = Math.min(2, Math.floor(p));
  const r = p - chamber;

  if (chamber === 0) return { freq: sa * GA, noise: 1 - clamp01(r / (1 - HOLD)) };

  // Glide on a log scale, exactly like the slider's y → frequency mapping.
  const [from, to] = chamber === 1 ? [GA, PA] : [PA, SA_HIGH];
  const u = clamp01((r - HOLD) / (1 - 2 * HOLD));
  return { freq: sa * from * Math.pow(to / from, u), noise: 0 };
}

export class SwaraGlider {
  private ctx?: AudioContext;
  /** Breath voice (tone + noise); silent while the balls rest. */
  private voice?: GainNode;
  /** Sa drone; sounds for the whole running session. */
  private drone?: GainNode;
  private tone?: GainNode;
  private noise?: GainNode;
  private osc?: OscillatorNode;
  private noiseFilter?: BiquadFilterNode;
  private muted = false;
  private targets = new Map<GainNode, number>();

  constructor(private sa = DEFAULT_SA_HZ) {}

  /** Browsers only allow audio after a user gesture, so call this from one. */
  async unlock() {
    if (!this.ctx) this.build();
    if (this.ctx?.state === "suspended") await this.ctx.resume();
    return this.ctx?.state === "running";
  }

  get ready() { return this.ctx?.state === "running"; }

  private build() {
    const ctx = new AudioContext();
    const t = ctx.currentTime;

    this.voice = ctx.createGain();
    this.voice.gain.setValueAtTime(0, t);
    this.voice.connect(ctx.destination);

    // Tone voice: sawtooth → lowpass for warmth (same as the slider).
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.setValueAtTime(2000, t);
    lowpass.Q.setValueAtTime(1, t);
    this.tone = ctx.createGain();
    this.tone.gain.setValueAtTime(0, t);
    this.osc = ctx.createOscillator();
    this.osc.type = "sawtooth";
    this.osc.frequency.setValueAtTime(this.sa * GA, t);
    this.osc.connect(lowpass).connect(this.tone).connect(this.voice);
    this.osc.start();

    // Noise voice: looping white noise → bandpass that narrows onto Ga.
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    this.noiseFilter = ctx.createBiquadFilter();
    this.noiseFilter.type = "bandpass";
    this.noise = ctx.createGain();
    this.noise.gain.setValueAtTime(0, t);
    source.connect(this.noiseFilter).connect(this.noise).connect(this.voice);
    source.start();

    // Drone: Sa plus the Sa an octave below, soft waveforms so the breath voice stays in front.
    this.drone = ctx.createGain();
    this.drone.gain.setValueAtTime(0, t);
    this.drone.connect(ctx.destination);
    for (const [freq, type, mix] of [[this.sa, "triangle", 1], [this.sa / 2, "sine", 0.7]] as const) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(mix, t);
      osc.connect(gain).connect(this.drone);
      osc.start();
    }

    this.ctx = ctx;
  }

  /**
   * Follow the balls; call every frame while the session runs.
   * `ballHeights` are 0 (resting) to 1 (top), blue ball first. `active` is false while the tab is hidden.
   */
  update(ballHeights: readonly number[], active: boolean) {
    const { ctx, tone, noise, osc, noiseFilter } = this;
    if (!ctx || !tone || !noise || !osc || !noiseFilter) return;
    const position = ballHeights.reduce((sum, height) => sum + height, 0);
    const t = ctx.currentTime;
    const { freq, noise: amount } = swaraAt(position, this.sa);

    osc.frequency.setTargetAtTime(freq, t, 0.03);
    // Equal-power crossfade so the noise → Ga transition has no loudness dip.
    tone.gain.setTargetAtTime(Math.sin((1 - amount) * Math.PI / 2), t, 0.03);
    noise.gain.setTargetAtTime(Math.cos((1 - amount) * Math.PI / 2) * 2, t, 0.03);
    // The noise band rises from an octave below Ga and tightens onto Ga.
    noiseFilter.frequency.setTargetAtTime(freq * Math.pow(2, -amount), t, 0.03);
    noiseFilter.Q.setTargetAtTime(0.7 + (1 - amount) * 12, t, 0.03);

    const audible = active && !this.muted;
    this.fade(this.drone, audible ? DRONE_LEVEL : 0, 0.3);
    // The breath voice is silent while the balls rest at the bottom.
    this.fade(this.voice, audible && position > 0.02 ? VOICE_LEVEL : 0, 0.02);
  }

  /** Mute takes effect immediately, even if the animation loop is not running. */
  setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) this.silence();
  }

  /** Fade everything out (pause, end, hidden tab). The next update() brings it back. */
  silence() {
    this.fade(this.voice, 0);
    this.fade(this.drone, 0);
  }

  /** Ramp a gain to `level`; `rise` is the fade-in time constant in seconds. */
  private fade(gain: GainNode | undefined, level: number, rise = 0.02) {
    const { ctx } = this;
    if (!ctx || !gain || this.targets.get(gain) === level) return;
    const t = ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.setTargetAtTime(level, t, level ? rise : 0.05);
    this.targets.set(gain, level);
  }

  dispose() {
    void this.ctx?.close();
    this.ctx = undefined;
  }
}
