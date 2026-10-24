"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, LayoutDashboard, LogOut, Pause, Play, RefreshCw, StopCircle, Wind } from "lucide-react";
import { logout } from "../actions/auth";
import { usePressureSensor } from "@/lib/sensor/usePressureSensor";
import { saveExerciseSession, type CompletedRepetition } from "../actions/sessions";

const guides = [
  ["Take a deep breath", "Sit upright and take a slow, comfortable breath before using the mouthpiece."],
  ["Seal and breathe steadily", "Keep your lips sealed around the mouthpiece and follow the breathing target shown on screen."],
  ["Hold and release", "Keep the balls in the green zone as long as you can, then relax and breathe out."],
] as const;
type State = "running" | "paused" | "ended";
type ExerciseConfig = {
  easy: number;
  medium: number;
  hard: number;
  target_peak: number;
  target_exhale_hold: number;
  target_inhale_hold: number;
};

function Sidebar() {
  const router = useRouter();
  return <aside className="flex w-[275px] shrink-0 flex-col bg-[#EEF5FB] px-4 py-5 text-[#0F2A43] max-lg:w-[210px] max-md:hidden">
    <div className="mb-7 px-1 text-[19px] font-bold tracking-tight">BreathNote</div>
    <nav className="flex flex-1 flex-col gap-1 text-[13px]">
      <Link href="/dashboard" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-[#43586c] hover:bg-white/70"><LayoutDashboard size={16}/>Dashboard</Link>
      <Link href="/exercise" className="flex items-center gap-2 rounded-lg bg-[#DCEBFA] px-3 py-2.5 font-medium text-[#1E6FE0]"><Wind size={16}/>Breathing Session</Link>
    </nav>
    <div className="flex flex-col gap-1 text-[13px] text-[#526579]"><button className="flex items-center gap-2 rounded-lg px-2 py-2"><CircleHelp size={16}/>Help &amp; Support</button><button onClick={async()=>{await logout();router.push('/login')}} className="flex items-center gap-2 rounded-lg px-2 py-2"><LogOut size={16}/>Logout</button></div>
  </aside>;
}

function PageHeader({ status, userName }: { status: string; userName: string }) {
  const connection = status === "connected" ? ["Connected", "Sensor Active"] : status === "connecting" ? ["Connecting", "Waiting for sensor"] : ["Disconnected", "No sensor"];
  return <header className="mb-[56px] flex min-h-[64px] items-start justify-between gap-4">
    <div><h1 className="text-[30px] font-bold leading-9 tracking-[-.7px] text-[#0F2A43]">Breathing Session</h1><p className="mt-0.5 text-[13px] text-[#6B7C8F]">Follow the instructions and keep the balls in the target zone.</p></div>
    <div className="flex items-center gap-3 pt-0.5"><div className="flex items-center gap-2 rounded-xl border border-[#edf1f5] bg-white px-3 py-1.5 shadow-sm"><span className={`h-2 w-2 rounded-full ${status === 'connected' ? 'bg-[#2EB84B]' : 'bg-[#9aaaba]'}`}/><span><b className="block text-[11px] font-medium text-[#25384a]">{connection[0]}</b><small className="block text-[10px] leading-3 text-[#7f8d9b]">{connection[1]}</small></span></div><div className="flex items-center gap-2 rounded-xl border border-[#edf1f5] bg-white px-2.5 py-1.5 shadow-sm"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#4c79df] text-[11px] font-semibold text-white">{userName[0]?.toUpperCase()}</span><span className="text-[11px] text-[#26384a]">{userName}</span><ChevronDown size={12} className="text-gray-400"/></div></div>
  </header>;
}

function SpirometerCard({ pressure, tubeRefs, ballRefs, levels }: { pressure:number; tubeRefs:React.MutableRefObject<(HTMLDivElement|null)[]>; ballRefs:React.MutableRefObject<(HTMLDivElement|null)[]>; levels:number[] }) {
  const names = ["Easy", "Medium", "Hard"];
  const colors = ["#1E73E8", "#2EB84B", "#F59E0B"];
  const fills = ["#9CD3F7", "#B7EAC3", "#FDDC8A"];
  const top = pressure;
  return <section className="relative h-[593px] overflow-hidden rounded-[24px] bg-gradient-to-br from-[#F2F8FC] to-[#E6F0EA] p-6 shadow-[0_4px_16px_rgba(30,80,140,.08)] max-lg:h-auto max-lg:min-h-[590px]">
    <h2 className="text-[17px] font-bold text-[#0F2A43]">Digital 3-Ball Spirometer</h2><p className="mt-0.5 text-[12px] text-[#6B7C8F]">Exhale to raise balls · Inhale to pull them down. Hold in the green zone.</p>
    <div className="absolute left-[10px] top-[148px] flex h-[310px] flex-col justify-between text-[11px] text-[#6B7C8F]"><span>High</span><span>Medium</span><span>Low</span></div>
    <div className="absolute left-[70px] right-7 top-[165px] border-t border-dashed border-[#86a5bc]"/><div className="absolute left-[70px] right-7 top-[256px] border-t border-dashed border-[#86a5bc]"/><div className="absolute left-[70px] right-7 top-[347px] border-t border-dashed border-[#86a5bc]"/>
    <div className="absolute left-[72px] top-[155px] rounded bg-[#2ea75c] px-2 py-1 text-[10px] font-medium text-white">Target Zone</div><div className="absolute left-[131px] top-[165px] h-[90px] border-l border-dotted border-[#2eb84b]"/><div className="absolute left-[131px] top-[165px] w-3 border-t border-[#2eb84b]"/><div className="absolute left-[131px] top-[255px] w-3 border-b border-[#2eb84b]"/>
    <div className="absolute inset-x-[60px] top-[105px] flex h-[368px] justify-center gap-[40px] max-sm:gap-4 max-sm:inset-x-4">
      {names.map((name,i)=> <div key={name} ref={el=>{tubeRefs.current[i]=el}} className="relative h-[368px] w-[86px] shrink-0 overflow-hidden rounded-[60px] border-2 border-[#BFD6EC] bg-[#EAF2FA]">
        <div className="absolute inset-x-[12px] top-[40px] h-[128px] rounded-sm bg-[#C5E8CF]"/><div className="absolute bottom-[10px] left-1/2 h-0.5 w-[60px] -translate-x-1/2 rounded-full" style={{backgroundColor:fills[i]}}/><div ref={el=>{ballRefs.current[i]=el}} className="absolute left-1/2 top-0 z-10 aspect-square w-[60px] rounded-full shadow-[0_3px_7px_rgba(15,42,67,.14)] transition-[box-shadow]" style={{backgroundColor:colors[i],transform:"translate(-50%, 298px)"}}/>
      </div>)}
    </div>
    <div className="absolute inset-x-[56px] bottom-[22px] grid h-[78px] grid-cols-3 items-center rounded-[16px] bg-white/90 px-2 text-center shadow-sm"><div className="text-[11px] text-[#0F2A43]"><b className="block">Easy</b>{levels[0].toFixed(1)} kPa</div><div className="text-[11px] text-[#0F2A43]"><b className="block">Medium</b>{levels[1].toFixed(1)} kPa</div><div className="text-[11px] text-[#0F2A43]"><b className="block">Hard</b>{levels[2].toFixed(1)} kPa</div></div>
    <span className="sr-only">Pressure {top.toFixed(2)} kilopascals</span>
  </section>;
}

function BreathingGuideCard({ step, change }: { step:number; change:(n:number)=>void }) {
  const [title, text] = guides[step];
  return <section className="flex h-[243px] flex-col rounded-[20px] bg-white p-6 shadow-[0_4px_16px_rgba(30,80,140,.08)]"><div className="flex items-center justify-between"><h2 className="text-[15px] font-bold text-[#0F2A43]">Breathing Guide</h2><span className="tabular-nums text-[11px] text-[#566779]">{step+1} / 3</span></div><div className="flex flex-1 flex-col justify-center"><h3 className="text-[22px] font-bold leading-tight tracking-[-.35px] text-[#0F2A43]">{step+1}. {title}</h3><p className="mt-3 max-w-[470px] text-[16px] leading-[1.5] text-[#6B7C8F]">{text}</p></div><div className="flex items-center justify-between"><div className="flex gap-1.5">{guides.map((_,i)=><button key={i} aria-label={`Guide step ${i+1}`} onClick={()=>change(i)} className={`h-1.5 rounded-full ${i===step?'w-6 bg-[#1E6FE0]':'w-1.5 bg-[#d4dfeb]'}`}/>)}</div><div className="flex gap-2"><button aria-label="Previous step" disabled={step===0} onClick={()=>change(Math.max(0,step-1))} className="grid h-9 w-9 place-items-center rounded-full bg-[#E8EFF7] text-[#63758a] disabled:opacity-45"><ChevronLeft size={17}/></button><button aria-label="Next step" disabled={step===2} onClick={()=>change(Math.min(2,step+1))} className="grid h-9 w-9 place-items-center rounded-full bg-[#1E6FE0] text-white disabled:opacity-45"><ChevronRight size={17}/></button></div></div></section>;
}

function MetricCard({ title, value, target, percent, tone, icon }: {title:string;value:string;target:string;percent:number;tone:"green"|"blue";icon:"wind"|"clock"}) {
  const showTarget = title !== "Repetitions";
  return <section className="h-[146px] rounded-[20px] bg-white px-5 py-4 shadow-[0_4px_16px_rgba(30,80,140,.08)]"><div className="flex items-center gap-3"><span className={`grid h-9 w-9 place-items-center rounded-full ${icon==='wind'?'bg-[#e6f2fc] text-[#4c95cf]':'bg-[#e4f7ee] text-[#29a77c]'}`}>{icon==='wind'?<Wind size={18}/>:<Clock3 size={18}/>}</span><div><p className="text-[11px] text-[#6B7C8F]">{title}</p><p className="tabular-nums text-[20px] font-bold leading-6 text-[#0F2A43]">{value}</p></div></div>{showTarget && <><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E3ECF5]"><div className={`h-full rounded-full ${tone==='green'?'bg-[#2EB84B]':'bg-[#1E8BE0]'}`} style={{width:`${Math.min(100,percent)}%`}}/></div><p className="mt-1 text-[10px] text-[#758494]">Target: {target}</p></>}</section>;
}

function SessionControlBar({ state, elapsed, toggle, restart, end, canRetry, saving }: {state:State;elapsed:number;toggle:()=>void;restart:()=>void;end:()=>void;canRetry:boolean;saving:boolean}) {
  return <section className="flex min-h-[104px] items-center gap-4 rounded-[20px] bg-white px-6 py-4 shadow-[0_4px_16px_rgba(30,80,140,.08)] max-md:flex-wrap"><button onClick={toggle} disabled={state==='ended'} className="flex h-10 items-center gap-2 rounded-full bg-[#E8EFF7] px-5 text-[12px] font-medium text-[#0F2A43] disabled:opacity-50">{state==='running'?<Pause size={14}/>:<Play size={14}/>} {state==='paused'?'Resume':'Pause'}</button><button onClick={end} disabled={state==='ended'&&!canRetry||saving} className="flex h-[48px] min-w-[205px] items-center justify-center gap-2 rounded-full bg-[#E53935] px-6 text-[13px] font-semibold text-white shadow-[0_5px_12px_rgba(229,57,53,.28)] disabled:opacity-50"><StopCircle size={15}/>{saving?'Saving…':canRetry?'Retry Save':state==='ended'?'Session Saved':'End Session'}</button><button onClick={restart} className="flex h-10 items-center gap-2 rounded-full bg-[#E8EFF7] px-5 text-[12px] font-medium text-[#0F2A43]"><RefreshCw size={14}/>Restart</button><div className="mx-1 h-10 border-l border-[#e5ebf1] max-md:hidden"/><div className="ml-auto flex min-w-[220px] items-center gap-3 rounded-lg border border-[#edf1f5] px-4 py-2 text-[#0F2A43]"><Clock3 size={18}/><div><p className="text-[10px] text-[#6B7C8F]">Session Time</p><p className="tabular-nums text-[12px] font-bold">{formatTime(elapsed)}</p></div></div></section>;
}

function formatTime(seconds:number) { const n=Math.max(0,Math.floor(seconds));return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`; }

type RepetitionProgress = CompletedRepetition & { currentLevel: number; currentHoldMs: number; maxHoldMs: number };

export default function ExerciseClient({ userName, config }: { userName: string; config?: ExerciseConfig }) {
  const c = config || { easy: 1, medium: 2, hard: 3, target_peak: 3, target_exhale_hold: 8, target_inhale_hold: 5 };
  const levels = useMemo(() => [c.easy, c.medium, c.hard] as number[], [c.easy, c.medium, c.hard]);
  const router = useRouter();
  const { pressure, status: sensorStatus, connect, disconnect } = usePressureSensor();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<State>("running");
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
  const restart = () => {
    elapsedRef.current = 0;
    peakRef.current = 0;
    maxHoldRef.current = 0;
    repetitionsRef.current = [];
    currentRepRef.current = null;
    startedAtRef.current = new Date();
    setElapsed(0);
    setPeak(0);
    setMaxHold(0);
    setRepetitionCount(0);
    setDisplayPressure(0);
    setSaveError("");
    setState("running");
    void connect();
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
      const p = Math.max(0, pressureRef.current);
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
      levels.forEach((threshold, index) => {
        const floor = index === 0 ? 0 : levels[index - 1];
        const ratio = Math.max(0, Math.min(1, (p - floor) / (threshold - floor)));
        const ball = ballRefs.current[index];
        if (!ball) return;
        const height = ball.parentElement?.getBoundingClientRect().height || 368;
        const radius = ball.offsetHeight / 2;
        const center = radius + 10 + (height - radius * 2 - 20) * (1 - ratio);
        const currentY = Number(ball.dataset.y || center);
        const nextY = currentY + (center - currentY) * speed;
        ball.dataset.y = String(nextY);
        ball.style.transform = `translate(-50%, ${nextY - radius}px)`;
      });

      if (now - lastUi > 100) {
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
    return () => cancelAnimationFrame(frame);
  }, [state, levels, sensorStatus]);

  useEffect(() => () => disconnect(), [disconnect]);

  return <div className="flex min-h-screen bg-[#F4F8FC] font-sans text-[#0F2A43]"><Sidebar/><main className="min-w-0 flex-1 px-[25px] pb-8 pt-[10px] max-md:px-4"><PageHeader status={sensorStatus} userName={userName}/>
    <div className="grid grid-cols-[minmax(0,610px)_minmax(0,547px)] justify-between gap-5 max-xl:grid-cols-1"><SpirometerCard pressure={displayPressure} tubeRefs={tubeRefs} ballRefs={ballRefs} levels={levels}/><div className="flex flex-col gap-4"><BreathingGuideCard step={step} change={setStep}/><MetricCard title="Peak Pressure" value={`${peak.toFixed(2)} kPa`} target={`${c.target_peak.toFixed(1)} kPa`} percent={peak/c.target_peak*100} tone="green" icon="wind"/><MetricCard title="Longest Hold" value={`${maxHold.toFixed(1)} s`} target={`${c.target_exhale_hold.toFixed(1)} s`} percent={maxHold/c.target_exhale_hold*100} tone="blue" icon="clock"/><MetricCard title="Repetitions" value={String(repetitionCount)} target="Session total" percent={0} tone="green" icon="clock"/></div></div>
    {saveError && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{saveError}</p>}
    <div className="mt-9"><SessionControlBar state={state} elapsed={elapsed} toggle={toggle} restart={restart} end={finish} canRetry={!!saveError} saving={saving}/></div>
  </main></div>;
}
