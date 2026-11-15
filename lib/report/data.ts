/**
 * lib/report/data.ts
 *
 * Gathers a user's sessions for a report period and turns them into the numbers,
 * chart points and plain-language highlights the PDF report shows. All dates are
 * in the viewer's timezone so "today" matches their calendar.
 */

import fs from "fs";
import path from "path";
import yaml from "yaml";
import prisma from "@/lib/db";

export const REPORT_PERIODS = {
  week: { label: "Last 7 days", days: 7 },
  month: { label: "Last 30 days", days: 30 },
  "6months": { label: "Last 6 months", days: 182 },
  all: { label: "All time", days: null },
} as const;
export type ReportPeriod = keyof typeof REPORT_PERIODS;
export const isReportPeriod = (value: string): value is ReportPeriod => value in REPORT_PERIODS;

export const LEVEL_NAMES = ["Warm-up", "Easy", "Medium", "Hard"] as const;
/** Longest calendar the report draws (in weeks); longer "All time" ranges show the latest weeks. */
const MAX_CALENDAR_WEEKS = 53;
const DAY_MS = 86_400_000;

export interface Targets { easy: number; medium: number; hard: number; targetPeak: number; targetHold: number }

function loadTargets(): Targets {
  const fallback = { easy: 1.5, medium: 2.5, hard: 3.5, target_peak: 3.0, target_exhale_hold: 8.0 };
  let config: Record<string, number> = fallback;
  try {
    config = { ...fallback, ...yaml.parse(fs.readFileSync(path.join(process.cwd(), "levels.yaml"), "utf8")) };
  } catch {
    // Keep defaults when levels.yaml is missing or invalid.
  }
  return { easy: config.easy, medium: config.medium, hard: config.hard, targetPeak: config.target_peak, targetHold: config.target_exhale_hold };
}

/** "2026-11-15" for a moment, in a timezone. */
function dayKey(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
/** 0 = Monday ... 6 = Sunday, for a "YYYY-MM-DD" key. */
function mondayIndex(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}
function keyToLabel(key: string, options: Intl.DateTimeFormatOptions) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("en-US", { timeZone: "UTC", ...options });
}
function shiftKey(key: string, days: number) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function levelFor(pressure: number, t: Targets) {
  return pressure >= t.hard ? 3 : pressure >= t.medium ? 2 : pressure >= t.easy ? 1 : 0;
}

