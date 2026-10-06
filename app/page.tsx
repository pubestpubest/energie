import { LogOut, Zap } from "lucide-react";
import { lock } from "./actions";
import { History } from "@/components/history";
import { PinGate } from "@/components/pin-gate";
import { RateButton } from "@/components/rate-dialog";
import { ReadingForm } from "@/components/reading-form";
import { ForecastCard, StatTiles } from "@/components/summary";
import { UsageChart } from "@/components/usage-chart";
import { isUnlocked } from "@/lib/auth";
import { computeRows, monthlySeries, monthStats, todayISO } from "@/lib/calc";
import { getPoints, getRate } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!(await isUnlocked())) return <PinGate />;

  const [points, rate] = await Promise.all([getPoints(), getRate()]);
  const today = todayISO();
  const rows = computeRows(points, rate);
  const stats = monthStats(points, rate, today);
  const months = monthlySeries(points, rate);

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-5 sm:px-6 sm:pt-8">
      <header className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <Zap className="size-5" strokeWidth={2.25} />
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight tracking-tight">Energie</h1>
            <p className="text-xs text-slate-500">Household electricity</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <RateButton rate={rate} />
          <form action={lock}>
            <button
              type="submit"
              aria-label="Lock"
              className="flex size-10 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-6">
        <div className="space-y-4">
          <ReadingForm points={points} today={today} rate={rate} />
          <ForecastCard stats={stats} />
          <StatTiles stats={stats} rate={rate} />
        </div>
        <div className="space-y-4">
          <UsageChart points={points} months={months} rate={rate} today={today} />
          <History rows={rows} today={today} />
        </div>
      </div>
    </main>
  );
}
