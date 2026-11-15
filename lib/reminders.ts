/**
 * lib/reminders.ts
 *
 * Reminder scheduler. Started once from instrumentation.ts when the server boots;
 * every 30 seconds it emails each reminder whose local time has arrived today.
 * Reminders only go out while the server is running: one missed by more than
 * CATCH_UP_MINUTES (server was off) is skipped, not sent late.
 */

import prisma from "@/lib/db";
import { formatTime, mailConfigured, sendReminderEmail } from "@/lib/mail";

const CHECK_EVERY_MS = 30_000;
/** A reminder still fires if the check runs up to this many minutes after its time. */
const CATCH_UP_MINUTES = 5;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** The current date, weekday (0 = Sunday) and minutes past midnight in a timezone. */
export function localNow(timezone: string, now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
      weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(now).map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: WEEKDAYS.indexOf(parts.weekday),
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

export function isValidTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

async function checkReminders() {
  if (!mailConfigured()) return;
  const reminders = await prisma.reminder.findMany({
    where: { enabled: true },
    include: { user: { select: { email: true, name: true } } },
  });
  const now = new Date();

  for (const reminder of reminders) {
    const local = localNow(reminder.timezone, now);
    const late = local.minutes - (reminder.hour * 60 + reminder.minute);
    if (!reminder.days.includes(local.weekday) || late < 0 || late > CATCH_UP_MINUTES) continue;
    if (reminder.lastSentOn === local.date) continue;

    // Claim today's send first, so a second check (or server instance) can't send it twice.
    const claimed = await prisma.reminder.updateMany({
      where: { id: reminder.id, OR: [{ lastSentOn: null }, { lastSentOn: { not: local.date } }] },
      data: { lastSentOn: local.date },
    });
    if (!claimed.count) continue;

    const time = formatTime(reminder.hour, reminder.minute);
    try {
      await sendReminderEmail(reminder.user.email, reminder.user.name, time);
      console.log(`[reminders] Sent ${time} reminder to ${reminder.user.email}`);
    } catch (error) {
      console.error(`[reminders] Failed to send ${time} reminder to ${reminder.user.email}:`, error);
      // Release the claim so the next check retries within the catch-up window.
      await prisma.reminder.update({ where: { id: reminder.id }, data: { lastSentOn: reminder.lastSentOn } });
    }
  }
}

const globalForReminders = globalThis as typeof globalThis & { reminderTimer?: ReturnType<typeof setInterval> };

export function startReminderScheduler() {
  // Dev-server reloads re-run this; keep a single timer.
  if (globalForReminders.reminderTimer) clearInterval(globalForReminders.reminderTimer);
  if (!mailConfigured()) console.warn("[reminders] GMAIL_USER / GMAIL_APP_PASSWORD not set in .env — reminder emails are off.");
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try { await checkReminders(); }
    catch (error) { console.error("[reminders] Check failed:", error); }
    finally { running = false; }
  };
  globalForReminders.reminderTimer = setInterval(tick, CHECK_EVERY_MS);
  void tick();
  console.log("[reminders] Scheduler started.");
}
