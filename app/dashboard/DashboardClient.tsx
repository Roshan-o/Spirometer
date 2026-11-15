"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, ArrowRight, CalendarDays, CircleHelp, Clock3, LayoutDashboard, LogOut, Play, Wind } from "lucide-react";
import { logout } from "../actions/auth";
import RemindersCard, { type ReminderRow } from "./RemindersCard";
import DownloadReportButton from "./DownloadReportButton";

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
  reminders: ReminderRow[];
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

export default function DashboardClient({ userName, stats, sessions, chartData, consistencyData, reminders }: Props) {
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
        <Link href="/dashboard" className="mb-7 px-2 text-[23px] font-extrabold tracking-tight max-md:mb-0"><span className="text-[#10264a]">Breath</span><span className="text-[#10a88a]">Note</span></Link>
        <nav className="flex flex-col gap-1 max-md:flex-row max-md:gap-1">
          <Link href="/dashboard" className="flex items-center gap-3 rounded-lg bg-[#e2edff] px-3 py-2.5 text-[15px] font-semibold text-[#1763df]"><LayoutDashboard size={16}/>Dashboard</Link>
          <Link href="/exercise" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium text-[#536680] hover:bg-white"><Wind size={16}/>Breathing Session</Link>
        </nav>
        <div className="mt-auto flex flex-col gap-1 max-md:ml-auto max-md:flex-row">
          <a href="#session-history" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] text-[#65758c] hover:bg-white"><CircleHelp size={15}/>Help &amp; Support</a>
          <button onClick={async () => { await logout(); router.push("/login"); }} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[14px] text-[#65758c] hover:bg-white"><LogOut size={15}/>Logout</button>
        </div>
      </aside>

      <main className="mx-auto min-w-0 flex-1 px-7 py-6 max-md:px-4 max-md:py-4">
        <header className="mb-5 flex items-center justify-between gap-4">
          <div><h1 className="text-[28px] font-bold tracking-tight">{greeting()}, {userName}!</h1><p className="mt-0.5 text-[14px] text-[#75849a]">Let’s keep your lungs strong and your music going.</p></div>
          <div className="flex items-center gap-2"><DownloadReportButton/><div className="flex items-center gap-3 rounded-xl border border-[#e8edf5] bg-white px-3 py-2 shadow-sm"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#3978ed] text-[13px] font-bold text-white">{userName.charAt(0).toUpperCase()}</span><span className="max-w-36 truncate text-[13px] font-semibold">{userName}</span></div></div>
        </header>

        <section className="mb-4 grid min-h-[172px] grid-cols-1 gap-5 rounded-xl bg-gradient-to-r from-[#e6efff] to-[#eff5ff] p-5 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(260px,360px)_minmax(260px,330px)]">
          <div className="flex items-center justify-between gap-6 md:col-span-2 xl:col-span-1">
            <div className="flex flex-col items-start">
              <span className="mb-2 rounded-full bg-white/70 px-2.5 py-1 text-[12px] font-semibold text-[#1763df]">Daily practice</span>
              <h2 className="text-[24px] font-bold leading-tight">Ready for a Breathing Session?</h2>
              <p className="mt-1.5 text-[14px] text-[#6b7e9d]">Play, breathe, and track your progress in real time.</p>
              <Link href="/exercise" className="mt-4 inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-[#1763df] px-6 py-3 text-[14px] font-semibold text-white shadow-[0_6px_14px_rgba(23,99,223,.28)] transition hover:-translate-y-0.5 hover:bg-[#1056c8]"><Play size={15} fill="currentColor"/>Start Breathing Session<ArrowRight size={15}/></Link>
            </div>
            <svg aria-hidden="true" viewBox="0 0 120 120" className="hidden h-[120px] w-[120px] shrink-0 sm:block xl:hidden 2xl:block">
              {[["#1E73E8", 38], ["#2EB84B", 58], ["#F59E0B", 80]].map(([color, y], i) => (
                <g key={i}>
                  <rect x={14 + i * 34} y={14} width={24} height={92} rx={12} fill="#ffffff" stroke="#d6e3f7"/>
                  <circle cx={26 + i * 34} cy={Number(y) + 10} r={9} fill={String(color)}/>
                </g>
              ))}
            </svg>
          </div>
          <div className="rounded-xl border border-[#eaf0fa] bg-white px-4 py-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between"><h3 className="text-[14px] font-bold">Recent Sessions</h3><a href="#session-history" className="flex items-center gap-1 text-[12px] font-medium text-[#1763df]">View All <ArrowRight size={11}/></a></div>
            {sessions.length === 0 ? <p className="py-4 text-[13px] text-[#8491a4]">Your completed sessions will appear here.</p> : <div className="divide-y divide-[#f0f3f8]">{sessions.slice(0, 4).map((session) => <div key={session.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-2 text-[13px]"><div className="min-w-0"><div className="truncate font-medium text-[#485b76]">{session.date}</div><div className="text-[11px] text-[#96a2b3]">{session.time}</div></div><span className="whitespace-nowrap text-[#677890]">{durationLabel(session.duration)}</span><span className="whitespace-nowrap font-medium text-[#40536f]">{session.pressure} kPa</span></div>)}</div>}
          </div>
          <RemindersCard reminders={reminders}/>
        </section>

        <section className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
          {cards.map(({ label, value, unit, icon: Icon, tone, detail }) => <article key={label} className="min-h-[104px] rounded-2xl border border-[#e9eef6] bg-white px-5 py-4 shadow-[0_2px_8px_rgba(36,75,125,.04)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(36,75,125,.08)]"><div className="mb-2 flex items-center justify-between text-[13px] font-medium text-[#52647f]"><span>{label}</span><span className={`grid h-8 w-8 place-items-center rounded-full ${tone === "green" ? "bg-[#e7f8ef] text-[#27b77a]" : "bg-[#e9f1ff] text-[#3f7fe8]"}`}><Icon size={16}/></span></div><div className="flex items-baseline gap-1"><span className="text-[28px] font-bold tracking-tight">{value}</span>{unit && <span className="text-[14px] font-semibold text-[#536680]">{unit}</span>}</div>{detail && <p className="mt-0.5 text-[12px] text-[#8b98aa]">{detail}</p>}</article>)}
        </section>

        <section className="grid grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)] gap-4 max-lg:grid-cols-1">
          <article className="rounded-2xl border border-[#e9eef6] bg-white p-5 shadow-[0_2px_8px_rgba(36,75,125,.04)]">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-[17px] font-bold">Your Progress</h2><p className="mt-0.5 text-[12px] text-[#8b98aa]">Peak pressure across your saved sessions</p></div><div className="flex rounded-md bg-[#f4f7fc] p-0.5">{chartRanges.map((item) => <button key={item} onClick={() => setRange(item)} className={`rounded px-3 py-1.5 text-[12px] ${range === item ? "bg-[#e1edff] font-semibold text-[#1763df]" : "text-[#78869a] hover:text-[#304563]"}`}>{item}</button>)}</div></div>
            {filteredChart.length === 0 ? <div className="flex h-[220px] flex-col items-center justify-center gap-2 rounded-xl bg-[#f8fafd] text-[14px] text-[#8794a7]"><Activity size={22} className="text-[#b6c3d6]"/>No saved session data for this period.</div> : <ResponsiveContainer width="100%" height={220}><AreaChart data={filteredChart} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}><defs><linearGradient id="pressureFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2}/><stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02}/></linearGradient></defs><CartesianGrid stroke="#edf1f7" vertical={false}/><XAxis dataKey="day" tick={{ fontSize: 12, fill: "#8290a4" }} axisLine={{ stroke: "#dce4ef" }} tickLine={false} minTickGap={24}/><YAxis tick={{ fontSize: 12, fill: "#8290a4" }} axisLine={false} tickLine={false} width={44} domain={[0, "auto"]} label={{ value: "Peak Pressure (kPa)", angle: -90, position: "insideLeft", fontSize: 11, fill: "#74839a" }}/><Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.day ?? ""} formatter={(value) => [`${value} kPa`, "Peak pressure"]}/><Area type="monotone" dataKey="pressure" stroke="#2d73ed" strokeWidth={2.5} fill="url(#pressureFill)" activeDot={{ r: 6, fill: "#2d73ed" }} dot={{ r: 3.5, fill: "#2d73ed", strokeWidth: 0 }}/></AreaChart></ResponsiveContainer>}
          </article>

          <article className="rounded-2xl border border-[#e9eef6] bg-white p-5 shadow-[0_2px_8px_rgba(36,75,125,.04)]">
            <h2 className="text-[17px] font-bold">Consistency <span className="text-[#4385ed]">ⓘ</span></h2><p className="mb-4 text-[12px] text-[#8b98aa]">Sessions completed per day</p>
            <div className="space-y-4"><div className="flex items-center gap-2"><span className="w-14 shrink-0"/><div className="grid flex-1 grid-cols-7 text-center">{weekdays.map((day) => <span key={day} className="text-[12px] text-[#8b98aa]">{day}</span>)}</div></div>{weeks.map((week, weekIndex) => <div key={weekIndex} className="flex items-center gap-2"><span className="w-14 shrink-0 text-[12px] font-medium text-[#7a899e]">Week {weekIndex + 1}</span><div className="grid flex-1 grid-cols-7 text-center">{week.map((day) => <span key={day.date} title={`${day.date}${day.isToday ? " (Today)" : ""}: ${day.count} session${day.count === 1 ? "" : "s"}`} className={`mx-auto h-6 w-6 rounded-full transition-transform hover:scale-125 ${day.count === 0 ? "bg-[#e8edf4]" : day.count === 1 ? "bg-[#4cc38a]" : "bg-[#15803d]"} ${day.isToday ? "ring-2 ring-[#1763df]/35 ring-offset-1" : ""}`}/>)}</div></div>)}</div>
            <div className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#78869a]"><span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-[#15803d]"/>2+ sessions</span><span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-[#4cc38a]"/>1 session</span><span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-[#e8edf4]"/>No session</span></div>
          </article>
        </section>

        <section id="session-history" className="mt-4 rounded-2xl border border-[#e9eef6] bg-white p-5 shadow-[0_2px_8px_rgba(36,75,125,.04)]">
          <div className="mb-2 flex items-center justify-between"><h2 className="text-[17px] font-bold">Session History</h2><span className="rounded-full bg-[#f1f5fb] px-2.5 py-1 text-[12px] font-medium text-[#6b7e9d]">{sessions.length} saved</span></div>
          {sessions.length === 0 ? <p className="py-5 text-center text-[13px] text-[#8491a4]">No saved sessions yet. Complete a breathing session to see your measurements here.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-[13px]"><thead><tr className="border-b border-[#edf1f6] bg-[#f8fafd] text-[12px] uppercase tracking-wide text-[#8b98aa]"><th className="px-2 py-2.5 font-medium">Date</th><th className="px-2 py-2.5 font-medium">Time</th><th className="px-2 py-2.5 font-medium">Duration</th><th className="px-2 py-2.5 font-medium">Peak Pressure</th><th className="px-2 py-2.5 font-medium">Longest Hold</th><th className="px-2 py-2.5 font-medium">Repetitions</th></tr></thead><tbody>{sessions.map((session) => <tr key={session.id} className="border-b border-[#f0f3f8] text-[#52647f] last:border-0 hover:bg-[#f8fbff]"><td className="px-2 py-3 font-medium text-[#304563]">{session.date}</td><td className="px-2 py-3">{session.time}</td><td className="px-2 py-3">{durationLabel(session.duration)}</td><td className="px-2 py-3 font-semibold text-[#304563]">{session.pressure} kPa</td><td className="px-2 py-3">{session.maxHoldSeconds} s</td><td className="px-2 py-3">{session.repetitions}</td></tr>)}</tbody></table></div>}
        </section>
      </main>
    </div>
  );
}
