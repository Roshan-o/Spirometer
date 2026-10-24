/**
 * bridge/bridge.ts
 *
 * Reads raw HX710B pressure values from Arduino over USB Serial and
 * broadcasts them as kPa to the browser via WebSocket on ws://localhost:8765.
 *
 * Arduino output format (current sketch):
 *   "Pressure Raw Value: 123456"
 *   Also accepts plain numbers: "1.234"
 *
 * Usage:
 *   npm run bridge
 *   npm run bridge -- --port COM7 --baud 9600 --scale 50000
 */

import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";
import { WebSocketServer, WebSocket } from "ws";

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag: string, fallback: string) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const SERIAL_PORT = getArg("--port", "COM7");
const BAUD_RATE   = parseInt(getArg("--baud", "9600"), 10);
const WS_PORT     = parseInt(getArg("--ws-port", "8765"), 10);

// ── Calibration ───────────────────────────────────────────────────────────────
// COUNTS_PER_KPA: how many raw counts = 1 kPa of pressure.
// Default 50000 is a rough guess — adjust with --scale <number> until balls
// reach the top when you blow hard.
//   npm run bridge -- --scale 30000   (lower = more sensitive)
//   npm run bridge -- --scale 80000   (higher = less sensitive)
const COUNTS_PER_KPA = parseInt(getArg("--scale", "50000"), 10);

// Zero offset is auto-learned from the first 3 seconds of idle readings.
let ZERO_OFFSET = 0;
let calibrated  = false;
const calibrationSamples: number[] = [];
// ──────────────────────────────────────────────────────────────────────────────

/** Extract the last integer/float from a line, e.g. "Pressure Raw Value: 123456" → 123456 */
function parseRaw(line: string): number | null {
  const match = line.match(/([-\d]+\.?\d*)\s*$/);
  if (!match) return null;
  const n = parseFloat(match[1]);
  return Number.isFinite(n) ? n : null;
}

/** Convert raw HX710B count → kPa. Positive = exhale, negative = inhale. */
function rawToKpa(raw: number): number {
  const kpa = (raw - ZERO_OFFSET) / COUNTS_PER_KPA;
  return Math.max(-5.0, Math.min(5.0, kpa)); // negative = inhalation
}

async function main() {
  // ── 1. Serial port ──────────────────────────────────────────────────────────
  const serial = new SerialPort({ path: SERIAL_PORT, baudRate: BAUD_RATE });
  const parser = serial.pipe(new ReadlineParser({ delimiter: "\n" }));

  serial.on("open", () => {
    console.log(`\n[bridge] Serial open  → ${SERIAL_PORT} @ ${BAUD_RATE} baud`);
    console.log(`[bridge] WebSocket     → ws://localhost:${WS_PORT}`);
    console.log(`[bridge] Scale factor  → ${COUNTS_PER_KPA} counts/kPa  (override: --scale N)\n`);
    console.log("  Auto-calibrating zero baseline for 3 seconds — do NOT blow...\n");
  });

  serial.on("error", (err) => {
    console.error("[bridge] Serial error:", err.message);
    process.exit(1);
  });

  // ── 2. WebSocket server ─────────────────────────────────────────────────────
  const wss = new WebSocketServer({ port: WS_PORT });

  wss.on("listening", () =>
    console.log(`[bridge] Listening on ws://localhost:${WS_PORT} — waiting for browser...`)
  );

  wss.on("connection", (socket) => {
    console.log(`[bridge] Browser connected  (total: ${wss.clients.size})`);
    socket.on("close", () =>
      console.log(`[bridge] Browser disconnected (total: ${wss.clients.size})`)
    );
  });

  // ── 3. Serial → calibration → WebSocket ────────────────────────────────────
  let lastLog = 0;
  const calibrationDeadline = Date.now() + 3000;

  parser.on("data", (line: string) => {
    const trimmed = line.trim();

    // Echo any Arduino error / info lines
    if (/^[A-Za-z]/.test(trimmed) && !trimmed.match(/[-\d]/)) {
      console.log(`[arduino] ${trimmed}`);
      return;
    }

    const raw = parseRaw(trimmed);
    if (raw === null) return;

    // ── Auto-calibration phase (first 3 s) ───────────────────────────────────
    if (!calibrated) {
      calibrationSamples.push(raw);
      if (Date.now() >= calibrationDeadline && calibrationSamples.length > 0) {
        const sorted = [...calibrationSamples].sort((a, b) => a - b);
        ZERO_OFFSET = sorted[Math.floor(sorted.length / 2)]; // median
        calibrated = true;
        console.log(`\n✅ Zero baseline: ${ZERO_OFFSET}  (${calibrationSamples.length} samples)`);
        console.log(`   Scale: ${COUNTS_PER_KPA} counts/kPa  →  full bar at ${ZERO_OFFSET + COUNTS_PER_KPA * 2.5} raw`);
        console.log("\n  TIME       RAW COUNT       BAR                        kPa");
        console.log("  " + "─".repeat(62));
      }
      return; // don't stream to browser yet
    }

    const kpa = rawToKpa(raw);

    // ── Broadcast ─────────────────────────────────────────────────────────────
    const msg = JSON.stringify({ kpa: Math.round(kpa * 1000) / 1000 });
    let sent = 0;
    wss.clients.forEach((c) => {
      if (c.readyState === WebSocket.OPEN) { c.send(msg); sent++; }
    });

    // ── Terminal display (~5 Hz) ──────────────────────────────────────────────
    const now = Date.now();
    if (now - lastLog > 200) {
      lastLog = now;
      const BAR_W  = 24;
      const ratio  = kpa / 3.0;                                           // -1..+1 (approx)
      const exhale = Math.max(0, Math.min(BAR_W, Math.round(ratio * BAR_W)));   // 0..24
      const inhale = Math.max(0, Math.min(BAR_W, Math.round(-ratio * BAR_W)));  // 0..24
      // exhale fills from left (█), inhale fills from right (▓)
      const bar    = exhale > 0
        ? "█".repeat(exhale)  + "░".repeat(BAR_W - exhale)
        : "░".repeat(BAR_W - inhale) + "▓".repeat(inhale);
      const dir    = kpa >= 0.01 ? "↑exhale" : kpa <= -0.01 ? "↓inhale" : "  idle ";
      const time   = new Date().toLocaleTimeString("en-US", { hour12: false });
      const rawStr = String(raw).padStart(12);
      console.log(`  ${time}  ${rawStr}  [${bar}]  ${kpa.toFixed(3)} kPa  ${dir}  [clients:${sent}]`);
    }
  });

  // ── 4. Graceful shutdown ────────────────────────────────────────────────────
  process.on("SIGINT", () => {
    console.log("\n[bridge] Shutting down...");
    serial.close();
    wss.close(() => process.exit(0));
  });
}

main().catch((err) => {
  console.error("[bridge] Fatal:", err);
  process.exit(1);
});
