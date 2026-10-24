export type SensorStatus = "connected" | "connecting" | "disconnected";

export interface SensorSource {
  start(onSample: (kPa: number) => void, onStatus: (status: SensorStatus) => void): Promise<void>;
  stop(): void;
}

export class WebSocketSource implements SensorSource {
  private socket?: WebSocket;
  private stopped = false;
  private onSample?: (kPa: number) => void;
  private onStatus?: (status: SensorStatus) => void;

  async start(onSample: (kPa: number) => void, onStatus: (status: SensorStatus) => void) {
    this.onSample = onSample;
    this.onStatus = onStatus;
    this.stopped = false;
    await this.connect();
  }

  private async connect(): Promise<void> {
    const url = process.env.NEXT_PUBLIC_SENSOR_WS_URL || "ws://localhost:8765";
    let delay = 500;

    const attempt = (): Promise<void> => new Promise((resolve) => {
      if (this.stopped) { resolve(); return; }
      const socket = new WebSocket(url);
      this.socket = socket;

      socket.addEventListener("open", () => { this.onStatus?.("connected"); resolve(); }, { once: true });
      socket.addEventListener("error", () => {
        this.onStatus?.("connecting");
        socket.close();
      }, { once: true });
      socket.addEventListener("message", (event) => {
        if (this.stopped) return;
        try {
          const value = JSON.parse(String(event.data))?.kpa;
          if (typeof value === "number" && Number.isFinite(value)) this.onSample?.(value);
        } catch {
          // Ignore malformed sensor packets.
        }
      });
      socket.addEventListener("close", () => {
        if (this.stopped) return;
        this.onStatus?.("connecting");
        setTimeout(() => attempt().then(resolve), delay);
        delay = Math.min(delay * 2, 8000);
      }, { once: true });
    });

    await attempt();
  }

  stop() {
    this.stopped = true;
    this.socket?.close();
    this.socket = undefined;
    this.onSample = undefined;
    this.onStatus = undefined;
  }
}
