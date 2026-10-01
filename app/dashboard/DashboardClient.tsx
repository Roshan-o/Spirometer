"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard, Wind, HelpCircle, LogOut,
  ChevronDown, ChevronRight, ArrowUpRight, ArrowDownRight,
  Info, Play,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { logout } from "../actions/auth";
import { useRouter } from "next/navigation";

type DayStatus = "completed" | "partial" | "missed";

interface Props {
  userName: string;
  stats: {
    peakPressure: string;
    peakPressureChange: number;
    sustainDuration: string;
    sustainChange: number;
    sessionsThisWeek: number;
    sessionsLastWeek: number;
  };
  recentSessions: { date: string; time: string; duration: string; pressure: string }[];
  chartData: { day: string; pressure: number }[];
  consistencyData: string[];
}

const SESSION_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#a78bfa"];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function DayDot({ status }: { status: DayStatus }) {
  const colors: Record<DayStatus, string> = {
    completed: "bg-green-500",
    partial:   "bg-green-200",
    missed:    "bg-gray-300",
  };
  return <div className={`w-7 h-7 rounded-full ${colors[status]} border border-white`} />;
}

const CustomDot = (props: any) => {
  const { cx, cy } = props;
  return <circle cx={cx} cy={cy} r={4} fill="#3b82f6" stroke="white" strokeWidth={2} />;
};

