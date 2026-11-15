import { createElement } from "react";
import type { NextRequest } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import { getSessionUser } from "@/lib/auth";
import { isValidTimezone } from "@/lib/reminders";
import { buildReportData, isReportPeriod } from "@/lib/report/data";
import ReportDocument from "@/lib/report/ReportDocument";

/**
 * GET /api/report?period=week|month|6months|all&tz=Asia/Kolkata
 * Downloads the signed-in user's Breathing Progress Report as a PDF.
 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Please sign in again." }, { status: 401 });

  const period = request.nextUrl.searchParams.get("period") ?? "month";
  if (!isReportPeriod(period)) return Response.json({ error: "Unknown report period." }, { status: 400 });
  const tz = request.nextUrl.searchParams.get("tz") ?? "UTC";
  const timezone = isValidTimezone(tz) ? tz : "UTC";

  const data = await buildReportData(user.id, period, timezone);
  const pdf = await renderToBuffer(createElement(ReportDocument, { data }) as unknown as ReactElement<DocumentProps>);

  const safeName = user.name.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "") || "Patient";
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="BreathNote_Report_${safeName}_${date}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
