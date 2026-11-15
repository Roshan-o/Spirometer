"use client";

import { useState, useTransition } from "react";
import { Bell, Mail, Plus, Trash2 } from "lucide-react";
import { addReminder, deleteReminder, sendTestReminder, setReminderEnabled } from "../actions/reminders";

export type ReminderRow = { id: string; hour: number; minute: number; days: number[]; enabled: boolean };

/** Display order Mon → Sun; values are JS weekdays (0 = Sunday). */
const DAYS = [
  { value: 1, short: "M", label: "Mon" },
  { value: 2, short: "T", label: "Tue" },
  { value: 3, short: "W", label: "Wed" },
  { value: 4, short: "T", label: "Thu" },
  { value: 5, short: "F", label: "Fri" },
  { value: 6, short: "S", label: "Sat" },
  { value: 0, short: "S", label: "Sun" },
];
const ALL_DAYS = DAYS.map((d) => d.value);
const WEEKDAYS = [1, 2, 3, 4, 5];

function timeLabel(hour: number, minute: number) {
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}

function daysLabel(days: number[]) {
  if (days.length === 7) return "Every day";
  if (days.length === 5 && WEEKDAYS.every((d) => days.includes(d))) return "Weekdays";
  if (days.length === 2 && days.includes(0) && days.includes(6)) return "Weekends";
  return DAYS.filter((d) => days.includes(d.value)).map((d) => d.label).join(", ");
}

const selectClass = "rounded-md border border-[#dfe7f2] bg-white px-1.5 py-1 text-[11px] text-[#304563] focus:border-[#1763df] focus:outline-none";

export default function RemindersCard({ reminders }: { reminders: ReminderRow[] }) {
  const [adding, setAdding] = useState(false);
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState<"AM" | "PM">("AM");
  const [days, setDays] = useState<number[]>(ALL_DAYS);
  const [message, setMessage] = useState<{ tone: "error" | "ok"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<{ error?: string } & Record<string, unknown>>, onSuccess?: (result: Record<string, unknown>) => void) =>
    startTransition(async () => {
      setMessage(null);
      const result = await action();
      if (result.error) setMessage({ tone: "error", text: result.error });
      else onSuccess?.(result);
    });

  const save = () => run(
    () => addReminder({ hour, minute, period, days, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
    () => { setAdding(false); setMessage({ tone: "ok", text: `Reminder set for ${hour}:${String(minute).padStart(2, "0")} ${period}.` }); },
  );
  const toggleDay = (value: number) => setDays((current) => current.includes(value) ? current.filter((d) => d !== value) : [...current, value]);

  return (
    <div className="flex min-h-0 flex-col rounded-xl border border-[#eaf0fa] bg-white px-4 py-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-[12px] font-bold"><Bell size={13} className="text-[#1763df]"/>Reminders</h3>
        {!adding && <button onClick={() => { setAdding(true); setMessage(null); }} className="flex items-center gap-1 text-[10px] font-medium text-[#1763df] hover:underline"><Plus size={11}/>Add</button>}
      </div>

      {adding && (
        <div className="mb-2 rounded-lg border border-[#e3ecf8] bg-[#f7faff] p-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <select aria-label="Hour" value={hour} onChange={(e) => setHour(Number(e.target.value))} className={selectClass}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
            <span className="text-[12px] font-semibold text-[#536680]">:</span>
            <select aria-label="Minute" value={minute} onChange={(e) => setMinute(Number(e.target.value))} className={selectClass}>
              {Array.from({ length: 60 }, (_, m) => m).map((m) => <option key={m} value={m}>{String(m).padStart(2, "0")}</option>)}
            </select>
            <div className="ml-1 flex rounded-md bg-white p-0.5 ring-1 ring-[#dfe7f2]">
              {(["AM", "PM"] as const).map((p) => <button key={p} type="button" onClick={() => setPeriod(p)} className={`rounded px-2 py-0.5 text-[10px] font-semibold ${period === p ? "bg-[#1763df] text-white" : "text-[#6b7e9d]"}`}>{p}</button>)}
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1">
            {DAYS.map((d) => <button key={d.value} type="button" title={d.label} aria-pressed={days.includes(d.value)} onClick={() => toggleDay(d.value)} className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-semibold ${days.includes(d.value) ? "bg-[#1763df] text-white" : "bg-white text-[#78869a] ring-1 ring-[#dfe7f2]"}`}>{d.short}</button>)}
            <button type="button" onClick={() => setDays(days.length === 7 ? [] : ALL_DAYS)} className="ml-1 text-[9px] font-medium text-[#1763df] hover:underline">{days.length === 7 ? "Clear" : "Every day"}</button>
          </div>
          <div className="mt-2.5 flex gap-2">
            <button onClick={save} disabled={pending || !days.length} className="rounded-full bg-[#1763df] px-3 py-1 text-[10px] font-semibold text-white hover:bg-[#1056c8] disabled:opacity-50">{pending ? "Saving…" : "Save reminder"}</button>
            <button onClick={() => { setAdding(false); setMessage(null); }} className="rounded-full px-3 py-1 text-[10px] font-medium text-[#6b7e9d] hover:bg-white">Cancel</button>
          </div>
        </div>
      )}

      {reminders.length === 0 && !adding ? (
        <p className="py-3 text-[11px] text-[#8491a4]">No reminders yet. Add one and we&apos;ll email you when it&apos;s time to breathe.</p>
      ) : (
        <div className="max-h-[148px] divide-y divide-[#f0f3f8] overflow-y-auto">
          {reminders.map((r) => (
            <div key={r.id} className={`flex items-center gap-2 py-1.5 ${r.enabled ? "" : "opacity-50"}`}>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold text-[#304563]">{timeLabel(r.hour, r.minute)}</div>
                <div className="truncate text-[9px] text-[#96a2b3]">{daysLabel(r.days)}</div>
              </div>
              <button role="switch" aria-checked={r.enabled} aria-label={`${r.enabled ? "Turn off" : "Turn on"} ${timeLabel(r.hour, r.minute)} reminder`} disabled={pending} onClick={() => run(() => setReminderEnabled(r.id, !r.enabled))} className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${r.enabled ? "bg-[#27b978]" : "bg-[#d5dde8]"}`}>
                <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all ${r.enabled ? "left-3.5" : "left-0.5"}`}/>
              </button>
              <button aria-label={`Delete ${timeLabel(r.hour, r.minute)} reminder`} disabled={pending} onClick={() => run(() => deleteReminder(r.id))} className="rounded p-1 text-[#a3afbf] hover:bg-[#fdeeee] hover:text-[#d14343]"><Trash2 size={12}/></button>
            </div>
          ))}
        </div>
      )}

      {message && <p role="status" className={`mt-1.5 text-[10px] ${message.tone === "error" ? "text-[#d14343]" : "text-[#1f9d63]"}`}>{message.text}</p>}
      <button disabled={pending} onClick={() => run(sendTestReminder, (r) => setMessage({ tone: "ok", text: `Test email sent to ${r.email}.` }))} className="mt-auto flex items-center gap-1 self-start pt-2 text-[9px] font-medium text-[#78869a] hover:text-[#1763df]"><Mail size={10}/>Send test email</button>
    </div>
  );
}
