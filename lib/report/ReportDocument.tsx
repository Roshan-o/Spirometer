/**
 * lib/report/ReportDocument.tsx
 *
 * The downloadable "Breathing Progress Report" (A4 PDF) a patient can show their doctor.
 * Rendered on the server with @react-pdf/renderer from the numbers in ./data.ts.
 */

import { Circle, Document, G, Line, Page, Path, Rect, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import { LEVEL_NAMES, levelFor, type ReportData } from "./data";

const C = {
  ink: "#10264a",
  muted: "#5b6d86",
  faint: "#8b98aa",
  line: "#e3eaf4",
  blue: "#1763df",
  mint: "#10a88a",
  target: "#d6455d",
};
/** Level colours match the three balls on the exercise screen; Warm-up is grey. */
const LEVEL_COLORS = ["#a3b1c4", "#1E73E8", "#2EB84B", "#F59E0B"];
const LEVEL_TINTS = ["#f8fafc", "#f2f7fe", "#f1faf3", "#fff9ee"];

const PAGE_W = 595.28;
const MARGIN = 30;
const CONTENT_W = PAGE_W - MARGIN * 2;

const s = StyleSheet.create({
  page: { paddingTop: MARGIN, paddingHorizontal: MARGIN, paddingBottom: 48, fontFamily: "Helvetica", fontSize: 9, color: C.ink, backgroundColor: "#ffffff" },
  bold: { fontFamily: "Helvetica-Bold" },
  card: { borderWidth: 1, borderColor: C.line, borderRadius: 6, padding: 13, marginBottom: 12 },
  cardTitle: { fontFamily: "Helvetica-Bold", fontSize: 11, marginBottom: 2 },
  cardSub: { fontSize: 8, color: C.faint, marginBottom: 10 },
  row: { flexDirection: "row" },
  footer: { position: "absolute", bottom: 20, left: MARGIN, right: MARGIN, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: C.faint, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 6 },
});

function duration(seconds: number) {
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  return m ? `${m}m ${total % 60}s` : `${total}s`;
}

function Header({ data }: { data: ReportData }) {
  const details = [
    ["Patient", data.patient.name],
    ["Email", data.patient.email],
    ["Period", `${data.period.label}  (${data.period.range})`],
    ["Generated", data.generated],
  ];
  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: C.blue }}>
        <View>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <Svg width={30} height={10} style={{ marginRight: 5 }}>
              <Circle cx={5} cy={5} r={4} fill={LEVEL_COLORS[1]} />
              <Circle cx={15} cy={5} r={4} fill={LEVEL_COLORS[2]} />
              <Circle cx={25} cy={5} r={4} fill={LEVEL_COLORS[3]} />
            </Svg>
            <Text style={[s.bold, { fontSize: 11, color: C.ink }]}>Breath<Text style={{ color: C.mint }}>Note</Text></Text>
          </View>
          <Text style={[s.bold, { fontSize: 19, color: C.ink }]}>Breathing Progress Report</Text>
          <Text style={{ fontSize: 8.5, color: C.muted, marginTop: 3 }}>Home incentive-spirometer practice log</Text>
        </View>
        <View>
          {details.map(([label, value]) => (
            <View key={label} style={{ flexDirection: "row", marginBottom: 2.5 }}>
              <Text style={{ width: 50, fontSize: 7.5, color: C.faint }}>{label}</Text>
              <Text style={[label === "Patient" ? s.bold : {}, { fontSize: 8, color: C.ink }]}>{value}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function Tile({ label, value, unit, sub, met, valueColor, progress }: { label: string; value: string; unit?: string; sub: string; met?: boolean; valueColor?: string; progress?: number }) {
  return (
    <View style={{ width: (CONTENT_W - 16) / 3, borderWidth: 1, borderColor: C.line, borderRadius: 6, padding: 10 }}>
      <Text style={{ fontSize: 7, color: C.faint, textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: 4 }}>
        <Text style={[s.bold, { fontSize: 17, color: valueColor ?? C.ink }]}>{value}</Text>
        {unit ? <Text style={{ fontSize: 8.5, color: C.muted, marginLeft: 3, marginBottom: 2.5 }}>{unit}</Text> : null}
      </View>
      {progress !== undefined && (
        <View style={{ height: 3, backgroundColor: "#edf1f6", borderRadius: 2, marginTop: 6 }}>
          <View style={{ height: 3, width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%`, backgroundColor: C.blue, borderRadius: 2 }} />
        </View>
      )}
      <Text style={{ fontSize: 7.5, color: C.muted, marginTop: 5 }}>
        {sub}{met ? <Text style={[s.bold, { color: C.mint }]}>{"   Target met"}</Text> : null}
      </Text>
    </View>
  );
}

function SummaryTiles({ data }: { data: ReportData }) {
  const { summary: m, targets: t, period } = data;
  const level = levelFor(m.bestPeak, t);
  return (
    <View style={{ marginBottom: 12, gap: 8 }}>
      <View style={[s.row, { gap: 8 }]}>
        <Tile label="Sessions" value={String(m.sessions)} sub={`${m.totalReps} breaths in total`} />
        <Tile label="Days practised" value={`${m.daysPractised}`} unit={`of ${period.totalDays}`} sub={`${Math.round(m.adherence * 100)}% of days in this period`} progress={m.adherence} />
        <Tile label="Avg session time" value={m.sessions ? duration(m.avgSessionSeconds) : "-"} sub="Average length of one session" />
      </View>
      <View style={[s.row, { gap: 8 }]}>
        <Tile label="Best peak pressure" value={m.sessions ? m.bestPeak.toFixed(2) : "-"} unit={m.sessions ? "kPa" : undefined} sub={`Target ${t.targetPeak.toFixed(1)} kPa`} met={m.sessions > 0 && m.bestPeak >= t.targetPeak} progress={m.bestPeak / t.targetPeak} />
        <Tile label="Longest hold" value={m.sessions ? m.longestHold.toFixed(1) : "-"} unit={m.sessions ? "s" : undefined} sub={`Target ${t.targetHold} s`} met={m.sessions > 0 && m.longestHold >= t.targetHold} progress={m.longestHold / t.targetHold} />
        <Tile label="Highest level" value={m.sessions ? LEVEL_NAMES[level] : "-"} valueColor={m.sessions && level ? LEVEL_COLORS[level] : undefined} sub={`Easy ${t.easy} / Medium ${t.medium} / Hard ${t.hard} kPa`} />
      </View>
    </View>
  );
}

function Highlights({ data }: { data: ReportData }) {
  return (
    <View style={s.card} wrap={false}>
      <Text style={s.cardTitle}>Summary</Text>
      <View style={{ marginTop: 6, gap: 4 }}>
        {data.highlights.map((text, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: C.blue, marginTop: 4, marginRight: 7 }} />
            <Text style={{ fontSize: 9, color: "#304563", flex: 1, lineHeight: 1.35 }}>{text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function PressureChart({ data }: { data: ReportData }) {
  const { chart, targets: t } = data;
  const W = CONTENT_W - 30;
  const H = 170;
  const padL = 26, padR = 46, padT = 8, padB = 18;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const maxY = Math.ceil(Math.max(t.hard + 0.75, data.summary.bestPeak * 1.1, t.targetPeak + 0.5));
  const x = (i: number) => padL + (chart.length <= 1 ? plotW / 2 : (i / (chart.length - 1)) * plotW);
  const y = (v: number) => padT + plotH - (v / maxY) * plotH;
  const points = chart.filter((p) => p.peak !== null) as { index: number; peak: number; label: string }[];
  const linePath = points.map((p, i) => `${i ? "L" : "M"}${x(p.index).toFixed(1)},${y(p.peak).toFixed(1)}`).join(" ");
  const areaPath = points.length > 1 ? `${linePath} L${x(points[points.length - 1].index).toFixed(1)},${y(0)} L${x(points[0].index).toFixed(1)},${y(0)} Z` : "";
  const bands = [[0, t.easy, 0], [t.easy, t.medium, 1], [t.medium, t.hard, 2], [t.hard, maxY, 3]] as const;
  const labelEvery = Math.max(1, Math.ceil(chart.length / 7));

  return (
    <View style={s.card} wrap={false}>
      <Text style={s.cardTitle}>Peak breath pressure per day</Text>
      <Text style={s.cardSub}>Highest pressure reached each practice day. Coloured bands show the Easy, Medium and Hard levels; the dashed line is the target.</Text>
      <Svg width={W} height={H}>
        {bands.map(([from, to, level]) => (
          <Rect key={level} x={padL} y={y(to)} width={plotW} height={y(from) - y(to)} fill={LEVEL_TINTS[level]} />
        ))}
        {Array.from({ length: maxY + 1 }, (_, v) => (
          <G key={v}>
            <Line x1={padL} x2={padL + plotW} y1={y(v)} y2={y(v)} stroke="#ffffff" strokeWidth={0.8} />
            <Text x={padL - 6} y={y(v) + 2.5} style={{ fontSize: 7 }} fill={C.faint} textAnchor="end">{String(v)}</Text>
          </G>
        ))}
        {bands.slice(1).map(([from, to, level]) => (
          <Text key={level} x={padL + plotW + 6} y={(y(from) + y(to)) / 2 + 2.5} style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold" }} fill={LEVEL_COLORS[level]}>{LEVEL_NAMES[level]}</Text>
        ))}
        <Line x1={padL} x2={padL + plotW} y1={y(t.targetPeak)} y2={y(t.targetPeak)} stroke={C.target} strokeWidth={1.2} strokeDasharray="4,3" />
        <Text x={padL + 4} y={y(t.targetPeak) - 3} style={{ fontSize: 7 }} fill={C.target}>{`Target ${t.targetPeak.toFixed(1)} kPa`}</Text>
        {areaPath ? <Path d={areaPath} fill={C.blue} fillOpacity={0.08} /> : null}
        {points.length > 1 ? <Path d={linePath} stroke={C.blue} strokeWidth={1.8} fill="none" /> : null}
        {points.map((p) => (
          <Circle key={p.index} cx={x(p.index)} cy={y(p.peak)} r={3} fill={LEVEL_COLORS[levelFor(p.peak, t)]} stroke="#ffffff" strokeWidth={1} />
        ))}
        {chart.map((p) => (p.index % labelEvery === 0 || p.index === chart.length - 1) && (chart.length - 1 - p.index >= labelEvery / 2 || p.index === chart.length - 1) ? (
          <Text key={p.key} x={x(p.index)} y={H - 4} style={{ fontSize: 7 }} fill={C.faint} textAnchor={chart.length > 1 && p.index === chart.length - 1 ? "end" : chart.length > 1 && p.index === 0 ? "start" : "middle"}>{p.label}</Text>
        ) : null)}
        <Text x={2} y={padT + 4} style={{ fontSize: 6.5 }} fill={C.faint}>kPa</Text>
      </Svg>
    </View>
  );
}

function LevelsBar({ data }: { data: ReportData }) {
  const total = data.levelCounts.reduce((a, b) => a + b, 0);
  const t = data.targets;
  const ranges = [`below ${t.easy} kPa`, `${t.easy} - ${t.medium} kPa`, `${t.medium} - ${t.hard} kPa`, `${t.hard}+ kPa`];
  return (
    <View style={s.card} wrap={false}>
      <Text style={s.cardTitle}>Highest level reached per session</Text>
      <Text style={s.cardSub}>Each session counted once, by the highest pressure level it reached.</Text>
      <View style={{ flexDirection: "row", height: 16, borderRadius: 8, overflow: "hidden", backgroundColor: "#f3f6fa" }}>
        {data.levelCounts.map((count, level) => count ? <View key={level} style={{ width: `${(count / total) * 100}%`, backgroundColor: LEVEL_COLORS[level] }} /> : null)}
      </View>
      <View style={{ flexDirection: "row", marginTop: 9 }}>
        {[3, 2, 1, 0].map((level) => (
          <View key={level} style={{ flex: 1, flexDirection: "row", alignItems: "flex-start" }}>
            <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: LEVEL_COLORS[level], marginRight: 5, marginTop: 1 }} />
            <View>
              <Text style={[s.bold, { fontSize: 9 }]}>{LEVEL_NAMES[level]}  <Text style={{ color: LEVEL_COLORS[level] }}>{data.levelCounts[level]}</Text><Text style={{ fontFamily: "Helvetica", color: C.faint }}>{total ? `  (${Math.round((data.levelCounts[level] / total) * 100)}%)` : ""}</Text></Text>
              <Text style={{ fontSize: 7, color: C.faint, marginTop: 1 }}>{ranges[level]}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function Consistency({ data }: { data: ReportData }) {
  const { weeks, trimmed } = data.calendar;
  const colour = (count: number, inPeriod: boolean) => !inPeriod ? "#ffffff" : count === 0 ? "#e8edf4" : count === 1 ? "#9fe0c4" : C.mint;
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const W = CONTENT_W - 30;
  const compact = weeks.length > 6;
  const gap = compact ? 2 : 4;
  const labelW = compact ? 24 : 0;
  const cell = compact ? Math.min(13, (W - labelW) / weeks.length - gap) : Math.min(30, (W - 6 * gap) / 7 - 20);
  const H = compact ? 7 * (cell + gap) + 12 : weeks.length * (cell + gap) + 12;

  return (
    <View style={s.card} wrap={false}>
      <Text style={s.cardTitle}>Practice consistency</Text>
      <Text style={s.cardSub}>{`Each square is one day${trimmed ? " (latest 12 months shown)" : ""}.`}</Text>
      <Svg width={W} height={H}>
        {compact ? (
          <G>
            {days.map((d, r) => r % 2 === 0 ? <Text key={d} x={0} y={r * (cell + gap) + cell - 2} style={{ fontSize: 6.5 }} fill={C.faint}>{d}</Text> : null)}
            {/* Weeks always run Monday to Sunday (see data.ts), so the row is the index in the week. */}
            {weeks.map((week, c) => week.map((day, r) => (
              <Rect key={day.key} x={labelW + c * (cell + gap)} y={r * (cell + gap)} width={cell} height={cell} rx={2} fill={colour(day.count, day.inPeriod)} />
            )))}
          </G>
        ) : (
          <G>
            {days.map((d, i) => <Text key={d} x={i * (cell + 20 + gap) + (cell + 20) / 2} y={8} style={{ fontSize: 7 }} fill={C.faint} textAnchor="middle">{d}</Text>)}
            {weeks.map((week, r) => week.map((day, i) => (
              <G key={day.key}>
                <Rect x={i * (cell + 20 + gap)} y={12 + r * (cell + gap)} width={cell + 20} height={cell} rx={6} fill={colour(day.count, day.inPeriod)} />
                {day.inPeriod ? <Text x={i * (cell + 20 + gap) + (cell + 20) / 2} y={12 + r * (cell + gap) + cell / 2 + 3} style={{ fontSize: 8 }} fill={day.count ? "#ffffff" : C.faint} textAnchor="middle">{String(Number(day.key.slice(8)))}</Text> : null}
              </G>
            )))}
          </G>
        )}
      </Svg>
      <View style={{ flexDirection: "row", gap: 14, marginTop: 8 }}>
        {[["No session", "#e8edf4"], ["1 session", "#9fe0c4"], ["2+ sessions", C.mint]].map(([label, fill]) => (
          <View key={label} style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: fill, marginRight: 4 }} />
            <Text style={{ fontSize: 7.5, color: C.muted }}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const COLS = [
  { label: "Date", width: 104 },
  { label: "Time", width: 56 },
  { label: "Duration", width: 58 },
  { label: "Peak pressure", width: 76 },
  { label: "Level", width: 68 },
  { label: "Longest hold", width: 70 },
  { label: "Breaths", width: CONTENT_W - 104 - 56 - 58 - 76 - 68 - 70 },
];

function SessionTable({ data }: { data: ReportData }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[s.cardTitle, { marginBottom: 2 }]}>Session log</Text>
      <Text style={s.cardSub}>{`All ${data.sessions.length} session${data.sessions.length === 1 ? "" : "s"} in this period, newest first.`}</Text>
      <View style={{ flexDirection: "row", backgroundColor: "#f3f6fa", borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.line, paddingVertical: 6 }} fixed>
        {COLS.map((c) => <Text key={c.label} style={[s.bold, { width: c.width, paddingHorizontal: 7, fontSize: 7.5, color: C.muted }]}>{c.label}</Text>)}
      </View>
      {data.sessions.map((row, i) => (
        <View key={i} wrap={false} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 5, backgroundColor: "#ffffff", borderBottomWidth: 0.5, borderBottomColor: C.line }}>
          <Text style={[s.bold, { width: COLS[0].width, paddingHorizontal: 7, fontSize: 8 }]}>{row.date}</Text>
          <Text style={{ width: COLS[1].width, paddingHorizontal: 7, fontSize: 8, color: C.muted }}>{row.time}</Text>
          <Text style={{ width: COLS[2].width, paddingHorizontal: 7, fontSize: 8 }}>{duration(row.durationSeconds)}</Text>
          <Text style={{ width: COLS[3].width, paddingHorizontal: 7, fontSize: 8 }}><Text style={s.bold}>{row.peak.toFixed(2)}</Text> kPa</Text>
          <View style={{ width: COLS[4].width, paddingHorizontal: 7 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}><View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: LEVEL_COLORS[row.level], marginRight: 4 }} /><Text style={{ fontSize: 8 }}>{LEVEL_NAMES[row.level]}</Text></View>
          </View>
          <Text style={{ width: COLS[5].width, paddingHorizontal: 7, fontSize: 8 }}>{row.holdSeconds.toFixed(1)} s</Text>
          <Text style={{ width: COLS[6].width, paddingHorizontal: 7, fontSize: 8 }}>{row.repetitions}</Text>
        </View>
      ))}
    </View>
  );
}

function HowToRead({ data }: { data: ReportData }) {
  const t = data.targets;
  const items = [
    ["Peak pressure (kPa)", "Breath pressure at the spirometer mouthpiece while breathing in, in kilopascals. Higher means a stronger, deeper breath."],
    ["Levels", `Easy from ${t.easy} kPa, Medium from ${t.medium} kPa, Hard from ${t.hard} kPa. Below Easy is a warm-up breath.`],
    ["Longest hold", "The longest time a single breath was held steadily at one level."],
    ["Breaths (repetitions)", "Separate breaths taken during a session."],
  ];
  return (
    <View style={s.card} wrap={false}>
      <Text style={s.cardTitle}>How to read this report</Text>
      <View style={{ marginTop: 6, gap: 4 }}>
        {items.map(([term, text]) => (
          <View key={term} style={{ flexDirection: "row" }}>
            <Text style={[s.bold, { width: 110, fontSize: 8 }]}>{term}</Text>
            <Text style={{ flex: 1, fontSize: 8, color: C.muted, lineHeight: 1.3 }}>{text}</Text>
          </View>
        ))}
      </View>
      <Text style={{ fontSize: 7.5, color: C.faint, marginTop: 9, lineHeight: 1.3 }}>
        Measurements are self-recorded at home with the BreathNote smart incentive spirometer. This report is a practice log to support a conversation with a clinician; it is not a diagnosis or a clinical lung-function test.
      </Text>
    </View>
  );
}

export default function ReportDocument({ data }: { data: ReportData }) {
  const empty = data.sessions.length === 0;
  return (
    <Document title={`BreathNote Progress Report - ${data.patient.name}`} author="BreathNote" subject={`Breathing practice ${data.period.label.toLowerCase()}`}>
      <Page size="A4" style={s.page}>
        <Header data={data} />
        <SummaryTiles data={data} />
        {empty ? (
          <View style={[s.card, { alignItems: "center", paddingVertical: 28 }]}>
            <Text style={[s.bold, { fontSize: 13 }]}>No sessions recorded in this period</Text>
            <Text style={{ fontSize: 9, color: C.muted, marginTop: 5 }}>Choose a longer period, or complete a breathing session and download again.</Text>
          </View>
        ) : (
          <>
            <Highlights data={data} />
            <PressureChart data={data} />
            <LevelsBar data={data} />
            <Consistency data={data} />
            <SessionTable data={data} />
          </>
        )}
        <HowToRead data={data} />
        <View style={s.footer} fixed>
          <Text>{`BreathNote  |  Breathing Progress Report  |  ${data.patient.name}  |  ${data.period.range}`}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
