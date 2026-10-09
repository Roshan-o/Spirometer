"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, LayoutDashboard, LogOut, Pause, Play, RefreshCw, StopCircle, Wind } from "lucide-react";
import { logout } from "../actions/auth";
import { usePressureSensor } from "@/lib/sensor/usePressureSensor";
import type { SensorKind } from "@/lib/sensor/sources";

const guides = [
  ["Take a deep breath", "Inhale slowly through your nose, then place the harmonica at your mouth and blow steadily."],
  ["Seal and blow steadily", "Close your lips around the harmonica and blow at a steady, controlled pace."],
  ["Hold and release", "Keep the balls in the green zone as long as you can, then relax and breathe out."],
] as const;
type State = "running" | "paused" | "ended";

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

function PageHeader({ status, source }: { status: string; source: string }) {
  const connection = status !== "connected" ? ["Disconnected", "No sensor"] : source === "sensor" ? ["Connected", "Sensor Active"] : ["Connected", "Simulated"];
  return <header className="mb-[56px] flex min-h-[64px] items-start justify-between gap-4">
    <div><h1 className="text-[30px] font-bold leading-9 tracking-[-.7px] text-[#0F2A43]">Breathing Session</h1><p className="mt-0.5 text-[13px] text-[#6B7C8F]">Follow the instructions and keep the balls in the target zone.</p></div>
    <div className="flex items-center gap-3 pt-0.5"><div className="flex items-center gap-2 rounded-xl border border-[#edf1f5] bg-white px-3 py-1.5 shadow-sm"><span className={`h-2 w-2 rounded-full ${status === 'connected' ? 'bg-[#2EB84B]' : 'bg-[#9aaaba]'}`}/><span><b className="block text-[11px] font-medium text-[#25384a]">{connection[0]}</b><small className="block text-[10px] leading-3 text-[#7f8d9b]">{connection[1]}</small></span></div><div className="flex items-center gap-2 rounded-xl border border-[#edf1f5] bg-white px-2.5 py-1.5 shadow-sm"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#4c79df] text-[11px] font-semibold text-white">D</span><span className="text-[11px] text-[#26384a]">Deepak</span><ChevronDown size={12} className="text-gray-400"/></div></div>
  </header>;
}

