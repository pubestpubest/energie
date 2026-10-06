import { CalendarClock, Coins, Gauge, TrendingUp } from "lucide-react";
import type { MonthStats } from "@/lib/calc";
import { baht, kwh, shortDate } from "@/lib/format";

export function ForecastCard({ stats }: { stats: MonthStats }) {
  const { forecastKwh, forecastCost, usedKwh, basis } = stats;
  const progress = forecastKwh ? Math.min(100, (usedKwh / forecastKwh) * 100) : 0;

  return (
    <section className="relative overflow-hidden rounded-2xl bg-slate-900 p-5 text-white shadow-sm">
      <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-emerald-500/20 blur-2xl" />
      <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-emerald-300">
        <TrendingUp className="size-4" /> คาดการณ์ {stats.monthLabel}
      </p>

      {forecastKwh == null || forecastCost == null ? (
        <p className="mt-3 text-base text-slate-300">
          จดเลขมิเตอร์อย่างน้อย 2 ครั้ง ห่างกันสักสองสามวัน แล้วระบบจะคาดการณ์ค่าไฟเดือนนี้ให้
        </p>
      ) : (
        <>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-300">
            ถ้าใช้ไฟในอัตรานี้ต่อไป ค่าไฟเดือนนี้จะอยู่ที่ประมาณ{" "}
            <span className="font-semibold text-white">{baht(forecastCost)}</span>{" "}
            <span className="text-slate-400">({kwh(forecastKwh, 0)} หน่วย)</span>
          </p>
          <p className="mt-4 text-4xl font-semibold tracking-tight tabular-nums">{baht(forecastCost)}</p>

          <div className="mt-5">
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-emerald-400" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-xs text-slate-400">
              <span>
                ใช้ไปแล้ว {kwh(usedKwh)} หน่วย
              </span>
              <span>คาดว่า {kwh(forecastKwh, 0)} หน่วย</span>
            </div>
          </div>

          {basis === "recent" && (
            <p className="mt-3 text-xs text-slate-400">
              ยังไม่ได้จดเลขเดือนนี้ — คาดการณ์จากอัตราการใช้ล่าสุด
            </p>
          )}
        </>
      )}
    </section>
  );
}

export function StatTiles({ stats, rate }: { stats: MonthStats; rate: number }) {
  const since = stats.since
    ? `ตั้งแต่ ${shortDate(stats.since.date)}`
    : "ยังไม่มีข้อมูล";
  const tiles = [
    { icon: Gauge, label: "เดือนนี้", value: kwh(stats.usedKwh), unit: "หน่วย", hint: since },
    { icon: Coins, label: "ค่าไฟถึงตอนนี้", value: baht(stats.usedCost), unit: "", hint: since },
    {
      icon: CalendarClock,
      label: "เฉลี่ยต่อวัน",
      value: stats.avgDaily == null ? "—" : kwh(stats.avgDaily),
      unit: stats.avgDaily == null ? "" : "หน่วย",
      hint: stats.avgDaily == null ? "ต้องจดอย่างน้อย 2 ครั้ง" : `≈ ${baht(stats.avgDaily * rate, 1)}/วัน`,
    },
  ];

  return (
    <section className="grid grid-cols-3 gap-3">
      {tiles.map(({ icon: Icon, label, value, unit, hint }) => (
        <div key={label} className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs sm:p-4">
          <p className="flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-slate-500 sm:text-xs">
            <Icon className="hidden size-3.5 shrink-0 text-slate-400 sm:block" />
            <span className="truncate">{label}</span>
          </p>
          <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">
            {value}
            {unit && <span className="ml-1 text-xs font-medium text-slate-400">{unit}</span>}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-slate-400">{hint}</p>
        </div>
      ))}
    </section>
  );
}
