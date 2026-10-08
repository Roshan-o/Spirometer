"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MicSource, SensorKind, SensorSource, SensorStatus, SimulatedSource, WebSocketSource } from "./sources";

export function usePressureSensor(initialKind: SensorKind = "sim", enabled = true) {
  const [pressure, setPressure] = useState(0);
  const [status, setStatus] = useState<SensorStatus>(enabled ? "connecting" : "disconnected");
  const [source, setSource] = useState(initialKind);
  const adapter = useRef<SensorSource | null>(null);
  const simRef = useRef<SimulatedSource | null>(null);
  const smooth = useRef(0);
  const generation = useRef(0);
  const lastUiUpdate = useRef(0);

  const disconnect = useCallback(() => {
    generation.current++;
    adapter.current?.stop();
    adapter.current = null;
    setStatus("disconnected");
  }, []);

  const connect = useCallback(async (kind: SensorKind) => {
    disconnect();
    const id = generation.current;
    setSource(kind);
    setStatus("connecting");
    smooth.current = 0;
    const instance = kind === "sim" ? new SimulatedSource() : kind === "mic" ? new MicSource() : new WebSocketSource();
    adapter.current = instance;
    if (instance instanceof SimulatedSource) simRef.current = instance;
    try {
      await instance.start((sample) => {
        if (generation.current !== id) return;
        const clamped = Math.max(0, Math.min(2.5, sample));
        smooth.current += 0.3 * (clamped - smooth.current);
        const now = performance.now();
        if (now - lastUiUpdate.current >= 100) {
          lastUiUpdate.current = now;
          setPressure(smooth.current);
        }
      });
      if (generation.current === id) setStatus("connected");
    } catch {
      if (generation.current !== id) return;
      instance.stop();
      if (kind === "mic") {
        setSource("sim");
        const fallback = new SimulatedSource();
        adapter.current = fallback;
        simRef.current = fallback;
        await fallback.start((sample) => {
          if (generation.current !== id) return;
          const clamped = Math.max(0, Math.min(2.5, sample));
          smooth.current += 0.3 * (clamped - smooth.current);
          const now = performance.now();
          if (now - lastUiUpdate.current >= 100) {
            lastUiUpdate.current = now;
            setPressure(smooth.current);
          }
        });
        if (generation.current === id) setStatus("connected");
        return;
      }
      setStatus("disconnected");
    }
  }, [disconnect]);

  useEffect(() => {
    if (!enabled) return disconnect;
    const startup = Promise.resolve().then(() => connect(initialKind));
    return () => { void startup; disconnect(); };
  }, [connect, disconnect, enabled, initialKind]);

  const setBlowing = useCallback((value: boolean) => simRef.current?.setBlowing(value), []);
  return { pressure, status, source, connect, disconnect, setBlowing };
}
