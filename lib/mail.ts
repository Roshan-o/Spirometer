/**
 * lib/mail.ts
 *
 * Sends email through Gmail SMTP. Set in .env:
 *   GMAIL_USER="you@gmail.com"
 *   GMAIL_APP_PASSWORD="abcdabcdabcdabcd"   (Google Account → Security → App passwords)
 *   APP_URL="http://localhost:3000"          (optional; used for links in the mail)
 */

import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null = null;

export function mailConfigured() {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

function getTransporter() {
  if (!mailConfigured()) throw new Error("Email is not set up: add GMAIL_USER and GMAIL_APP_PASSWORD to .env and restart the server.");
  transporter ??= nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "") },
  });
  return transporter;
}

export const appUrl = () => (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Format a 24-hour time as "7:05 AM". */
export function formatTime(hour: number, minute: number) {
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}

export async function sendReminderEmail(to: string, name: string, time: string) {
  const link = `${appUrl()}/exercise`;
  const safeName = escapeHtml(name);
  const text = [
    `Hi ${name},`,
    "",
    `It's ${time} — time for your breathing exercise.`,
    "",
    "A few minutes with your BreathNote spirometer keeps your lungs strong:",
    "  • Sit upright and relax your shoulders.",
    "  • Breathe out steadily and raise the balls, Ga → Pa → Sa'.",
    "  • Hold each note as long as you comfortably can, then rest.",
    "",
    `Start your session: ${link}`,
    "",
    "You're receiving this because you set a reminder in BreathNote. You can change or turn it off on your dashboard.",
  ].join("\n");

  const html = `<!doctype html><html><body style="margin:0;background:#f3f7fd;font-family:Arial,Helvetica,sans-serif;color:#10264a">
  <div style="max-width:480px;margin:24px auto;background:#ffffff;border:1px solid #e6edf7;border-radius:12px;padding:24px">
    <div style="font-size:20px;font-weight:800;margin-bottom:16px">Breath<span style="color:#10a88a">Note</span></div>
    <p style="font-size:15px;margin:0 0 12px">Hi ${safeName},</p>
    <p style="font-size:15px;margin:0 0 16px">It's <b>${time}</b> — time for your breathing exercise.</p>
    <p style="font-size:14px;margin:0 0 8px;color:#41556f">A few minutes with your spirometer keeps your lungs strong:</p>
    <ul style="font-size:14px;color:#41556f;margin:0 0 20px;padding-left:20px">
      <li>Sit upright and relax your shoulders.</li>
      <li>Breathe out steadily and raise the balls, Ga → Pa → Sa'.</li>
      <li>Hold each note as long as you comfortably can, then rest.</li>
    </ul>
    <a href="${link}" style="display:inline-block;background:#1763df;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:10px 20px;border-radius:999px">Start Breathing Session</a>
    <p style="font-size:11px;color:#8b98aa;margin:24px 0 0">You're receiving this because you set a reminder in BreathNote. You can change or turn it off on your dashboard.</p>
  </div></body></html>`;

  await getTransporter().sendMail({
    from: `"BreathNote" <${process.env.GMAIL_USER}>`,
    to,
    subject: `Time for your breathing exercise (${time})`,
    text,
    html,
  });
}
