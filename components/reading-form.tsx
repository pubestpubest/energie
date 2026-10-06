"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Check, CircleAlert, Gauge, Plus } from "lucide-react";
import { addReading, type ActionState } from "@/app/actions";
import { DateField } from "./date-field";
import { baht, kwh, meter, shortDate } from "@/lib/format";
import { toDay, type Point } from "@/lib/calc";

type Props = { points: Point[]; today: string; rate: number };

export function ReadingForm({ points, today, rate }: Props) {
  const [state, action, pending] = useActionState<ActionState, FormData>(addReading, { ok: false });
  const [date, setDate] = useState(today);
  const [value, setValue] = useState("");
  const [dismissed, setDismissed] = useState<number>();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.ok && state.at) {
      setValue("");
      setDate(today);
    }
  }, [state, today]);

  const latest = points.at(-1) ?? null;
  const taken = useMemo(() => new Set(points.map((p) => p.date)), [points]);
  // Preview against whichever reading precedes the chosen date, not just the latest.
  const prev = [...points].reverse().find((p) => p.date < date) ?? null;
  const n = Number(value.replace(/,/g, ""));
  // Don't judge a half-typed number: wait until it has as many whole digits as the previous reading.
  const typedDigits = value.replace(/,/g, "").split(".")[0].length;
  const complete = prev != null && typedDigits >= String(Math.trunc(prev.value)).length;
  const delta = prev && complete && Number.isFinite(n) ? n - prev.value : null;
  const days = prev ? toDay(date) - toDay(prev.date) : null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Gauge className="size-4 text-emerald-600" /> New reading
        </h2>
        {latest && (
          <span className="text-xs text-slate-500">
            Last: <span className="font-mono text-slate-700">{meter(latest.value)}</span> · {shortDate(latest.date)}
          </span>
        )}
      </div>

      <form action={action} className="space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-500">Meter reading (kWh)</span>
          <input
            ref={inputRef}
            name="kwh"
            type="text"
            inputMode="decimal"
            enterKeyHint="done"
            autoComplete="off"
            placeholder={latest ? meter(latest.value) : "e.g. 14250.5"}
            value={value}
            onChange={(e) => {
              setValue(e.target.value.replace(/[^\d.,]/g, ""));
              setDismissed(state.at);
            }}
            required
            className="h-16 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-mono text-3xl font-semibold tracking-tight outline-none transition placeholder:text-slate-300 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/15"
          />
        </label>

        <DateField
          name="date"
          value={date}
          max={today}
          marked={taken}
          onChange={(d) => {
            setDate(d);
            setDismissed(state.at);
          }}
        />

        <button
          type="submit"
          disabled={pending || value === ""}
          className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-40"
        >
          <Plus className="size-5" strokeWidth={2.5} />
          {pending ? "Saving…" : "Save reading"}
        </button>

        <div className="min-h-5 text-sm" aria-live="polite">
          {state.at && state.at !== dismissed && !pending && state.message ? (
            <p className={`flex items-start gap-1.5 ${state.ok ? "text-emerald-700" : "text-rose-600"}`}>
              {state.ok ? <Check className="mt-0.5 size-4 shrink-0" /> : <CircleAlert className="mt-0.5 size-4 shrink-0" />}
              {state.message}
            </p>
          ) : delta != null && days != null && days > 0 ? (
            <p className={delta < 0 ? "text-amber-600" : "text-slate-500"}>
              {delta < 0 ? (
                "Lower than the previous reading — double-check the digits."
              ) : (
                <>
                  <span className="font-medium text-slate-700">+{kwh(delta)} kWh</span> over {days} day{days === 1 ? "" : "s"} ·
                  ≈ <span className="font-medium text-slate-700">{baht(delta * rate)}</span>
                </>
              )}
            </p>
          ) : null}
        </div>
      </form>
    </section>
  );
}
