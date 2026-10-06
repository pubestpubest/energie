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
        <TrendingUp className="size-4" /> {stats.monthLabel} forecast
      </p>

      {forecastKwh == null || forecastCost == null ? (
        <p className="mt-3 text-base text-slate-300">
          Add two readings a few days apart and we&apos;ll project this month&apos;s bill.
        </p>
      ) : (
        <>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-300">
            At your current pace, your estimated bill this month will be{" "}
            <span className="font-semibold text-white">{baht(forecastCost)}</span>{" "}
            <span className="text-slate-400">({kwh(forecastKwh, 0)} kWh)</span>.
          </p>
          <p className="mt-4 text-4xl font-semibold tracking-tight tabular-nums">{baht(forecastCost)}</p>

          <div className="mt-5">
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-emerald-400" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-xs text-slate-400">
              <span>
                {kwh(usedKwh)} kWh so far
              </span>
              <span>{kwh(forecastKwh, 0)} kWh projected</span>
            </div>
          </div>

          {basis === "recent" && (
            <p className="mt-3 text-xs text-slate-400">
              No reading yet this month — projected from your most recent pace.
            </p>
          )}
        </>
      )}
    </section>
  );
}

export function StatTiles({ stats, rate }: { stats: MonthStats; rate: number }) {
  const since = stats.since
    ? `since ${shortDate(stats.since.date)}`
    : "no reading yet";
  const tiles = [
    { icon: Gauge, label: "This month", value: kwh(stats.usedKwh), unit: "kWh", hint: since },
    { icon: Coins, label: "Cost so far", value: baht(stats.usedCost), unit: "", hint: since },
    {
      icon: CalendarClock,
      label: "Daily avg",
      value: stats.avgDaily == null ? "—" : kwh(stats.avgDaily),
      unit: stats.avgDaily == null ? "" : "kWh",
      hint: stats.avgDaily == null ? "need 2 readings" : `≈ ${baht(stats.avgDaily * rate, 1)}/day`,
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