function SpirometerCard({ pressure, demo, tubeRefs, ballRefs, pointer, levels }: { pressure:number; demo:boolean; tubeRefs:React.MutableRefObject<(HTMLDivElement|null)[]>; ballRefs:React.MutableRefObject<(HTMLDivElement|null)[]>; pointer:(down:boolean)=>void; levels:number[] }) {
  const names = ["Easy", "Medium", "Hard"];
  const colors = ["#1E73E8", "#2EB84B", "#F59E0B"];
  const fills = ["#9CD3F7", "#B7EAC3", "#FDDC8A"];
  const top = demo ? 1.42 : pressure;
  return <section className="relative h-[593px] overflow-hidden rounded-[24px] bg-gradient-to-br from-[#F2F8FC] to-[#E6F0EA] p-6 shadow-[0_4px_16px_rgba(30,80,140,.08)] max-lg:h-auto max-lg:min-h-[590px]">
    <h2 className="text-[17px] font-bold text-[#0F2A43]">Digital 3-Ball Spirometer</h2><p className="mt-0.5 text-[12px] text-[#6B7C8F]">Exhale to raise balls · Inhale to pull them down. Hold in the green zone.</p>
    <div className="absolute left-[10px] top-[148px] flex h-[310px] flex-col justify-between text-[11px] text-[#6B7C8F]"><span>High</span><span>Medium</span><span>Low</span></div>
    <div className="absolute left-[70px] right-7 top-[165px] border-t border-dashed border-[#86a5bc]"/><div className="absolute left-[70px] right-7 top-[256px] border-t border-dashed border-[#86a5bc]"/><div className="absolute left-[70px] right-7 top-[347px] border-t border-dashed border-[#86a5bc]"/>
    <div className="absolute left-[72px] top-[155px] rounded bg-[#2ea75c] px-2 py-1 text-[10px] font-medium text-white">Target Zone</div><div className="absolute left-[131px] top-[165px] h-[90px] border-l border-dotted border-[#2eb84b]"/><div className="absolute left-[131px] top-[165px] w-3 border-t border-[#2eb84b]"/><div className="absolute left-[131px] top-[255px] w-3 border-b border-[#2eb84b]"/>
    <div className="absolute inset-x-[60px] top-[105px] flex h-[368px] justify-center gap-[40px] max-sm:gap-4 max-sm:inset-x-4">
      {names.map((name,i)=> <div key={name} ref={el=>{tubeRefs.current[i]=el}} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);pointer(true)}} onPointerUp={()=>pointer(false)} onPointerCancel={()=>pointer(false)} onPointerLeave={()=>pointer(false)} className="relative h-[368px] w-[86px] shrink-0 touch-none overflow-hidden rounded-[60px] border-2 border-[#BFD6EC] bg-[#EAF2FA]">
        <div className="absolute inset-x-[12px] top-[40px] h-[128px] rounded-sm bg-[#C5E8CF]"/><div className="absolute bottom-[10px] left-1/2 h-0.5 w-[60px] -translate-x-1/2 rounded-full" style={{backgroundColor:fills[i]}}/><div ref={el=>{ballRefs.current[i]=el}} className="absolute left-1/2 top-0 z-10 aspect-square w-[60px] rounded-full shadow-[0_3px_7px_rgba(15,42,67,.14)] transition-[box-shadow]" style={{backgroundColor:colors[i],transform:"translate(-50%, 0px)"}}/>    
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
  return <section className="h-[146px] rounded-[20px] bg-white px-5 py-4 shadow-[0_4px_16px_rgba(30,80,140,.08)]"><div className="flex items-center gap-3"><span className={`grid h-9 w-9 place-items-center rounded-full ${icon==='wind'?'bg-[#e6f2fc] text-[#4c95cf]':'bg-[#e4f7ee] text-[#29a77c]'}`}>{icon==='wind'?<Wind size={18}/>:<Clock3 size={18}/>}</span><div><p className="text-[11px] text-[#6B7C8F]">{title}</p><p className="tabular-nums text-[20px] font-bold leading-6 text-[#0F2A43]">{value}</p></div></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E3ECF5]"><div className={`h-full rounded-full ${tone==='green'?'bg-[#2EB84B]':'bg-[#1E8BE0]'}`} style={{width:`${Math.min(100,percent)}%`}}/></div><p className="mt-1 text-[10px] text-[#758494]">Target: {target}</p></section>;
}

function SessionControlBar({ state, elapsed, toggle, restart, end }: {state:State;elapsed:number;toggle:()=>void;restart:()=>void;end:()=>void}) {
  return <section className="flex min-h-[104px] items-center gap-4 rounded-[20px] bg-white px-6 py-4 shadow-[0_4px_16px_rgba(30,80,140,.08)] max-md:flex-wrap"><button onClick={toggle} disabled={state==='ended'} className="flex h-10 items-center gap-2 rounded-full bg-[#E8EFF7] px-5 text-[12px] font-medium text-[#0F2A43] disabled:opacity-50">{state==='running'?<Pause size={14}/>:<Play size={14}/>} {state==='paused'?'Resume':'Pause'}</button><button onClick={end} disabled={state==='ended'} className="flex h-[48px] min-w-[205px] items-center justify-center gap-2 rounded-full bg-[#E53935] px-6 text-[13px] font-semibold text-white shadow-[0_5px_12px_rgba(229,57,53,.28)] disabled:opacity-50"><StopCircle size={15}/>End Session</button><button onClick={restart} className="flex h-10 items-center gap-2 rounded-full bg-[#E8EFF7] px-5 text-[12px] font-medium text-[#0F2A43]"><RefreshCw size={14}/>Restart</button><div className="mx-1 h-10 border-l border-[#e5ebf1] max-md:hidden"/><div className="ml-auto flex min-w-[220px] items-center gap-3 rounded-lg border border-[#edf1f5] px-4 py-2 text-[#0F2A43]"><Clock3 size={18}/><div><p className="text-[10px] text-[#6B7C8F]">Session Time</p><p className="tabular-nums text-[12px] font-bold">{formatTime(elapsed)} / 02:00</p></div></div></section>;
}

