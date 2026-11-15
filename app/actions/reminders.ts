"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { formatTime, mailConfigured, sendReminderEmail } from "@/lib/mail";
import { isValidTimezone } from "@/lib/reminders";

export interface NewReminder {
  /** 1–12 */
  hour: number;
  /** 0–59 */
  minute: number;
  period: "AM" | "PM";
  /** 0 = Sunday ... 6 = Saturday */
  days: number[];
  timezone: string;
}

const MAX_REMINDERS = 50;

export async function addReminder(input: NewReminder) {
  const user = await getSessionUser();
  if (!user) return { error: "Your session expired. Please sign in again." };

  const { hour, minute, period, timezone } = input;
  if (!Number.isInteger(hour) || hour < 1 || hour > 12) return { error: "Choose an hour from 1 to 12." };
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return { error: "Choose a minute from 00 to 59." };
  if (period !== "AM" && period !== "PM") return { error: "Choose AM or PM." };
  if (!Array.isArray(input.days)) return { error: "Choose at least one day." };
  const days = [...new Set(input.days)].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6).sort();
  if (!days.length) return { error: "Choose at least one day." };
  if (typeof timezone !== "string" || !isValidTimezone(timezone)) return { error: "Your timezone could not be detected." };

  if (await prisma.reminder.count({ where: { userId: user.id } }) >= MAX_REMINDERS) {
    return { error: `You can have up to ${MAX_REMINDERS} reminders.` };
  }

  await prisma.reminder.create({
    data: { userId: user.id, hour: (hour % 12) + (period === "PM" ? 12 : 0), minute, days, timezone },
  });
  revalidatePath("/dashboard");
  return { success: true };
}

export async function setReminderEnabled(id: string, enabled: boolean) {
  const user = await getSessionUser();
  if (!user) return { error: "Your session expired. Please sign in again." };
  await prisma.reminder.updateMany({ where: { id, userId: user.id }, data: { enabled: Boolean(enabled) } });
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteReminder(id: string) {
  const user = await getSessionUser();
  if (!user) return { error: "Your session expired. Please sign in again." };
  await prisma.reminder.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/dashboard");
  return { success: true };
}

/** Send a sample reminder right now, to check the email setup. */
export async function sendTestReminder() {
  const user = await getSessionUser();
  if (!user) return { error: "Your session expired. Please sign in again." };
  if (!mailConfigured()) return { error: "Email isn't set up yet: add GMAIL_USER and GMAIL_APP_PASSWORD to .env and restart the server." };
  const now = new Date();
  try {
    await sendReminderEmail(user.email, user.name, formatTime(now.getHours(), now.getMinutes()));
    return { success: true, email: user.email };
  } catch (error) {
    console.error("[reminders] Test email failed:", error);
    return { error: "Couldn't send the email. Check GMAIL_USER and GMAIL_APP_PASSWORD in .env." };
  }
}
