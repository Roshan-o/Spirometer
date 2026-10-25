/**
 * lib/audio/swaraGlider.ts
 *
 * Breath-driven swara glider, adapted from the Gamaka Slider (index.html):
 * a sawtooth oscillator through a warm lowpass filter, gliding smoothly to
 * the pitch that matches the ball's height on a logarithmic scale.
 *
 * The three spirometer chambers are stacked into one continuous "position"
 * from 0 (all balls resting) to 3 (all balls at the top):
 *   Chamber 1 (blue)   0 → 1 : random noise focusing into Ga
 *   Chamber 2 (green)  1 → 2 : Ga glides up to Pa
 *   Chamber 3 (orange) 2 → 3 : Pa glides up to high Sa
 */

/** Default tonic: G3, the same default tonic as the Gamaka Slider. */
export const DEFAULT_SA_HZ = 196;

// Equal-tempered semitone offsets from Sa (Carnatic G2 = antara gandharam).
const GA = 4;
const PA = 7;
const SA_HIGH = 12;

export const CHAMBER_SWARAS = [["Noise", "Ga"], ["Ga", "Pa"], ["Pa", "Sa'"]] as const;

const semitone = (sa: number, n: number) => sa * Math.pow(2, n / 12);

export type SwaraPoint = { chamber: number; freq: number; noise: number; label: string };

/** Map a stacked ball position (0–3) to the pitch, noise amount and nearest swara. */
export function swaraAt(position: number, sa = DEFAULT_SA_HZ): SwaraPoint {
  const p = Math.max(0, Math.min(3, position));
  const chamber = Math.min(2, Math.floor(p));
  const r = p - chamber;
  const ga = semitone(sa, GA), pa = semitone(sa, PA), saHigh = semitone(sa, SA_HIGH);

  if (chamber === 0) return { chamber, freq: ga, noise: 1 - r, label: r < 0.5 ? "Noise" : "Ga" };

  // Glide on a log scale, exactly like the slider's y → frequency mapping.
  const [from, to, names] = chamber === 1 ? [ga, pa, ["Ga", "Pa"]] : [pa, saHigh, ["Pa", "Sa'"]];
  const freq = from * Math.pow(to / from, r);
  return { chamber, freq, noise: 0, label: names[r < 0.5 ? 0 : 1] };
}

export class SwaraGlider {
  private ctx?: AudioContext;
  private master?: GainNode;
  private tone?: GainNode;
  private noise?: GainNode;
  private osc?: OscillatorNode;
  private noiseFilter?: BiquadFilterNode;
  private muted = false;
  private lastLevel = -1;

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

    this.master = ctx.createGain();
    this.master.gain.setValueAtTime(0, t);
    this.master.connect(ctx.destination);

    // Tone voice: sawtooth → lowpass for warmth (same as the slider).
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.setValueAtTime(2000, t);
    lowpass.Q.setValueAtTime(1, t);
    this.tone = ctx.createGain();
    this.tone.gain.setValueAtTime(0, t);
    this.osc = ctx.createOscillator();
    this.osc.type = "sawtooth";
    this.osc.frequency.setValueAtTime(semitone(this.sa, GA), t);
    this.osc.connect(lowpass).connect(this.tone).connect(this.master);
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
    source.connect(this.noiseFilter).connect(this.noise).connect(this.master);
    source.start();

    this.ctx = ctx;
  }

  /** Follow the balls. `sounding` is false while the balls rest or the session is paused. */
  update(position: number, sounding: boolean) {
    const { ctx, master, tone, noise, osc, noiseFilter } = this;
    if (!ctx || !master || !tone || !noise || !osc || !noiseFilter) return;
    const t = ctx.currentTime;
    const { freq, noise: amount } = swaraAt(position, this.sa);

    osc.frequency.setTargetAtTime(freq, t, 0.03);
    // Equal-power crossfade so the noise → Ga transition has no loudness dip.
    tone.gain.setTargetAtTime(Math.sin((1 - amount) * Math.PI / 2), t, 0.03);
    noise.gain.setTargetAtTime(Math.cos((1 - amount) * Math.PI / 2) * 2, t, 0.03);
    // The noise band rises from an octave below Ga and tightens onto Ga.
    noiseFilter.frequency.setTargetAtTime(freq * Math.pow(2, -amount), t, 0.03);
    noiseFilter.Q.setTargetAtTime(0.7 + (1 - amount) * 12, t, 0.03);

    this.setLevel(sounding && !this.muted ? 0.15 : 0);
  }

  /** Mute takes effect immediately, even if the animation loop is not running. */
  setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) this.setLevel(0);
  }

  silence() {
    this.setLevel(0);
  }

  private setLevel(level: number) {
    const { ctx, master } = this;
    if (!ctx || !master || level === this.lastLevel) return;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.setTargetAtTime(level, t, level ? 0.02 : 0.05);
    this.lastLevel = level;
  }

  dispose() {
    void this.ctx?.close();
    this.ctx = undefined;
  }
}