export default function DashboardClient({ userName, stats, recentSessions, chartData, consistencyData }: Props) {
  const [activeTab, setActiveTab] = useState<"Week" | "Month" | "All Time">("Week");
  const router = useRouter();

  const weekConsistency = consistencyData.slice(0, 7) as DayStatus[];
  const week2Consistency = consistencyData.slice(7, 14) as DayStatus[];

  const sessionDelta = stats.sessionsThisWeek - stats.sessionsLastWeek;

  const statCards = [
    {
      label: "Peak Pressure", value: stats.peakPressure, unit: "kPa",
      change: `${stats.peakPressureChange > 0 ? "+" : ""}${stats.peakPressureChange}%`,
      positive: stats.peakPressureChange >= 0, sub: "vs last week",
    },
    {
      label: "Sustain Duration", value: stats.sustainDuration, unit: "s",
      change: `${stats.sustainChange > 0 ? "+" : ""}${stats.sustainChange}%`,
      positive: stats.sustainChange >= 0, sub: "vs last week",
    },
    {
      label: "Sessions This Week", value: String(stats.sessionsThisWeek), unit: "",
      change: `${sessionDelta >= 0 ? "+" : ""}${sessionDelta}`,
      positive: sessionDelta >= 0, sub: "vs last week",
    },
  ];

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="flex h-screen bg-[#f0f4f9] font-sans overflow-hidden">

      {/* Sidebar */}
      <aside className="w-52 bg-white flex flex-col py-6 px-4 shadow-sm shrink-0">
        <div className="mb-8 px-2">
          <span className="text-2xl font-bold">
            <span className="text-[#0a1e3f]">Breath</span>
            <span className="text-[#00a884]">Note</span>
          </span>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#eef2ff] text-[#1d64d8] font-semibold text-sm">
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </Link>
          <Link href="/exercise" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-500 hover:bg-gray-50 font-medium text-sm transition-colors">
            <Wind className="w-4 h-4" /> Breathing Session
          </Link>
        </nav>
        <div className="flex flex-col gap-1">
          <button className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-500 hover:bg-gray-50 font-medium text-sm w-full text-left">
            <HelpCircle className="w-4 h-4" /> Help & Support
          </button>
          <button
            onClick={async () => { await logout(); router.push("/login"); }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-500 hover:bg-gray-50 font-medium text-sm w-full text-left"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-6">

        {/* Top Bar */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0a1e3f]">{greeting()}, {userName}!</h1>
            <p className="text-sm text-gray-500 mt-0.5">Let's keep your lungs strong and your music going.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100 text-sm">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-gray-700 font-medium">Connected</span>
              <span className="text-gray-400 text-xs">Sensor Active</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="w-7 h-7 rounded-full bg-[#1d64d8] flex items-center justify-center text-white text-xs font-bold">
                {userName[0].toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-700">{userName}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Top Row: CTA + Recent Sessions */}
        <div className="grid grid-cols-5 gap-4 mb-4">
          <div className="col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center">
            <h2 className="text-xl font-bold text-[#0a1e3f] mb-2">Ready for a Breathing Session?</h2>
            <p className="text-sm text-gray-500 mb-5">Play, breathe, and track your progress in real-time.</p>
            <Link href="/exercise" className="inline-flex items-center gap-2 bg-[#1d64d8] hover:bg-[#1554b8] text-white px-5 py-3 rounded-xl font-semibold text-sm transition-colors w-fit shadow-md">
              <Play className="w-4 h-4 fill-white" /> Start Breathing Session <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="col-span-3 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#0a1e3f] text-base">Recent Sessions</h3>
              <button className="text-[#1d64d8] text-xs font-semibold flex items-center gap-1 hover:underline">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-2">
              {recentSessions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No sessions yet. Start your first one!</p>
              ) : (
                recentSessions.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: SESSION_COLORS[i % SESSION_COLORS.length] }} />
                      <div>
                        <p className="text-xs font-semibold text-gray-700">{s.date}</p>
                        <p className="text-xs text-gray-400">{s.time}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-xs text-gray-500">
                      <span>⏱ {s.duration}</span>
                      <span className="font-semibold text-gray-700">{s.pressure}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {statCards.map((card, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
                <span>{card.label}</span><Info className="w-3 h-3" />
              </div>
              <div className="flex items-end gap-1">
                <span className="text-2xl font-bold text-[#0a1e3f]">{card.value}</span>
                <span className="text-base font-semibold text-gray-400 mb-0.5">{card.unit}</span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                {card.positive
                  ? <ArrowUpRight className="w-3.5 h-3.5 text-green-500" />
                  : <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />}
                <span className={`text-xs font-semibold ${card.positive ? "text-green-500" : "text-red-400"}`}>{card.change}</span>
                <span className="text-xs text-gray-400">{card.sub}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Row: Chart + Consistency */}
        <div className="grid grid-cols-5 gap-4">

          {/* Chart */}
          <div className="col-span-3 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-[#0a1e3f] text-base">Your Progress</h3>
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                {(["Week", "Month", "All Time"] as const).map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${activeTab === tab ? "bg-white text-[#1d64d8] shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>
                    {tab}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-3">↑ Peak Pressure Trend</p>
            {chartData.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-gray-400 text-sm">No session data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} unit=" kPa" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px" }}
                    formatter={(val: number) => [`${val} kPa`, "Pressure"]}
                  />
                  <Line type="monotone" dataKey="pressure" stroke="#3b82f6" strokeWidth={2.5}
                    dot={<CustomDot />} activeDot={{ r: 6, fill: "#1d64d8" }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Consistency */}
          <div className="col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-1 mb-1">
              <h3 className="font-bold text-[#0a1e3f] text-base">Consistency</h3>
              <Info className="w-3.5 h-3.5 text-gray-400" />
            </div>
            <p className="text-xs text-gray-400 mb-4">Sessions completed per day</p>
            <div className="space-y-3">
              <div className="flex items-center">
                <span className="w-14 text-xs text-gray-400" />
                <div className="flex gap-2">
                  {DAY_LABELS.map((d) => (
                    <span key={d} className="w-7 text-center text-xs text-gray-400 font-medium">{d}</span>
                  ))}
                </div>
              </div>
              {[{ label: "Week 1", days: weekConsistency }, { label: "Week 2", days: week2Consistency }].map((week) => (
                <div key={week.label} className="flex items-center gap-2">
                  <span className="w-14 text-xs text-gray-400 shrink-0">{week.label}</span>
                  <div className="flex gap-2">
                    {week.days.map((status, i) => <DayDot key={i} status={status} />)}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-5 pt-4 border-t border-gray-100">
              {[{ color: "bg-green-500", label: "Completed" }, { color: "bg-green-200", label: "Partial" }, { color: "bg-gray-300", label: "Missed" }].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className={`w-3 h-3 rounded-full ${color}`} />
                  <span className="text-xs text-gray-500">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
