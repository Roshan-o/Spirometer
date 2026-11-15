"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, CalendarRange, Download, History, Loader2, X } from "lucide-react";

const PERIODS = [
  { value: "week", label: "1 Week", detail: "Last 7 days", icon: CalendarDays, color: "#1763df", tint: "#eef4ff" },
  { value: "month", label: "1 Month", detail: "Last 30 days", icon: CalendarRange, color: "#10a88a", tint: "#e9faf5" },
  { value: "6months", label: "6 Months", detail: "Last 6 months", icon: CalendarRange, color: "#f59e0b", tint: "#fff6e6" },
  { value: "all", label: "All Time", detail: "Every saved session", icon: History, color: "#7c5cff", tint: "#f3f0ff" },
] as const;

export default function DownloadReportButton() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) setOpen(false); };
    window.addEventListener("keydown", onKey);
    dialogRef.current?.querySelector("button")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy]);

  const download = async (period: string) => {
    setBusy(period);
    setError("");
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await fetch(`/api/report?period=${period}&tz=${encodeURIComponent(tz)}`);
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? "Couldn't create the report.");
      const blob = await response.blob();
      const name = /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") ?? "")?.[1] ?? "BreathNote_Report.pdf";
      const url = URL.createObjectURL(blob);
      const link = Object.assign(document.createElement("a"), { href: url, download: name });
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create the report.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <button onClick={() => { setOpen(true); setError(""); }} className="flex items-center gap-2 rounded-xl border border-[#d8e5fa] bg-white px-3 py-2 text-[13px] font-semibold text-[#1763df] shadow-sm hover:bg-[#f4f8ff]">
        <Download size={14}/>Download Report
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#10264a]/40 p-4" onClick={() => !busy && setOpen(false)}>
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="report-title" onClick={(e) => e.stopPropagation()} className="w-full max-w-[420px] rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="report-title" className="text-[18px] font-bold text-[#10264a]">Download progress report</h2>
                <p className="mt-0.5 text-[13px] text-[#6b7e9d]">A PDF of your breathing practice to share with your doctor. Which period should it cover?</p>
              </div>
              <button aria-label="Close" disabled={!!busy} onClick={() => setOpen(false)} className="rounded-md p-1 text-[#8b98aa] hover:bg-[#f3f7fd]"><X size={16}/></button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {PERIODS.map(({ value, label, detail, icon: Icon, color, tint }) => (
                <button key={value} disabled={!!busy} onClick={() => download(value)} style={{ backgroundColor: tint }} className="flex flex-col items-start gap-1.5 rounded-xl border border-transparent p-3 text-left transition hover:border-current disabled:opacity-60">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-white" style={{ color }}>{busy === value ? <Loader2 size={15} className="animate-spin"/> : <Icon size={15}/>}</span>
                  <span className="text-[15px] font-bold" style={{ color }}>{label}</span>
                  <span className="text-[12px] text-[#6b7e9d]">{busy === value ? "Preparing PDF…" : detail}</span>
                </button>
              ))}
            </div>

            {error && <p role="alert" className="mt-3 text-[13px] text-[#d14343]">{error}</p>}
          </div>
        </div>
      )}
    </>
  );
}