function formatTime(seconds:number) { const n=Math.max(0,Math.floor(seconds));return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`; }

export default function ExerciseClient({demo,dev,config}:{demo:boolean;dev:boolean;config?:any}) {
  const c = config || {easy:1.0, medium:2.0, hard:3.0, target_peak:3.0, target_exhale_hold:8.0, target_inhale_hold:5.0};
  const levels = [c.easy, c.medium, c.hard];
  const router=useRouter();
  const { pressure:sensorPressure, status:sensorStatus, source:sensorSource, connect, disconnect, setBlowing }=usePressureSensor("sensor",!demo);
  const [step,setStep]=useState(0),[state,setState]=useState<State>(demo?'paused':'running'),[elapsed,setElapsed]=useState(demo?12:0),[peak,setPeak]=useState(demo?1.42:0),[sustain,setSustain]=useState(demo?6.8:0),[inhaleHold,setInhaleHold]=useState(demo?4.2:0),[displayPressure,setDisplayPressure]=useState(demo?1.42:0);
  const elapsedRef=useRef(demo?12:0),blowRef=useRef(0),peakRef=useRef(demo?1.42:0),sustainRef=useRef(demo?6.8:0),inhaleRef=useRef(0),inhaleHoldRef=useRef(demo?4.2:0);
  const tubeRefs=useRef<(HTMLDivElement|null)[]>([]),ballRefs=useRef<(HTMLDivElement|null)[]>([]),pressureRef=useRef(0);
  const pressure=demo?1.42:sensorPressure;
  useEffect(()=>{pressureRef.current=state==='running'?pressure:0},[state,pressure]);
  const finish=useCallback(()=>{ if(state==='ended') return; setState('ended');disconnect();const data={startedAt:new Date(Date.now()-elapsedRef.current*1000).toISOString(),durationSec:Math.round(elapsedRef.current),peakKpa:Number(peakRef.current.toFixed(2)),sustainSec:Number(sustainRef.current.toFixed(1))};try{const list=JSON.parse(localStorage.getItem('breathnote:sessions')||'[]');localStorage.setItem('breathnote:sessions',JSON.stringify([...list,data]));}catch{} router.push('/dashboard');},[router,disconnect,state]);
  const toggle=()=>setState(s=>s==='running'?'paused':s==='paused'?'running':'ended');
  const restart=()=>{elapsedRef.current=0;peakRef.current=0;sustainRef.current=0;blowRef.current=0;inhaleRef.current=0;inhaleHoldRef.current=0;setElapsed(0);setPeak(0);setSustain(0);setInhaleHold(0);setDisplayPressure(0);setState('running');};
  const pointer=(down:boolean)=>setBlowing(down);
  useEffect(()=>{if(demo)return;const down=(e:KeyboardEvent)=>{if(e.code!=='Space'||e.repeat)return;const target=e.target as HTMLElement|null;if(target?.matches('input,textarea,select,[contenteditable="true"]'))return;e.preventDefault();setBlowing(true)};const up=(e:KeyboardEvent)=>{if(e.code==='Space')setBlowing(false)};window.addEventListener('keydown',down);window.addEventListener('keyup',up);return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);setBlowing(false)}},[demo,setBlowing]);
  useEffect(()=>{if(state!=='running'||demo)return;let raf=0;let previous=performance.now();let uiPrevious=0;const tick=(now:number)=>{const dt=Math.min((now-previous)/1000,.1);previous=now;elapsedRef.current=Math.min(120,elapsedRef.current+dt);const p=pressureRef.current;if(p>=.5){blowRef.current+=dt;sustainRef.current=Math.max(sustainRef.current,blowRef.current);inhaleRef.current=0}else if(p<=-.5){inhaleRef.current+=dt;inhaleHoldRef.current=Math.max(inhaleHoldRef.current,inhaleRef.current);blowRef.current=0}else{blowRef.current=0;inhaleRef.current=0}if(now-uiPrevious>100){uiPrevious=now;setElapsed(elapsedRef.current);setDisplayPressure(p);peakRef.current=Math.max(peakRef.current,p);setPeak(peakRef.current);setSustain(p>=.5?blowRef.current:sustainRef.current);setInhaleHold(p<=-.5?inhaleRef.current:inhaleHoldRef.current)}
      const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;const speed=reduced?1:.2;
      levels.forEach((threshold,i)=>{const p=Math.abs(pressureRef.current);const minP=i===0?0:levels[i-1];const activeY=Math.max(0,Math.min(1,(p-minP)/(threshold-minP)));const ball=ballRefs.current[i];if(ball){const rect=ball.parentElement?.getBoundingClientRect();const height=rect?.height||368;const radius=ball.offsetHeight/2;const center=radius+10+(height-radius*2-20)*(1-activeY);const current=Number(ball.dataset.y||center);const next=current+(center-current)*speed;ball.dataset.y=String(next);ball.style.transform=`translate(-50%, ${next-radius}px)`}});
      if(elapsedRef.current>=120){finish();return}raf=requestAnimationFrame(tick)};raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf)},[state,demo,finish]);
  useEffect(()=>{if(!demo||state!=='paused')return;const p=2.84;levels.forEach((threshold,i)=>{const minP=i===0?0:levels[i-1];const ratio=Math.max(0,Math.min(1,(p-minP)/(threshold-minP)));const ball=ballRefs.current[i];if(ball){const height=ball.parentElement?.getBoundingClientRect().height||368;const radius=ball.offsetHeight/2;ball.style.transform=`translate(-50%, ${radius+10+(height-radius*2-20)*(1-ratio)-radius}px)`}})},[demo,state]);
  useEffect(()=>()=>disconnect(),[disconnect]);
  return <div className="flex min-h-screen bg-[#F4F8FC] font-sans text-[#0F2A43]"><Sidebar/><main className="min-w-0 flex-1 px-[25px] pb-8 pt-[10px] max-md:px-4"><PageHeader status={demo?'connected':sensorStatus} source={demo?'sim':sensorSource}/>{dev&&!demo&&<div className="mb-3 flex items-center gap-2 text-xs">Source: {([['sim','Sim'],['mic','Mic'],['sensor','Sensor']] as [SensorKind,string][]).map(([kind,label])=><button key={kind} onClick={()=>void connect(kind)} className={`rounded-full px-3 py-1 ${sensorSource===kind?'bg-[#1E6FE0] text-white':'bg-white text-[#526579]'}`}>{label}</button>)}</div>}
    <div className="grid grid-cols-[minmax(0,610px)_minmax(0,547px)] justify-between gap-5 max-xl:grid-cols-1"><SpirometerCard pressure={displayPressure} demo={demo} tubeRefs={tubeRefs} ballRefs={ballRefs} pointer={pointer} levels={levels}/><div className="flex flex-col gap-4"><BreathingGuideCard step={step} change={setStep}/><MetricCard title="Peak Pressure" value={`${(demo?2.84:peak).toFixed(2)} kPa`} target={`${c.target_peak.toFixed(1)} kPa`} percent={(demo?2.84:peak)/c.target_peak*100} tone="green" icon="wind"/><MetricCard title="Exhale Hold" value={`${(demo?6.8:sustain).toFixed(1)} s`} target={`${c.target_exhale_hold.toFixed(1)} s`} percent={(demo?6.8:sustain)/c.target_exhale_hold*100} tone="blue" icon="clock"/><MetricCard title="Inhale Hold" value={`${(demo?4.2:inhaleHold).toFixed(1)} s`} target={`${c.target_inhale_hold.toFixed(1)} s`} percent={(demo?4.2:inhaleHold)/c.target_inhale_hold*100} tone="green" icon="clock"/></div></div>
    <div className="mt-9"><SessionControlBar state={state} elapsed={elapsed} toggle={toggle} restart={restart} end={finish}/></div>
  </main></div>;
}
