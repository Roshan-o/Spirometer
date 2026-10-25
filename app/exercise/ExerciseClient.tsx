"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, LayoutDashboard, LogOut, Pause, Play, RefreshCw, StopCircle, Volume2, VolumeX, Wind } from "lucide-react";
import { logout } from "../actions/auth";
import { usePressureSensor } from "@/lib/sensor/usePressureSensor";
import { DEFAULT_SA_HZ, SwaraGlider, swaraAt, type SwaraPoint } from "@/lib/audio/swaraGlider";
import { saveExerciseSession, type CompletedRepetition } from "../actions/sessions";

const guides = [
  ["Take a deep breath", "Sit upright and take a slow, comfortable breath before using the mouthpiece."],
  ["Seal and breathe steadily", "Keep your lips sealed around the mouthpiece and follow the breathing target shown on screen."],
  ["Hold and release", "Keep the balls in the green zone as long as you can, then relax and breathe out."],
] as const;
type State = "idle" | "running" | "paused" | "ended";
type ExerciseConfig = {
  easy: number;
  medium: number;
  hard: number;
  target_peak: number;
  target_exhale_hold: number;
  target_inhale_hold: number;
  sa_frequency?: number;
};
// TEMP: sound test mode. Forces the sensor to "connected" and drives the balls from a
// manual pressure slider. Set to false (or delete every SOUND_TEST block) once verified.
const SOUND_TEST = true;
const BALL_COLORS = ["#1E73E8", "#2EB84B", "#F59E0B"];

// TEMP: manual pressure slider for testing the swara sound without the Arduino.
function SoundTestSlider({ value, max, levels, swara, onChange }: { value:number; max:number; levels:number[]; swara:SwaraPoint|null; onChange:(v:number)=>void }) {
  return <section className="mt-3 shrink-0 rounded-[16px] border border-dashed border-[#f0b45a] bg-[#FFF8EC] px-4 py-3">
    <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
      <b className="text-[#9a5b00]">Sound test (temporary): sensor simulated</b>
      <span className="tabular-nums text-[#0F2A43]">{value.toFixed(2)} kPa · {swara ? `${swara.label} ${swara.freq.toFixed(1)} Hz` : "silent"}</span>
    </div>
    <input type="range" min={0} max={max} step={0.01} value={value} onChange={(e)=>onChange(Number(e.target.value))} aria-label="Test pressure in kPa" className="mt-2 w-full accent-[#1E6FE0]"/>
    <div className="relative h-4 text-[10px] text-[#6B7C8F]">
      {[0, ...levels].map((kpa, i) => <span key={i} className={`absolute whitespace-nowrap ${i ? "-translate-x-1/2" : ""}`} style={{left:`${kpa / max * 100}%`, color: i ? BALL_COLORS[i-1] : undefined}}>{["Noise", "Ga", "Pa", "Sa'"][i]}</span>)}
    </div>
  </section>;
}

