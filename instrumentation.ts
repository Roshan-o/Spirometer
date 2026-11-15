// Runs once when the Next.js server starts.
export async function register() {
  // The scheduler needs Node.js (database + SMTP); skip the Edge runtime.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startReminderScheduler } = await import("./lib/reminders");
    startReminderScheduler();
  }
}