export async function buildReportData(userId: string, period: ReportPeriod, timezone: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true } });
  const targets = loadTargets();
  const now = new Date();
  const todayKey = dayKey(now, timezone);

  const span = REPORT_PERIODS[period].days;
  let firstKey: string;
  if (span) {
    firstKey = shiftKey(todayKey, -(span - 1));
  } else {
    const first = await prisma.exerciseSession.findFirst({ where: { userId }, orderBy: { startTime: "asc" }, select: { startTime: true } });
    firstKey = first ? dayKey(first.startTime, timezone) : shiftKey(todayKey, -29);
  }

  // Fetch a day of slack on each side, then keep sessions whose local date is in range.
  const [fy, fm, fd] = firstKey.split("-").map(Number);
  const rows = await prisma.exerciseSession.findMany({
    where: { userId, startTime: { gte: new Date(Date.UTC(fy, fm - 1, fd) - DAY_MS), lte: new Date(now.getTime() + DAY_MS) } },
    orderBy: { startTime: "asc" },
  });
  const sessions = rows
    .map((s) => ({
      key: dayKey(s.startTime, timezone),
      date: s.startTime.toLocaleDateString("en-US", { timeZone: timezone, weekday: "short", month: "short", day: "numeric", year: "numeric" }),
      time: s.startTime.toLocaleTimeString("en-US", { timeZone: timezone, hour: "numeric", minute: "2-digit" }),
      durationSeconds: s.durationSeconds,
      peak: Number(s.maxPressureAchieved),
      level: Math.max(s.maxLevelReached, levelFor(Number(s.maxPressureAchieved), targets)),
      holdSeconds: s.maxLevelHoldDuration / 1000,
      repetitions: s.numberOfRepetitions,
    }))
    .filter((s) => s.key >= firstKey && s.key <= todayKey);

  // Every day in the period, oldest first.
  const days: string[] = [];
  for (let key = firstKey; key <= todayKey; key = shiftKey(key, 1)) days.push(key);

  const perDay = new Map<string, { count: number; peak: number }>();
  for (const s of sessions) {
    const day = perDay.get(s.key) ?? { count: 0, peak: 0 };
    perDay.set(s.key, { count: day.count + 1, peak: Math.max(day.peak, s.peak) });
  }

  const daysPractised = perDay.size;
  const bestPeak = sessions.reduce((max, s) => Math.max(max, s.peak), 0);
  const longestHold = sessions.reduce((max, s) => Math.max(max, s.holdSeconds), 0);
  const totalReps = sessions.reduce((sum, s) => sum + s.repetitions, 0);
  const totalSeconds = sessions.reduce((sum, s) => sum + s.durationSeconds, 0);
  const levelCounts = [0, 0, 0, 0];
  for (const s of sessions) levelCounts[s.level] += 1;

  // Trend: average daily peak in the first vs. second half of practised days.
  const dailyPeaks = days.filter((d) => perDay.has(d)).map((d) => perDay.get(d)!.peak);
  let trend: { direction: "rising" | "steady" | "falling"; change: number } | null = null;
  if (dailyPeaks.length >= 4) {
    const half = Math.floor(dailyPeaks.length / 2);
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const change = avg(dailyPeaks.slice(-half)) - avg(dailyPeaks.slice(0, half));
    trend = { direction: change > 0.15 ? "rising" : change < -0.15 ? "falling" : "steady", change };
  }

  // Calendar: whole weeks (Mon–Sun) covering the period, capped to the latest MAX_CALENDAR_WEEKS.
  let calendarStart = shiftKey(firstKey, -mondayIndex(firstKey));
  const calendarEnd = shiftKey(todayKey, 6 - mondayIndex(todayKey));
  const earliest = shiftKey(calendarEnd, -(MAX_CALENDAR_WEEKS * 7 - 1));
  const calendarTrimmed = calendarStart < earliest;
  if (calendarTrimmed) calendarStart = earliest;
  const weeks: { key: string; count: number; inPeriod: boolean }[][] = [];
  for (let key = calendarStart; key <= calendarEnd; key = shiftKey(key, 1)) {
    if (mondayIndex(key) === 0) weeks.push([]);
    weeks[weeks.length - 1].push({ key, count: perDay.get(key)?.count ?? 0, inPeriod: key >= firstKey && key <= todayKey });
  }

  const highlights: string[] = [];
  if (sessions.length) {
    highlights.push(`Practised on ${daysPractised} of ${days.length} days (${Math.round((daysPractised / days.length) * 100)}%), ${sessions.length} session${sessions.length === 1 ? "" : "s"} in total.`);
    highlights.push(`Best peak pressure was ${bestPeak.toFixed(2)} kPa, reaching the ${LEVEL_NAMES[levelFor(bestPeak, targets)]} level. ${bestPeak >= targets.targetPeak ? `This meets the ${targets.targetPeak.toFixed(1)} kPa target.` : `The target is ${targets.targetPeak.toFixed(1)} kPa.`}`);
    highlights.push(`Longest steady hold was ${longestHold.toFixed(1)} s. ${longestHold >= targets.targetHold ? `This meets the ${targets.targetHold} s target.` : `The target is ${targets.targetHold} s.`}`);
    if (trend) highlights.push(
      trend.direction === "steady"
        ? "Peak pressure has stayed steady across the period."
        : `Peak pressure is ${trend.direction}: about ${Math.abs(trend.change).toFixed(2)} kPa ${trend.direction === "rising" ? "higher" : "lower"} in the second half of the period than the first.`,
    );
  }

  return {
    patient: user,
    period: {
      label: REPORT_PERIODS[period].label,
      range: `${keyToLabel(firstKey, { month: "short", day: "numeric", year: "numeric" })} - ${keyToLabel(todayKey, { month: "short", day: "numeric", year: "numeric" })}`,
      totalDays: days.length,
    },
    generated: now.toLocaleString("en-US", { timeZone: timezone, dateStyle: "medium", timeStyle: "short" }),
    targets,
    summary: {
      sessions: sessions.length,
      daysPractised,
      adherence: days.length ? daysPractised / days.length : 0,
      bestPeak,
      longestHold,
      totalReps,
      avgSessionSeconds: sessions.length ? totalSeconds / sessions.length : 0,
    },
    highlights,
    levelCounts,
    chart: days.map((key, index) => ({ index, key, peak: perDay.get(key)?.peak ?? null, label: keyToLabel(key, { month: "short", day: "numeric" }) })),
    calendar: { weeks, trimmed: calendarTrimmed },
    sessions: [...sessions].reverse(),
  };
}

export type ReportData = Awaited<ReturnType<typeof buildReportData>>;