function Sidebar() {
  const router = useRouter();
  return <aside className="w-[275px] shrink-0 bg-[#EEF5FB] text-[#0F2A43] max-lg:w-[210px] max-md:hidden"><div className="sticky top-0 flex h-dvh flex-col px-4 py-5">
    <div className="mb-7 px-1 text-[19px] font-bold tracking-tight">BreathNote</div>
    <nav className="flex flex-1 flex-col gap-1 text-[13px]">
      <Link href="/dashboard" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-[#43586c] hover:bg-white/70"><LayoutDashboard size={16}/>Dashboard</Link>
      <Link href="/exercise" className="flex items-center gap-2 rounded-lg bg-[#DCEBFA] px-3 py-2.5 font-medium text-[#1E6FE0]"><Wind size={16}/>Breathing Session</Link>
    </nav>
    <div className="flex flex-col gap-1 text-[13px] text-[#526579]"><button className="flex items-center gap-2 rounded-lg px-2 py-2"><CircleHelp size={16}/>Help &amp; Support</button><button onClick={async()=>{await logout();router.push('/login')}} className="flex items-center gap-2 rounded-lg px-2 py-2"><LogOut size={16}/>Logout</button></div>
  </div></aside>;
}

function MobileNav() {
  const router = useRouter();
  return <nav className="mb-3 flex shrink-0 items-center gap-1 text-[13px] text-[#43586c] md:hidden">
    <span className="mr-auto text-[17px] font-bold tracking-tight text-[#0F2A43]">BreathNote</span>
    <Link href="/dashboard" aria-label="Dashboard" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/70"><LayoutDashboard size={17}/></Link>
    <button aria-label="Logout" onClick={async()=>{await logout();router.push('/login')}} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/70"><LogOut size={17}/></button>
  </nav>;
}

function PageHeader({ status, userName }: { status: string; userName: string }) {
  const connection = status === "connected" ? ["Connected", "Sensor Active"] : status === "connecting" ? ["Connecting", "Waiting for sensor"] : ["Disconnected", "No sensor"];
  return <header className="mb-3 flex min-h-[56px] shrink-0 flex-wrap items-start justify-between gap-x-4 gap-y-2">
    <div className="min-w-0"><h1 className="text-[30px] font-bold leading-9 tracking-[-.7px] text-[#0F2A43] max-sm:text-[24px] max-sm:leading-8">Breathing Session</h1><p className="mt-0.5 text-[13px] text-[#6B7C8F]">Follow the instructions and keep the balls in the target zone.</p></div>
    <div className="flex items-center gap-3 pt-0.5"><div className="flex items-center gap-2 rounded-xl border border-[#edf1f5] bg-white px-3 py-1.5 shadow-sm"><span className={`h-2 w-2 rounded-full ${status === 'connected' ? 'bg-[#2EB84B]' : 'bg-[#9aaaba]'}`}/><span><b className="block text-[11px] font-medium text-[#25384a]">{connection[0]}</b><small className="block text-[10px] leading-3 text-[#7f8d9b]">{connection[1]}</small></span></div><div className="flex items-center gap-2 rounded-xl border border-[#edf1f5] bg-white px-2.5 py-1.5 shadow-sm"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#4c79df] text-[11px] font-semibold text-white">{userName[0]?.toUpperCase()}</span><span className="text-[11px] text-[#26384a]">{userName}</span><ChevronDown size={12} className="text-gray-400"/></div></div>
  </header>;
}

function SpirometerCard({ pressure, tubeRefs, ballRefs, levels }: { pressure:number; tubeRefs:React.MutableRefObject<(HTMLDivElement|null)[]>; ballRefs:React.MutableRefObject<(HTMLDivElement|null)[]>; levels:number[] }) {
  const names = ["Easy", "Medium", "Hard"];
  const colors = BALL_COLORS;
  const fills = ["#9CD3F7", "#B7EAC3", "#FDDC8A"];
  const top = pressure;
  // Guide lines are positioned relative to the tube area, so they stay aligned with the tubes at any size.
  const lines = [["High", "11%"], ["Medium", "46%"], ["Low", "75%"]] as const;
  return <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[24px] bg-gradient-to-br from-[#F2F8FC] to-[#E6F0EA] p-5 shadow-[0_4px_16px_rgba(30,80,140,.08)] max-sm:p-4">
    <div className="flex shrink-0 flex-wrap items-start justify-between gap-2"><div className="min-w-0"><h2 className="text-[17px] font-bold text-[#0F2A43]">Digital 3-Ball Spirometer</h2><p className="mt-0.5 text-[12px] text-[#6B7C8F]">Inhale deeply to raise the balls · Hold in the target zone.</p></div><span className="flex items-center gap-1.5 rounded bg-white/80 px-2 py-1 text-[10px] font-medium text-[#2ea75c]"><span className="h-2.5 w-2.5 rounded-sm bg-[#C5E8CF] ring-1 ring-[#2eb84b]"/>Target Zone</span></div>
    <div className="relative mt-4 min-h-[260px] flex-1">
      {lines.map(([label, top]) => <div key={label} className="absolute inset-x-0" style={{top}}><span className="absolute left-0 -translate-y-1/2 text-[11px] text-[#6B7C8F]">{label}</span><div className="ml-[56px] border-t border-dashed border-[#86a5bc]"/></div>)}
      <div className="absolute inset-y-0 left-[56px] right-0 flex justify-center gap-[clamp(12px,3vw,40px)]">
        {names.map((name,i)=> <div key={name} ref={el=>{tubeRefs.current[i]=el}} className="relative h-full w-[clamp(48px,6vw,86px)] shrink-0 overflow-hidden rounded-[60px] border-2 border-[#BFD6EC] bg-[#EAF2FA]">
          <div className="absolute inset-x-[12px] top-[11%] h-[35%] rounded-sm bg-[#C5E8CF]"/><div className="absolute bottom-[10px] left-1/2 h-0.5 w-[75%] -translate-x-1/2 rounded-full" style={{backgroundColor:fills[i]}}/><div ref={el=>{ballRefs.current[i]=el}} className="absolute bottom-[10px] left-1/2 z-10 aspect-square w-[clamp(36px,4.2vw,60px)] rounded-full shadow-[0_3px_7px_rgba(15,42,67,.14)] transition-[box-shadow]" style={{backgroundColor:colors[i],transform:"translate(-50%, 0px)"}}/>
        </div>)}
      </div>
    </div>
    <div className="mt-4 ml-[56px] grid shrink-0 grid-cols-3 items-center rounded-[16px] bg-white/90 px-2 py-3 text-center shadow-sm">{names.map((name,i)=><div key={name} className="text-[11px] text-[#0F2A43]"><b className="block">{name}</b>{levels[i].toFixed(1)} kPa</div>)}</div>
    <span className="sr-only">Pressure {top.toFixed(2)} kilopascals</span>
  </section>;
}

function BreathingGuideCard({ step, change }: { step:number; change:(n:number)=>void }) {
  const [title, text] = guides[step];
  return <section className="flex h-full min-h-0 flex-col gap-3 overflow-hidden rounded-[20px] bg-white p-5 shadow-[0_4px_16px_rgba(30,80,140,.08)] max-sm:p-4 sm:col-span-3 lg:col-span-1"><div className="flex shrink-0 items-center justify-between"><h2 className="text-[15px] font-bold text-[#0F2A43]">Breathing Guide</h2><span className="tabular-nums text-[11px] text-[#566779]">{step+1} / 3</span></div><div className="flex min-h-0 flex-1 flex-col justify-center"><h3 className="text-[clamp(17px,1.6vw,22px)] font-bold leading-tight tracking-[-.35px] text-[#0F2A43]">{step+1}. {title}</h3><p className="mt-2 max-w-[470px] text-[clamp(12px,1.15vw,16px)] leading-[1.4] text-[#6B7C8F]">{text}</p></div><div className="flex shrink-0 items-center justify-between"><div className="flex gap-1.5">{guides.map((_,i)=><button key={i} aria-label={`Guide step ${i+1}`} onClick={()=>change(i)} className={`h-1.5 rounded-full ${i===step?'w-6 bg-[#1E6FE0]':'w-1.5 bg-[#d4dfeb]'}`}/>)}</div><div className="flex gap-2"><button aria-label="Previous step" disabled={step===0} onClick={()=>change(Math.max(0,step-1))} className="grid h-9 w-9 place-items-center rounded-full bg-[#E8EFF7] text-[#63758a] disabled:opacity-45"><ChevronLeft size={17}/></button><button aria-label="Next step" disabled={step===2} onClick={()=>change(Math.min(2,step+1))} className="grid h-9 w-9 place-items-center rounded-full bg-[#1E6FE0] text-white disabled:opacity-45"><ChevronRight size={17}/></button></div></div></section>;
}

function MetricCard({ title, value, target, percent, tone, icon }: {title:string;value:string;target:string;percent:number;tone:"green"|"blue";icon:"wind"|"clock"}) {
  const showTarget = title !== "Repetitions";
  return <section className="h-full min-h-0 rounded-[20px] bg-white px-4 py-3 shadow-[0_4px_16px_rgba(30,80,140,.08)]"><div className="flex items-center gap-3"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${icon==='wind'?'bg-[#e6f2fc] text-[#4c95cf]':'bg-[#e4f7ee] text-[#29a77c]'}`}>{icon==='wind'?<Wind size={18}/>:<Clock3 size={18}/>}</span><div className="min-w-0"><p className="text-[11px] text-[#6B7C8F]">{title}</p><p className="tabular-nums text-[20px] font-bold leading-6 text-[#0F2A43]">{value}</p></div></div>{showTarget && <><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E3ECF5]"><div className={`h-full rounded-full ${tone==='green'?'bg-[#2EB84B]':'bg-[#1E8BE0]'}`} style={{width:`${Math.min(100,percent)}%`}}/></div><p className="mt-1 text-[10px] text-[#758494]">Target: {target}</p></>}</section>;
}

function SessionControlBar({ state, elapsed, toggle, start, restart, end, canRetry, saving, soundOn, audioReady, toggleSound }: {state:State;elapsed:number;toggle:()=>void;start:()=>void;restart:()=>void;end:()=>void;canRetry:boolean;saving:boolean;soundOn:boolean;audioReady:boolean;toggleSound:()=>void}) {
  const soundLabel = !audioReady ? 'Enable Sound' : soundOn ? 'Mute Sound' : 'Unmute Sound';
  const idle = state === 'idle';
  return <section className="flex min-h-[76px] shrink-0 flex-wrap items-center gap-3 rounded-[20px] bg-white px-5 py-3 shadow-[0_4px_16px_rgba(30,80,140,.08)] max-sm:gap-2 max-sm:px-3"><button onClick={toggle} disabled={idle||state==='ended'} className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-[#E8EFF7] px-4 text-[12px] font-medium text-[#0F2A43] disabled:opacity-50 max-sm:px-3">{state==='running'?<Pause size={14}/>:<Play size={14}/>} {state==='paused'?'Resume':'Pause'}</button>{idle
    ? <button onClick={start} className="flex h-[46px] min-w-[160px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#2EB84B] px-5 text-[13px] font-semibold text-white shadow-[0_5px_12px_rgba(46,184,75,.28)] max-sm:order-first max-sm:min-w-0 max-sm:basis-full max-sm:px-3"><Play size={15}/>Start Session</button>
    : <button onClick={end} disabled={state==='ended'&&!canRetry||saving} className="flex h-[46px] min-w-[160px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#E53935] px-5 text-[13px] font-semibold text-white shadow-[0_5px_12px_rgba(229,57,53,.28)] disabled:opacity-50 max-sm:order-first max-sm:min-w-0 max-sm:basis-full max-sm:px-3"><StopCircle size={15}/>{saving?'Saving…':canRetry?'Retry Save':state==='ended'?'Session Saved':'End Session'}</button>}<button onClick={restart} disabled={idle} className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-[#E8EFF7] px-4 text-[12px] font-medium text-[#0F2A43] disabled:opacity-50 max-sm:px-3"><RefreshCw size={14}/><span className="max-sm:hidden">Restart</span></button><button data-sound-toggle onClick={toggleSound} aria-label={soundLabel} className={`flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[12px] font-medium max-sm:px-3 ${audioReady && soundOn ? 'bg-[#DCEBFA] text-[#1E6FE0]' : 'bg-[#E8EFF7] text-[#0F2A43]'}`}>{audioReady && soundOn?<Volume2 size={14}/>:<VolumeX size={14}/>}<span className="max-sm:hidden">{soundLabel}</span></button><div className="mx-1 h-10 border-l border-[#e5ebf1] max-md:hidden"/><div className="ml-auto flex min-w-[145px] shrink-0 items-center gap-3 rounded-lg border border-[#edf1f5] px-4 py-2 text-[#0F2A43] max-sm:min-w-0 max-sm:px-2"><Clock3 size={18}/><div><p className="text-[10px] text-[#6B7C8F]">Session Time</p><p className="tabular-nums text-[12px] font-bold">{formatTime(elapsed)}</p></div></div></section>;
}

function formatTime(seconds:number) { const n=Math.max(0,Math.floor(seconds));return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`; }

type RepetitionProgress = CompletedRepetition & { currentLevel: number; currentHoldMs: number; maxHoldMs: number };

export default function ExerciseClient({ userName, config }: { userName: string; config?: ExerciseConfig }) {
  const c = config || { easy: 1, medium: 2, hard: 3, target_peak: 3, target_exhale_hold: 8, target_inhale_hold: 5 };
  const levels = useMemo(() => [c.easy, c.medium, c.hard] as number[], [c.easy, c.medium, c.hard]);
  const router = useRouter();
  const { pressure, pressureRef: sensorPressureRef, status: realSensorStatus, connect, disconnect } = usePressureSensor();
  // TEMP: sound test overrides (see SOUND_TEST).
  const sensorStatus = SOUND_TEST ? "connected" : realSensorStatus;
  const [testPressure, setTestPressure] = useState(0);
  const testPressureRef = useRef(0);
  const [step, setStep] = useState(0);
  // The session waits for "Start Session"; the sensor still connects meanwhile so its status shows.
  const [state, setState] = useState<State>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [peak, setPeak] = useState(0);
  const [maxHold, setMaxHold] = useState(0);
  const [displayPressure, setDisplayPressure] = useState(0);
  const [repetitionCount, setRepetitionCount] = useState(0);
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const elapsedRef = useRef(0);
  const peakRef = useRef(0);
  const maxHoldRef = useRef(0);
  const pressureRef = useRef(0);
  const startedAtRef = useRef(new Date());
  const repetitionsRef = useRef<CompletedRepetition[]>([]);
  const currentRepRef = useRef<RepetitionProgress | null>(null);
  const savingRef = useRef(false);
  const tubeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const ballRefs = useRef<(HTMLDivElement | null)[]>([]);
  const ballRatiosRef = useRef([0, 0, 0]);
  const sa = c.sa_frequency ?? DEFAULT_SA_HZ;
  const gliderRef = useRef<SwaraGlider | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [audioReady, setAudioReady] = useState(false);
  const [swara, setSwara] = useState<SwaraPoint | null>(null);

  // Browsers block audio until the user interacts, so unlock it on the first tap or key press.
  useEffect(() => {
    const glider = new SwaraGlider(sa);
    gliderRef.current = glider;
    const unlock = (event: Event) => {
      // The sound button unlocks by itself, so its first click doesn't also count as "mute".
      if ((event.target as Element | null)?.closest?.("[data-sound-toggle]")) return;
      void glider.unlock().then((ready) => { if (ready) { setAudioReady(true); remove(); } });
    };
    const remove = () => { window.removeEventListener("pointerdown", unlock); window.removeEventListener("keydown", unlock); };
    // Animation frames stop in background tabs, so silence explicitly instead of droning on.
    const onVisibility = () => { if (document.hidden) glider.silence(); };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    document.addEventListener("visibilitychange", onVisibility);
    return () => { remove(); document.removeEventListener("visibilitychange", onVisibility); glider.dispose(); gliderRef.current = null; setAudioReady(false); };
  }, [sa]);

  const toggleSound = async () => {
    const glider = gliderRef.current;
    if (!glider) return;
    if (!audioReady) {
      if (await glider.unlock()) { glider.setMuted(false); setSoundOn(true); setAudioReady(true); }
      return;
    }
    glider.setMuted(soundOn);
    setSoundOn(!soundOn);
  };

  useEffect(() => { pressureRef.current = state === "running" ? pressure : 0; }, [state, pressure]);

  const finish = useCallback(async () => {
    if (savingRef.current || (state === "ended" && !saveError)) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError("");
    setState("ended");
    disconnect();

    const current = currentRepRef.current;
    if (current) {
      repetitionsRef.current.push({
        maxPressure: Number(current.maxPressure.toFixed(2)),
        levelReached: current.levelReached,
        holdDuration: Math.round(current.maxHoldMs),
        timestamp: current.timestamp,
      });
      currentRepRef.current = null;
    }

    try {
      const result = await saveExerciseSession({
        startTime: startedAtRef.current.toISOString(),
        endTime: new Date().toISOString(),
        durationSeconds: Math.round(elapsedRef.current),
        repetitions: repetitionsRef.current,
      });
      if (result.error) { setSaveError(result.error); return; }
      router.push("/dashboard");
    } catch {
      setSaveError("Could not save the session. Check your connection and try again.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [disconnect, router, state, saveError]);

  const toggle = () => setState((current) => current === "running" ? "paused" : current === "paused" ? "running" : "ended");
  const start = () => {
    resetSession();
    setState("running");
  };
  const restart = () => {
    resetSession();
    setState("running");
    void connect();
  };
  const resetSession = () => {
    elapsedRef.current = 0;
    peakRef.current = 0;
    maxHoldRef.current = 0;
    repetitionsRef.current = [];
    currentRepRef.current = null;
    ballRatiosRef.current = [0, 0, 0];
    ballRefs.current.forEach((ball) => {
      if (!ball) return;
      ball.style.transform = "translate(-50%, 0px)";
    });
    setSwara(null);
    startedAtRef.current = new Date();
    if (sensorPressureRef) sensorPressureRef.current = 0;
    pressureRef.current = 0;
    setElapsed(0);
    setPeak(0);
    setMaxHold(0);
    setRepetitionCount(0);
    setDisplayPressure(0);
    setSaveError("");
  };

  useEffect(() => {
    if (state !== "running" || sensorStatus !== "connected") return;
    let frame = 0;
    let previous = performance.now();
    let lastUi = 0;
    const tick = (now: number) => {
      const dt = Math.min((now - previous) / 1000, 0.1);
      previous = now;
      elapsedRef.current += dt;
      const raw = SOUND_TEST ? testPressureRef.current : sensorPressureRef ? sensorPressureRef.current : pressureRef.current;
      const p = Math.abs(raw);
      if (p >= 0.5) {
        const level = levels.filter((threshold) => p >= threshold).length;
        let rep = currentRepRef.current;
        if (!rep) {
          rep = { maxPressure: p, levelReached: level, holdDuration: 0, timestamp: new Date().toISOString(), currentLevel: level, currentHoldMs: 0, maxHoldMs: 0 };
          currentRepRef.current = rep;
        }
        rep.maxPressure = Math.max(rep.maxPressure, p);
        rep.levelReached = Math.max(rep.levelReached, level);
        if (rep.currentLevel === level) rep.currentHoldMs += dt * 1000;
        else { rep.currentLevel = level; rep.currentHoldMs = 0; }
        rep.maxHoldMs = Math.max(rep.maxHoldMs, rep.currentHoldMs);
        maxHoldRef.current = Math.max(maxHoldRef.current, rep.maxHoldMs);
        peakRef.current = Math.max(peakRef.current, p);
      } else if (currentRepRef.current) {
        const rep = currentRepRef.current;
        repetitionsRef.current.push({ maxPressure: Number(rep.maxPressure.toFixed(2)), levelReached: rep.levelReached, holdDuration: Math.round(rep.maxHoldMs), timestamp: rep.timestamp });
        currentRepRef.current = null;
      }

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const speed = reducedMotion ? 1 : 0.2;
      // Each ball glides toward its target height; the three heights stack into one
      // 0–3 position that drives the sound (see lib/audio/swaraGlider.ts).
      let position = 0;
      levels.forEach((threshold, index) => {
        const floor = index === 0 ? 0 : levels[index - 1];
        const target = Math.max(0, Math.min(1, (p - floor) / (threshold - floor)));
        ballRatiosRef.current[index] += (target - ballRatiosRef.current[index]) * speed;
        const ratio = ballRatiosRef.current[index];
        position += ratio;
        const ball = ballRefs.current[index];
        if (!ball) return;
        const height = ball.parentElement?.getBoundingClientRect().height || 368;
        const radius = (ball.offsetHeight || 60) / 2;
        const center = radius + 10 + (height - radius * 2 - 20) * (1 - ratio);
        // Move up from the resting spot (bottom: 10px) with a transform only. Setting `top`
        // as well would pin both edges and stretch the ball into a pill in some browsers.
        const restingCenter = height - radius - 10;
        ball.style.transform = `translate(-50%, ${center - restingCenter}px)`;
      });

      // Sound follows the balls' position; silent while they rest at the bottom.
      const lifted = position > 0.02;
      const point = swaraAt(position, sa);
      gliderRef.current?.update(position, lifted && !document.hidden);

      if (now - lastUi > 100) {
        setSwara(lifted ? point : null);
        lastUi = now;
        setElapsed(elapsedRef.current);
        setDisplayPressure(p);
        setPeak(peakRef.current);
        setMaxHold(maxHoldRef.current / 1000);
        setRepetitionCount(repetitionsRef.current.length + (currentRepRef.current ? 1 : 0));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      gliderRef.current?.silence();
      setSwara(null);
    };
  }, [state, levels, sensorStatus, sa]);

  useEffect(() => () => disconnect(), [disconnect]);

  return <div className="flex min-h-dvh bg-[#F4F8FC] font-sans text-[#0F2A43] fit:h-dvh fit:overflow-hidden"><Sidebar/><main className="flex min-w-0 flex-1 flex-col px-[25px] py-3 max-md:px-4 fit:h-dvh"><MobileNav/><PageHeader status={sensorStatus} userName={userName}/>
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] fit:min-h-0 fit:flex-1"><SpirometerCard pressure={displayPressure} tubeRefs={tubeRefs} ballRefs={ballRefs} levels={levels}/><div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 fit:min-h-0 fit:grid-rows-[1.65fr_1fr_1fr_0.8fr]"><BreathingGuideCard step={step} change={setStep}/><MetricCard title="Peak Pressure" value={`${peak.toFixed(2)} kPa`} target={`${c.target_peak.toFixed(1)} kPa`} percent={peak/c.target_peak*100} tone="green" icon="wind"/><MetricCard title="Longest Hold" value={`${maxHold.toFixed(1)} s`} target={`${c.target_exhale_hold.toFixed(1)} s`} percent={maxHold/c.target_exhale_hold*100} tone="blue" icon="clock"/><MetricCard title="Repetitions" value={String(repetitionCount)} target="Session total" percent={0} tone="green" icon="clock"/></div></div>
    {saveError && <p role="alert" className="fixed bottom-24 left-1/2 z-50 max-w-[min(90vw,32rem)] -translate-x-1/2 rounded-lg bg-red-50 p-3 text-sm text-red-700 shadow-md">{saveError}</p>}
    {SOUND_TEST && <SoundTestSlider value={testPressure} max={levels[2] + 0.5} levels={levels} swara={swara} onChange={(v)=>{testPressureRef.current=v;setTestPressure(v);}}/>}
    <div className="mt-3 shrink-0"><SessionControlBar state={state} elapsed={elapsed} toggle={toggle} start={start} restart={restart} end={finish} canRetry={!!saveError} saving={saving} soundOn={soundOn} audioReady={audioReady} toggleSound={toggleSound}/></div>
  </main></div>;
}
