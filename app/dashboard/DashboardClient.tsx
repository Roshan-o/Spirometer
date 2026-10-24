"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, ArrowRight, CalendarDays, CircleHelp, Clock3, LayoutDashboard, LogOut, Play, Wind } from "lucide-react";
import { logout } from "../actions/auth";

type SessionRow = {
  id: string;
  date: string;
  time: string;
  duration: string;
  pressure: string;
  maxHoldSeconds: string;
  repetitions: number;
};
type ChartPoint = { date: string; day: string; pressure: number };

interface Props {
  userName: string;
  stats: {
    peakPressure: string;
    maxHoldSeconds: string;
    averageDuration: string;
    sessionsThisWeek: number;
    totalRepetitions: number;
  };
  sessions: SessionRow[];
  chartData: ChartPoint[];
  consistencyData: { date: string; count: number; isToday?: boolean }[];
}

const chartRanges = ["Week", "Month", "All Time"] as const;
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function durationLabel(value: string) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds === 0) return "—";
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

export default function DashboardClient({ userName, stats, sessions, chartData, consistencyData }: Props) {
  const router = useRouter();
  const [range, setRange] = useState<(typeof chartRanges)[number]>("Week");
  const filteredChart = useMemo(() => {
    if (range === "All Time") return chartData;
    const days = range === "Week" ? 7 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (days - 1));
    cutoff.setHours(0, 0, 0, 0);
    return chartData.filter((point) => new Date(point.date) >= cutoff);
  }, [chartData, range]);

  const cards = [
    { label: "Peak Pressure", value: stats.peakPressure, unit: "kPa", icon: Wind, tone: "blue" },
    { label: "Longest Hold", value: stats.maxHoldSeconds, unit: "s", icon: Clock3, tone: "green" },
    { label: "Avg Session Time", value: durationLabel(stats.averageDuration), unit: "", icon: Activity, tone: "blue" },
    { label: "Sessions This Week", value: String(stats.sessionsThisWeek), unit: "", icon: CalendarDays, tone: "green", detail: `${stats.totalRepetitions} repetitions overall` },
  ];
  const weeks = [consistencyData.slice(0, 7), consistencyData.slice(7, 14)];

  return (
    <div className="flex min-h-screen bg-[#f3f7fd] font-sans text-[#10264a] max-md:flex-col">
      <aside className="sticky top-0 flex h-screen w-[250px] shrink-0 flex-col border-r border-[#e6edf7] bg-[#f8fbff] px-4 py-5 max-lg:w-[210px] max-md:relative max-md:h-auto max-md:w-full max-md:flex-row max-md:items-center max-md:gap-3 max-md:px-4 max-md:py-3">
        <Link href="/dashboard" className="mb-7 px-2 text-[21px] font-extrabold tracking-tight max-md:mb-0"><span className="text-[#10264a]">Breath</span><span className="text-[#10a88a]">Note</span></Link>
        <nav className="flex flex-col gap-1 max-md:flex-row max-md:gap-1">
          <Link href="/dashboard" className="flex items-center gap-3 rounded-lg bg-[#e2edff] px-3 py-2.5 text-[13px] font-semibold text-[#1763df]"><LayoutDashboard size={16}/>Dashboard</Link>
          <Link href="/exercise" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-[#536680] hover:bg-white"><Wind size={16}/>Breathing Session</Link>
        </nav>
        <div className="mt-auto flex flex-col gap-1 max-md:ml-auto max-md:flex-row">
          <a href="#session-history" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[12px] text-[#65758c] hover:bg-white"><CircleHelp size={15}/>Help &amp; Support</a>
          <button onClick={async () => { await logout(); router.push("/login"); }} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[12px] text-[#65758c] hover:bg-white"><LogOut size={15}/>Logout</button>
        </div>
      </aside>

      <main className="mx-auto min-w-0 flex-1 px-7 py-6 max-md:px-4 max-md:py-4">
        <header className="mb-5 flex items-center justify-between gap-4">
          <div><h1 className="text-[23px] font-bold tracking-tight">{greeting()}, {userName}!</h1><p className="mt-0.5 text-[12px] text-[#75849a]">Let’s keep your lungs strong and your music going.</p></div>
          <div className="flex items-center gap-3 rounded-xl border border-[#e8edf5] bg-white px-3 py-2 shadow-sm"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#3978ed] text-[11px] font-bold text-white">{userName.charAt(0).toUpperCase()}</span><span className="max-w-36 truncate text-[11px] font-semibold">{userName}</span></div>
        </header>

        <section className="mb-4 grid min-h-[172px] grid-cols-[minmax(0,1fr)_minmax(270px,390px)] gap-5 rounded-xl bg-gradient-to-r from-[#e6efff] to-[#eff5ff] p-5 max-lg:grid-cols-1">
          <div className="flex flex-col items-start justify-center">
            <h2 className="text-[18px] font-bold">Ready for a Breathing Session?</h2>
            <p className="mt-1 text-[12px] text-[#6b7e9d]">Play, breathe, and track your progress in real time.</p>
            <Link href="/exercise" className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#1763df] px-5 py-2.5 text-[12px] font-semibold text-white shadow-[0_4px_10px_rgba(23,99,223,.25)] hover:bg-[#1056c8]"><Play size={14} fill="currentColor"/>Start Breathing Session<ArrowRight size={14}/></Link>
          </div>
          <div className="rounded-xl border border-[#eaf0fa] bg-white px-4 py-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between"><h3 className="text-[12px] font-bold">Recent Sessions</h3><a href="#session-history" className="flex items-center gap-1 text-[10px] font-medium text-[#1763df]">View All <ArrowRight size={11}/></a></div>
            {sessions.length === 0 ? <p className="py-4 text-[11px] text-[#8491a4]">Your completed sessions will appear here.</p> : <div className="divide-y divide-[#f0f3f8]">{sessions.slice(0, 4).map((session) => <div key={session.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-1.5 text-[10px]"><div className="min-w-0"><div className="truncate font-medium text-[#485b76]">{session.date}</div><div className="text-[9px] text-[#96a2b3]">{session.time}</div></div><span className="whitespace-nowrap text-[#677890]">{durationLabel(session.duration)}</span><span className="whitespace-nowrap font-medium text-[#40536f]">{session.pressure} kPa</span></div>)}</div>}
          </div>
        </section>

        <section className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
          {cards.map(({ label, value, unit, icon: Icon, tone, detail }) => <article key={label} className="min-h-[88px] rounded-xl border border-[#e9eef6] bg-white px-4 py-3 shadow-[0_2px_8px_rgba(36,75,125,.04)]"><div className="mb-2 flex items-center justify-between text-[10px] text-[#52647f]"><span>{label}</span><Icon size={13} className={tone === "green" ? "text-[#27b77a]" : "text-[#5790e9]"}/></div><div className="flex items-baseline gap-1"><span className="text-[21px] font-bold tracking-tight">{value}</span>{unit && <span className="text-[11px] font-semibold text-[#536680]">{unit}</span>}</div>{detail && <p className="mt-0.5 text-[9px] text-[#8b98aa]">{detail}</p>}</article>)}
        </section>

        <section className="grid grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)] gap-3 max-lg:grid-cols-1">
          <article className="rounded-xl border border-[#e9eef6] bg-white p-4 shadow-[0_2px_8px_rgba(36,75,125,.04)]">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-[13px] font-bold">Your Progress</h2><p className="mt-0.5 text-[10px] text-[#8b98aa]">Peak pressure across your saved sessions</p></div><div className="flex rounded-md bg-[#f4f7fc] p-0.5">{chartRanges.map((item) => <button key={item} onClick={() => setRange(item)} className={`rounded px-2.5 py-1 text-[9px] ${range === item ? "bg-[#e1edff] font-semibold text-[#1763df]" : "text-[#78869a] hover:text-[#304563]"}`}>{item}</button>)}</div></div>
            {filteredChart.length === 0 ? <div className="flex h-[190px] items-center justify-center text-[11px] text-[#8794a7]">No saved session data for this period.</div> : <ResponsiveContainer width="100%" height={190}><AreaChart data={filteredChart} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}><defs><linearGradient id="pressureFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2}/><stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02}/></linearGradient></defs><CartesianGrid stroke="#edf1f7" vertical={false}/><XAxis dataKey="day" tick={{ fontSize: 9, fill: "#8290a4" }} axisLine={{ stroke: "#dce4ef" }} tickLine={false} minTickGap={24}/><YAxis tick={{ fontSize: 9, fill: "#8290a4" }} axisLine={false} tickLine={false} width={38} domain={[0, "auto"]} label={{ value: "Peak Pressure (kPa)", angle: -90, position: "insideLeft", fontSize: 8, fill: "#74839a" }}/><Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.day ?? ""} formatter={(value) => [`${value} kPa`, "Peak pressure"]}/><Area type="monotone" dataKey="pressure" stroke="#2d73ed" strokeWidth={2} fill="url(#pressureFill)" activeDot={{ r: 4, fill: "#2d73ed" }} dot={{ r: 2, fill: "#2d73ed", strokeWidth: 0 }}/></AreaChart></ResponsiveContainer>}
          </article>

          <article className="rounded-xl border border-[#e9eef6] bg-white p-4 shadow-[0_2px_8px_rgba(36,75,125,.04)]">
            <h2 className="text-[13px] font-bold">Consistency <span className="text-[#4385ed]">ⓘ</span></h2><p className="mb-3 text-[10px] text-[#8b98aa]">Sessions completed per day</p>
            <div className="space-y-3"><div className="flex items-center gap-2"><span className="w-12 shrink-0"/><div className="grid flex-1 grid-cols-7 text-center">{weekdays.map((day) => <span key={day} className="text-[8px] text-[#8b98aa]">{day}</span>)}</div></div>{weeks.map((week, weekIndex) => <div key={weekIndex} className="flex items-center gap-2"><span className="w-12 shrink-0 text-[9px] text-[#7a899e]">Week {weekIndex + 1}</span><div className="grid flex-1 grid-cols-7 text-center">{week.map((day) => <span key={day.date} title={`${day.date}${day.isToday ? " (Today)" : ""}: ${day.count} session${day.count === 1 ? "" : "s"}`} className={`mx-auto h-3 w-3 rounded-full transition-transform hover:scale-125 ${day.count === 0 ? "bg-[#e8edf4]" : day.count === 1 ? "bg-[#b7e8d0]" : "bg-[#27b978]"} ${day.isToday ? "ring-2 ring-[#1763df]/35 ring-offset-1" : ""}`}/>)}</div></div>)}</div>
            <div className="mt-5 flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-[#78869a]"><span className="flex items-center gap-1"><i className="h-1.5 w-1.5 rounded-full bg-[#27b978]"/>2+ sessions</span><span className="flex items-center gap-1"><i className="h-1.5 w-1.5 rounded-full bg-[#b7e8d0]"/>1 session</span><span className="flex items-center gap-1"><i className="h-1.5 w-1.5 rounded-full bg-[#e8edf4]"/>No session</span></div>
          </article>
        </section>

        <section id="session-history" className="mt-4 rounded-xl border border-[#e9eef6] bg-white p-4 shadow-[0_2px_8px_rgba(36,75,125,.04)]">
          <div className="mb-2 flex items-center justify-between"><h2 className="text-[13px] font-bold">Session History</h2><span className="text-[10px] text-[#8b98aa]">{sessions.length} saved</span></div>
          {sessions.length === 0 ? <p className="py-5 text-center text-[11px] text-[#8491a4]">No saved sessions yet. Complete a breathing session to see your measurements here.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-[11px]"><thead><tr className="border-b border-[#edf1f6] text-[9px] text-[#8b98aa]"><th className="py-2 font-medium">Date</th><th className="py-2 font-medium">Time</th><th className="py-2 font-medium">Duration</th><th className="py-2 font-medium">Peak Pressure</th><th className="py-2 font-medium">Longest Hold</th><th className="py-2 font-medium">Repetitions</th></tr></thead><tbody>{sessions.map((session) => <tr key={session.id} className="border-b last:border-0 text-[#52647f]"><td className="py-2.5 font-medium text-[#304563]">{session.date}</td><td className="py-2.5">{session.time}</td><td className="py-2.5">{durationLabel(session.duration)}</td><td className="py-2.5">{session.pressure} kPa</td><td className="py-2.5">{session.maxHoldSeconds} s</td><td className="py-2.5">{session.repetitions}</td></tr>)}</tbody></table></div>}
        </section>
      </main>
    </div>
  );
}
