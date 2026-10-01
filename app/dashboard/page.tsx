import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import prisma from "@/lib/db";
import DashboardClient from "./DashboardClient";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_for_development";
const encoder = new TextEncoder();

async function getUserFromCookie() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, encoder.encode(JWT_SECRET));
    return payload as { id: string; email: string; name: string };
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const user = await getUserFromCookie();
  const userId = user?.id;

  // Fetch the last 14 sessions for chart
  const sessions = userId
    ? await prisma.exerciseSession.findMany({
        where: { userId },
        orderBy: { startTime: "asc" },
        take: 14,
      })
    : [];

  // Recent 4 sessions (latest first)
  const recentSessions = userId
    ? await prisma.exerciseSession.findMany({
        where: { userId },
        orderBy: { startTime: "desc" },
        take: 4,
      })
    : [];

  // Stats: compare last 7 days vs previous 7 days
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(now.getDate() - 14);

  const thisWeekSessions = sessions.filter(
    (s) => s.startTime >= sevenDaysAgo
  );
  const lastWeekSessions = sessions.filter(
    (s) => s.startTime >= fourteenDaysAgo && s.startTime < sevenDaysAgo
  );

  const avgOrZero = (arr: number[]) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const thisWeekPressures = thisWeekSessions.map((s) =>
    Number(s.maxPressureAchieved)
  );
  const lastWeekPressures = lastWeekSessions.map((s) =>
    Number(s.maxPressureAchieved)
  );

  const thisWeekHolds = thisWeekSessions.map((s) => s.maxLevelHoldDuration);
  const lastWeekHolds = lastWeekSessions.map((s) => s.maxLevelHoldDuration);

  const currentMaxPressure = thisWeekPressures.length
    ? Math.max(...thisWeekPressures)
    : 0;
  const lastMaxPressure = lastWeekPressures.length
    ? Math.max(...lastWeekPressures)
    : 0;

  const avgHoldThis = avgOrZero(thisWeekHolds);
  const avgHoldLast = avgOrZero(lastWeekHolds);

  const pctChange = (curr: number, prev: number) => {
    if (prev === 0) return 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  // Consistency grid (last 14 days, 2 weeks)
  const consistencyData = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 13 + i);
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const daySessions = sessions.filter(
      (s) => s.startTime >= d && s.startTime < next
    );
    if (daySessions.length === 0) return "missed";
    if (daySessions[0].numberOfRepetitions >= 6) return "completed";
    return "partial";
  });

  // Chart data
  const chartData = sessions.map((s, i) => ({
    day: `Day ${i + 1}`,
    pressure: Number(Number(s.maxPressureAchieved).toFixed(2)),
  }));

  const props = {
    userName: user?.name || "User",
    stats: {
      peakPressure: currentMaxPressure.toFixed(2),
      peakPressureChange: pctChange(currentMaxPressure, lastMaxPressure),
      sustainDuration: (avgHoldThis / 1000).toFixed(2),
      sustainChange: pctChange(avgHoldThis, avgHoldLast),
      sessionsThisWeek: thisWeekSessions.length,
      sessionsLastWeek: lastWeekSessions.length,
    },
    recentSessions: recentSessions.map((s) => ({
      date: s.startTime.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      time: s.startTime.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
      duration: `${Math.floor(s.durationSeconds / 60)}:${String(
        s.durationSeconds % 60
      ).padStart(2, "0")} min`,
      pressure: `${Number(s.maxPressureAchieved).toFixed(2)} kPa`,
    })),
    chartData,
    consistencyData,
  };

  return <DashboardClient {...props} />;
}
