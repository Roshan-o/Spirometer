import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import DashboardClient from "./DashboardClient";

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const sessions = await prisma.exerciseSession.findMany({
    where: { userId: user.id },
    orderBy: { startTime: "desc" },
  });
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  const daysSinceMonday = (startOfToday.getDay() + 6) % 7;
  startOfWeek.setDate(startOfWeek.getDate() - daysSinceMonday);
  const startOfChart = new Date(startOfWeek);
  startOfChart.setDate(startOfChart.getDate() - 14);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  const peakPressure = sessions.reduce((max, session) => Math.max(max, Number(session.maxPressureAchieved)), 0);
  const maxHoldMs = sessions.reduce((max, session) => Math.max(max, session.maxLevelHoldDuration), 0);
  const totalDurationSeconds = sessions.reduce((total, session) => total + session.durationSeconds, 0);
  const totalRepetitions = sessions.reduce((total, session) => total + session.numberOfRepetitions, 0);
  const sessionsThisWeek = sessions.filter((session) => session.startTime >= startOfWeek && session.startTime < startOfTomorrow).length;

  const dailyPeak = new Map<string, number>();
  for (const session of sessions) {
    const key = localDateKey(session.startTime);
    dailyPeak.set(key, Math.max(dailyPeak.get(key) ?? 0, Number(session.maxPressureAchieved)));
  }
  const chartData = [...dailyPeak.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, pressure]) => ({
      date: `${date}T12:00:00`,
      day: new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      pressure: Number(pressure.toFixed(2)),
    }));

  const dailyCounts = new Map<string, number>();
  for (const session of sessions) {
    const key = localDateKey(session.startTime);
    dailyCounts.set(key, (dailyCounts.get(key) ?? 0) + 1);
  }
  const consistencyData = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(startOfChart);
    date.setDate(startOfChart.getDate() + index);
    const key = localDateKey(date);
    return { date: key, count: dailyCounts.get(key) ?? 0 };
  });

  return (
    <DashboardClient
      userName={user.name}
      stats={{
        peakPressure: sessions.length ? peakPressure.toFixed(2) : "—",
        maxHoldSeconds: sessions.length ? (maxHoldMs / 1000).toFixed(1) : "—",
        averageDuration: sessions.length ? String(Math.round(totalDurationSeconds / sessions.length)) : "—",
        sessionsThisWeek,
        totalRepetitions,
      }}
      sessions={sessions.map((session) => ({
        id: session.id,
        date: session.startTime.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
        time: session.startTime.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
        duration: String(session.durationSeconds),
        pressure: Number(session.maxPressureAchieved).toFixed(2),
        maxHoldSeconds: (session.maxLevelHoldDuration / 1000).toFixed(1),
        repetitions: session.numberOfRepetitions,
      }))}
      chartData={chartData}
      consistencyData={consistencyData}
    />
  );
}
