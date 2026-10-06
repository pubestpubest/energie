"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { fromDay, toDay } from "@/lib/calc";
import { thaiDate } from "@/lib/format";
import { Calendar } from "./calendar";

type Props = {
  name: string;
  value: string;
  max: string;
  onChange: (iso: string) => void;
  /** Dates that already have a reading, dotted in the calendar. */
  marked?: Set<string>;
  /** Chips (Today / Yesterday / Pick) for the main form; a single button for inline edits. */
  variant?: "chips" | "button";
};

const label = thaiDate;

export function DateField({ name, value, max, onChange, marked, variant = "chips" }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const yesterday = fromDay(toDay(max) - 1);

  // Close on outside tap or Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(iso: string) {
    onChange(iso);
    setOpen(false);
  }

  const popover = open && (
    <div
      role="dialog"
      aria-label="เลือกวันที่"
      className={`absolute top-full z-30 mt-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-900/10 ${
        variant === "chips" ? "right-0 w-full max-w-[20rem]" : "left-0 w-72"
      }`}
    >
      <Calendar value={value} max={max} marked={marked} onSelect={pick} />
      {marked && marked.size > 0 && (
        <p className="mt-2 flex items-center gap-1.5 border-t border-slate-100 pt-2 text-[11px] text-slate-400">
          <span className="size-1 rounded-full bg-emerald-500" /> มีบันทึกแล้ว
        </p>
      )}
    </div>
  );

  const hidden = <input type="hidden" name={name} value={value} />;

  if (variant === "button") {
    return (
      <div ref={rootRef} className="relative">
        {hidden}
        <button
          ref={triggerRef}
          type="button"
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen((o) => !o)}
          className={`flex h-12 w-full items-center gap-2 rounded-lg border bg-white px-3 text-left text-sm font-medium text-slate-800 transition hover:border-slate-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/15 ${
            open ? "border-emerald-500 ring-4 ring-emerald-500/15" : "border-slate-200"
          }`}
        >
          <CalendarDays className="size-4 shrink-0 text-slate-400" />
          <span className="truncate">
            {label(value, { weekday: "short", day: "numeric", month: "short", ...(value.slice(0, 4) !== max.slice(0, 4) && { year: "numeric" }) })}
          </span>
        </button>
        {popover}
      </div>
    );
  }

  const custom = value !== max && value !== yesterday;
  const chip = (active: boolean) =>
    `flex h-12 items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition active:scale-[0.98] ${
      active
        ? "border-emerald-600 bg-emerald-50 text-emerald-800"
        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800"
    }`;

  return (
    <div ref={rootRef} className="relative">
      {hidden}
      <div className="grid grid-cols-[1fr_1fr_1.3fr] gap-2" role="group" aria-label="วันที่จด">
        <button type="button" aria-pressed={value === max} onClick={() => pick(max)} className={chip(value === max)}>
          วันนี้
        </button>
        <button type="button" aria-pressed={value === yesterday} onClick={() => pick(yesterday)} className={chip(value === yesterday)}>
          เมื่อวาน
        </button>
        <button
          ref={triggerRef}
          type="button"
          aria-pressed={custom}
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen((o) => !o)}
          className={`${chip(custom || open)} w-full`}
        >
          <CalendarDays className="size-4 shrink-0" />
          <span className="truncate">{custom ? label(value, { day: "numeric", month: "short" }) : "เลือกวัน"}</span>
        </button>
      </div>
      {popover}
    </div>
  );
}
