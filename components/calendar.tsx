"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fromDay, toDay } from "@/lib/calc";
import { monthYear, thaiDate } from "@/lib/format";

type Props = {
  value: string;
  max: string;
  /** Dates that already have a reading — shown with a dot. */
  marked?: Set<string>;
  onSelect: (iso: string) => void;
};

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

export function Calendar({ value, max, marked, onSelect }: Props) {
  const [month, setMonth] = useState(value.slice(0, 7)); // "YYYY-MM"
  const [y, m] = month.split("-").map(Number);
  const first = toDay(`${month}-01`);
  const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const length = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length }, (_, i) => fromDay(first + i)),
  ];
  const canNext = month < max.slice(0, 7);

  function shift(delta: number) {
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    setMonth(d.toISOString().slice(0, 7));
  }

  return (
    <div className="w-full select-none">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shift(-1)}
          aria-label="เดือนก่อน"
          className="flex size-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="text-sm font-semibold text-slate-800" aria-live="polite">
          {monthYear(month)}
        </p>
        <button
          type="button"
          onClick={() => shift(1)}
          disabled={!canNext}
          aria-label="เดือนถัดไป"
          className="flex size-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-25 disabled:hover:bg-transparent"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center" role="grid">
        {WEEKDAYS.map((d) => (
          <div key={d} className="pb-1 text-[11px] font-medium text-slate-400">
            {d}
          </div>
        ))}
        {cells.map((iso, i) => {
          if (!iso) return <div key={`pad-${i}`} />;
          const selected = iso === value;
          const isToday = iso === max;
          const future = iso > max;
          const hasReading = marked?.has(iso);
          return (
            <button
              key={iso}
              type="button"
              disabled={future}
              onClick={() => onSelect(iso)}
              aria-pressed={selected}
              aria-label={`${thaiDate(iso, { weekday: "long", day: "numeric", month: "long" })}${hasReading ? " (มีบันทึกแล้ว)" : ""}`}
              className={`relative flex h-10 items-center justify-center rounded-lg text-sm tabular-nums transition ${
                selected
                  ? "bg-emerald-600 font-semibold text-white shadow-sm"
                  : future
                    ? "text-slate-300"
                    : isToday
                      ? "font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/40 hover:bg-emerald-50"
                      : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {Number(iso.slice(8))}
              {hasReading && (
                <span
                  className={`absolute bottom-1.5 size-1 rounded-full ${selected ? "bg-white/80" : "bg-emerald-500"}`}
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
