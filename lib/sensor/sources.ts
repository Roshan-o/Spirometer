export type SensorKind = "sim" | "mic" | "sensor";
export type SensorStatus = "connected" | "connecting" | "disconnected";

export interface SensorSource {
  start(onSample: (kPa: number) => void): Promise<void>;
  stop(): void;
}

export class SimulatedSource implements SensorSource {
  private onSample?: (kPa: number) => void;
  private pressure = 0;
  private blowing = false;
  private last = 0;
  private frame = 0;

  async start(onSample: (kPa: number) => void) {
    this.onSample = onSample;
    this.last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - this.last) / 1000, 0.1);
      this.last = now;
      this.pressure = Math.max(0, Math.min(2.5, this.pressure + (this.blowing ? 1.2 : -2) * dt));
      onSample(this.pressure + (Math.random() * 0.06 - 0.03));
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  setBlowing(value: boolean) { this.blowing = value; }
  stop() { cancelAnimationFrame(this.frame); this.blowing = false; this.onSample = undefined; }
}

export class MicSource implements SensorSource {
  private stream?: MediaStream;
  private context?: AudioContext;
  private frame = 0;
  async start(onSample: (kPa: number) => void) {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.context = new AudioContext();
    const analyser = this.context.createAnalyser();
    analyser.fftSize = 2048;
    this.context.createMediaStreamSource(this.stream).connect(analyser);
    const data = new Float32Array(analyser.fftSize);
    const calibration: number[] = [];
    const started = performance.now();
    const tick = () => {
      analyser.getFloatTimeDomainData(data);
      let sum = 0;
      for (const sample of data) sum += sample * sample;
      const rms = Math.sqrt(sum / data.length);
      if (performance.now() - started < 1000) calibration.push(rms);
      const noise = calibration.length ? calibration.reduce((a, b) => a + b, 0) / calibration.length : 0;
      onSample(Math.max(0, Math.min(2.5, ((rms - noise) / 0.16) * 2)));
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }
  stop() {
    cancelAnimationFrame(this.frame);
    this.stream?.getTracks().forEach((track) => track.stop());
    void this.context?.close();
    this.stream = undefined;
    this.context = undefined;
  }
}

export class WebSocketSource implements SensorSource {
  private socket?: WebSocket;
  private stopped = false;
  private onSample?: (kPa: number) => void;

  async start(onSample: (kPa: number) => void) {
    this.onSample = onSample;
    this.stopped  = false;
    await this.connect();
  }

  private async connect(): Promise<void> {
    const url = process.env.NEXT_PUBLIC_SENSOR_WS_URL || "ws://localhost:8765";
    let delay = 500; // start retry at 500 ms

    const attempt = (): Promise<void> =>
      new Promise((resolve) => {
        if (this.stopped) { resolve(); return; }

        const socket = new WebSocket(url);
        this.socket  = socket;

        socket.addEventListener("open", () => resolve(), { once: true });

        socket.addEventListener("error", () => {
          socket.close();
          if (this.stopped) { resolve(); return; }
          console.warn(`[sensor] WS connection failed, retrying in ${delay} ms…`);
          setTimeout(() => attempt().then(resolve), delay);
          delay = Math.min(delay * 2, 8000); // cap at 8 s
        }, { once: true });

        socket.addEventListener("message", (event) => {
          if (this.stopped) return;
          try {
            const value = JSON.parse(String(event.data))?.kpa;
            if (typeof value === "number" && Number.isFinite(value) && this.onSample)
              this.onSample(value);
          } catch { /* Ignore malformed sensor packets. */ }
        });

        socket.addEventListener("close", () => {
          if (this.stopped) return;
          console.warn(`[sensor] WS closed, reconnecting in ${delay} ms…`);
          setTimeout(() => attempt().then(resolve), delay);
          delay = Math.min(delay * 2, 8000);
        }, { once: true });
      });

    await attempt();
  }

  stop() {
    this.stopped = true;
    this.socket?.close();
    this.socket  = undefined;
    this.onSample = undefined;
  }
}
