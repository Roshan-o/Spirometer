"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SensorSource, SensorStatus, WebSocketSource } from "./sources";

export function usePressureSensor() {
  const [pressure, setPressure] = useState(0);
  const pressureRef = useRef(0);
  const [status, setStatus] = useState<SensorStatus>("connecting");
  const adapter = useRef<SensorSource | null>(null);
  const generation = useRef(0);

  const disconnect = useCallback(() => {
    generation.current++;
    adapter.current?.stop();
    adapter.current = null;
    pressureRef.current = 0;
    setStatus("disconnected");
  }, []);

  const connect = useCallback(async () => {
    disconnect();
    const id = generation.current;
    const source = new WebSocketSource();
    adapter.current = source;
    pressureRef.current = 0;
    setPressure(0);
    setStatus("connecting");
    try {
      await source.start((sample) => {
        if (generation.current !== id) return;
        const bounded = Math.max(-5, Math.min(5, sample));
        pressureRef.current = pressureRef.current + 0.35 * (bounded - pressureRef.current);
        setPressure(pressureRef.current);
      }, (nextStatus) => {
        if (generation.current === id) setStatus(nextStatus);
      });
    } catch {
      if (generation.current === id) setStatus("disconnected");
    }
  }, [disconnect]);

  useEffect(() => {
    const startup = Promise.resolve().then(connect);
    return () => { void startup; disconnect(); };
  }, [connect, disconnect]);

  return { pressure, pressureRef, status, connect, disconnect };
}
