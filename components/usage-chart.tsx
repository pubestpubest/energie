"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, ChartColumn, ChartLine, ChevronLeft, ChevronRight, Sigma } from "lucide-react";
import { daySeries, type MonthBar, type Point } from "@/lib/calc";
import { baht, kwh, monthYear, shortDate } from "@/lib/format";

const SERIES = "#059669"; // emerald-600, validated against the light surface
const INK_MUTED = "#94a3b8";
const GRID = "#eef2f6";
const PREFS_KEY = "energie.chart";

type View = "days" | "months";
type Metric = "kwh" | "cost";
type Mark = "bar" | "line";
type Prefs = { view: View; metric: Metric; mark: Mark; cumulative: boolean };
const DEFAULTS: Prefs = { view: "days", metric: "kwh", mark: "line", cumulative: true };

type Datum = {
  label: string;
  title: string;
  value: number | null;
  projected?: number | null;
  note?: string;
  faded?: boolean;
};

type Props = { points: Point[]; months: MonthBar[]; rate: number; today: string };

export function UsageChart({ points, months, rate, today }: Props) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const currentKey = today.slice(0, 7);
  const monthKeys = useMemo(() => {
    const keys = months.map((m) => m.key);
    return keys.includes(currentKey) ? keys : [...keys, currentKey];
  }, [months, currentKey]);
  const [monthKey, setMonthKey] = useState(currentKey);

  // Remember chart preferences per device (read after mount to avoid a hydration mismatch).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "null");
      if (saved) setPrefs({ ...DEFAULTS, ...saved });
    } catch {}
  }, []);
  function update(patch: Partial<Prefs>) {
    setPrefs((p) => {
      const next = { ...p, ...patch };
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  const { view, metric, mark, cumulative } = prefs;
  const m = (v: number | null | undefined) => (v == null ? null : metric === "kwh" ? v : v * rate);
  const fmt = (v: number) => (metric === "kwh" ? `${kwh(v)} หน่วย` : baht(v, !cumulative && view === "days" ? 1 : 0));

  const data: Datum[] = useMemo(() => {
    if (view === "months") {
      let running = 0;
      return months.slice(-12).map((mo) => {
        running += mo.kwh;
        return {
          label: mo.label,
          title: mo.label,
          value: m(cumulative ? running : mo.kwh),
          faded: !cumulative && mo.partial,
          note: cumulative ? "ยอดสะสม" : mo.partial ? "ข้อมูลไม่ครบเดือน" : undefined,
        };
      });
    }
    return daySeries(points, monthKey, rate, today).map((d) => ({
      label: d.label,
      title: shortDate(d.date),
      value: m(cumulative ? d.cumulative : d.daily),
      projected: cumulative ? m(d.projected) : null,
      note: cumulative
        ? d.estimated
          ? "ประมาณจากบันทึกก่อน–หลัง"
          : undefined
        : d.spanDays
          ? `เฉลี่ยจาก ${d.spanDays} วัน`
          : undefined,
    }));
  }, [view, metric, cumulative, months, points, monthKey, rate, today]);

  const hasData = data.some((d) => d.value != null);
  const unitLabel = metric === "kwh" ? "หน่วย" : "บาท";
  const subtitle =
    view === "months"
      ? cumulative ? `${unitLabel} (สะสม)` : `${unitLabel} ต่อเดือน`
      : cumulative ? `${unitLabel} สะสมในเดือนนี้` : `${unitLabel} ต่อวัน`;

  const monthIdx = monthKeys.indexOf(monthKey);
  const monthTitle = monthYear(monthKey);
  const dayTicks = view === "days" ? ["1", "5", "10", "15", "20", "25", String(data.length)] : undefined;
  const todayLabel = view === "days" && mark === "line" && today.startsWith(monthKey) ? String(Number(today.slice(8))) : null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <BarChart3 className="size-4 text-slate-400" /> การใช้ไฟ
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        </div>
        <Segmented value={metric} onChange={(v) => update({ metric: v })} options={[["kwh", "หน่วย"], ["cost", "฿"]]} label="หน่วยที่แสดง" />
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Segmented value={view} onChange={(v) => update({ view: v })} options={[["days", "รายวัน"], ["months", "รายเดือน"]]} label="ช่วงเวลา" />
        <div className="flex-1" />
        <Segmented
          value={mark}
          onChange={(v) => update({ mark: v })}
          label="รูปแบบกราฟ"
          options={[
            ["bar", <ChartColumn key="b" className="size-4" aria-label="กราฟแท่ง" />],
            ["line", <ChartLine key="l" className="size-4" aria-label="กราฟเส้น" />],
          ]}
        />
        <button
          type="button"
          aria-pressed={cumulative}
          aria-label="ยอดสะสม"
          title="ยอดสะสม"
          onClick={() => update({ cumulative: !cumulative })}
          className={`flex h-10 w-10 items-center justify-center rounded-lg border transition ${
            cumulative
              ? "border-emerald-600 bg-emerald-50 text-emerald-700"
              : "border-slate-200 text-slate-500 hover:text-slate-700"
          }`}
        >
          <Sigma className="size-4" />
        </button>
      </div>

      {view === "days" && (
        <div className="mt-3 flex items-center gap-1">
          <NavButton disabled={monthIdx <= 0} onClick={() => setMonthKey(monthKeys[monthIdx - 1])} label="เดือนก่อน">
            <ChevronLeft className="size-4" />
          </NavButton>
          <span className="min-w-28 text-center text-sm font-medium text-slate-700">{monthTitle}</span>
          <NavButton
            disabled={monthIdx >= monthKeys.length - 1}
            onClick={() => setMonthKey(monthKeys[monthIdx + 1])}
            label="เดือนถัดไป"
          >
            <ChevronRight className="size-4" />
          </NavButton>
        </div>
      )}

      {!hasData ? (
        <div className="mt-4 flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-200 px-6 text-center text-sm text-slate-500">
          {points.length < 2 ? "จดเลขมิเตอร์อย่างน้อย 2 ครั้งเพื่อดูแนวโน้ม" : "ไม่มีบันทึกในเดือนนี้"}
        </div>
      ) : (
        <div className="mt-4 h-56 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }} barCategoryGap="22%">
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: INK_MUTED, fontSize: 11 }}
                ticks={dayTicks}
                interval={view === "days" ? 0 : "preserveStartEnd"}
                minTickGap={view === "days" ? 0 : 12}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: INK_MUTED, fontSize: 11 }}
                width={44}
                tickFormatter={(v: number) => (metric === "cost" ? `฿${compact(v)}` : compact(v))}
              />
              {todayLabel && (
                <ReferenceLine
                  x={todayLabel}
                  stroke="#cbd5e1"
                  strokeDasharray="3 3"
                  label={{ value: "วันนี้", position: "insideTopRight", fill: INK_MUTED, fontSize: 10 }}
                />
              )}
              <Tooltip
                cursor={mark === "bar" ? { fill: "#f1f5f9" } : { stroke: "#cbd5e1" }}
                content={({ active, payload }) => {
                  const d = payload?.[0]?.payload as Datum | undefined;
                  if (!active || !d || (d.value == null && d.projected == null)) return null;
                  return (
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
                      <p className="font-medium text-slate-500">{d.title}</p>
                      {d.value != null && (
                        <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">
                          {fmt(d.value)}
                          {view === "days" && !cumulative && <span className="font-normal text-slate-500">/วัน</span>}
                        </p>
                      )}
                      {d.projected != null && d.value == null && (
                        <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">
                          {fmt(d.projected)} <span className="font-normal text-slate-500">คาดการณ์</span>
                        </p>
                      )}
                      {d.note && <p className="mt-0.5 text-slate-400">{d.note}</p>}
                    </div>
                  );
                }}
              />
              {mark === "bar" ? (
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={32} isAnimationActive={false}>
                  {data.map((d, i) => (
                    <Cell key={i} fill={SERIES} fillOpacity={d.faded ? 0.45 : 1} />
                  ))}
                </Bar>
              ) : (
                <Line
                  dataKey="value"
                  type="linear"
                  stroke={SERIES}
                  strokeWidth={2}
                  connectNulls
                  dot={{ r: 3, fill: SERIES, stroke: "#fff", strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: SERIES, stroke: "#fff", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              )}
              {view === "days" && cumulative && (
                <Line
                  dataKey="projected"
                  type="linear"
                  stroke={SERIES}
                  strokeOpacity={0.55}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  connectNulls
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      <p className="mt-2 min-h-4 text-xs text-slate-400">
        {view === "days" && cumulative && data.some((d) => d.projected != null)
          ? "เส้นประ: คาดการณ์ถึงสิ้นเดือนตามอัตราการใช้ปัจจุบัน"
          : view === "days"
            ? mark === "line"
              ? "แสดงเฉพาะวันที่มีการจด เส้นจะเชื่อมช่วงที่ไม่มีข้อมูลให้"
              : "แต่ละแท่งคือค่าเฉลี่ยต่อวันนับจากการจดครั้งก่อน"
            : !cumulative && data.some((d) => d.faded)
              ? "แท่งสีอ่อนคือเดือนที่มีข้อมูลไม่ครบ"
              : ""}
      </p>
    </section>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: [T, React.ReactNode][];
  label: string;
}) {
  return (
    <div className="inline-flex shrink-0 rounded-lg bg-slate-100 p-0.5" role="radiogroup" aria-label={label}>
      {options.map(([v, content]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`flex h-9 min-w-9 items-center justify-center rounded-md px-2.5 text-xs font-medium transition ${
            value === v ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {content}
        </button>
      ))}
    </div>
  );
}

function NavButton({
  children,
  disabled,
  onClick,
  label,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

function compact(n: number) {
  return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}
