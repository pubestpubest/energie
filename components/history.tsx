"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { CircleAlert, History as HistoryIcon, Pencil, Trash2, X } from "lucide-react";
import { deleteReading, updateReading, type ActionState } from "@/app/actions";
import { baht, kwh, longDate, meter } from "@/lib/format";
import { DateField } from "./date-field";
import type { Row } from "@/lib/calc";

const PAGE = 12;

export function History({ rows, today }: { rows: Row[]; today: string }) {
  const [editing, setEditing] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const newestFirst = [...rows].reverse();
  const taken = new Set(rows.map((r) => r.date));
  const visible = showAll ? newestFirst : newestFirst.slice(0, PAGE);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-xs">
      <div className="flex items-center justify-between px-5 pb-2 pt-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <HistoryIcon className="size-4 text-slate-400" /> ประวัติการจด
        </h2>
        <span className="text-xs text-slate-500">ทั้งหมด {rows.length} รายการ</span>
      </div>

      {rows.length === 0 ? (
        <p className="px-5 pb-6 pt-2 text-sm text-slate-500">ยังไม่มีบันทึก เริ่มจดเลขมิเตอร์ครั้งแรกด้านบนได้เลย</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {visible.map((r) =>
            editing === r.id ? (
              <EditRow key={r.id} row={r} today={today} taken={taken} onDone={() => setEditing(null)} />
            ) : (
              <li key={r.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">{longDate(r.date)}</p>
                  <p className="font-mono text-xs text-slate-500">{meter(r.value)} หน่วย</p>
                </div>
                <div className="text-right">
                  {r.consumption == null ? (
                    <p className="text-xs text-slate-400">บันทึกแรก</p>
                  ) : (
                    <>
                      <p className="text-sm font-semibold tabular-nums text-slate-900">+{kwh(r.consumption)} หน่วย</p>
                      <p className="text-xs tabular-nums text-slate-500">
                        {baht(r.cost ?? 0)} · {r.days} วัน
                      </p>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(r.id)}
                  aria-label={`แก้ไขบันทึกวันที่ ${longDate(r.date)}`}
                  className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <Pencil className="size-4" />
                </button>
              </li>
            ),
          )}
        </ul>
      )}

      {newestFirst.length > PAGE && (
        <button
          type="button"
          onClick={() => setShowAll((s) => !s)}
          className="w-full border-t border-slate-100 py-3.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          {showAll ? "แสดงน้อยลง" : `แสดงทั้งหมด ${newestFirst.length} รายการ`}
        </button>
      )}
    </section>
  );
}

function EditRow({ row, today, taken, onDone }: { row: Row; today: string; taken: Set<string>; onDone: () => void }) {
  const others = useMemo(() => new Set([...taken].filter((d) => d !== row.date)), [taken, row.date]);
  const [state, action, pending] = useActionState<ActionState, FormData>(updateReading, { ok: false });
  const [date, setDate] = useState(row.date);
  const [confirming, setConfirming] = useState(false);
  const [deleting, startDelete] = useTransition();

  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  return (
    <li className="bg-slate-50/70 px-5 py-4">
      <form action={action} className="space-y-3">
        <input type="hidden" name="id" value={row.id} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="mb-1 block text-xs font-medium text-slate-500">วันที่</span>
            <DateField name="date" variant="button" value={date} max={today} marked={others} onChange={setDate} />
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">เลขมิเตอร์ (หน่วย)</span>
            <input
              name="kwh"
              type="text"
              inputMode="decimal"
              defaultValue={String(row.value)}
              required
              className="h-12 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-base outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15"
            />
          </label>
        </div>

        {state.at && !state.ok && (
          <p className="flex items-start gap-1.5 text-sm text-rose-600" role="alert">
            <CircleAlert className="mt-0.5 size-4 shrink-0" /> {state.message}
          </p>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={deleting}
            onClick={() => {
              if (!confirming) return setConfirming(true);
              startDelete(async () => {
                await deleteReading(row.id);
                onDone();
              });
            }}
            onBlur={() => setConfirming(false)}
            className={`inline-flex h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition ${
              confirming ? "bg-rose-600 text-white hover:bg-rose-700" : "text-rose-600 hover:bg-rose-50"
            }`}
          >
            <Trash2 className="size-4" />
            {deleting ? "กำลังลบ…" : confirming ? "ยืนยันลบ" : "ลบ"}
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={onDone}
            className="inline-flex h-11 items-center gap-1 rounded-lg px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-200/60"
          >
            <X className="size-4" /> ยกเลิก
          </button>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-11 items-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {pending ? "กำลังบันทึก…" : "บันทึก"}
          </button>
        </div>
      </form>
    </li>
  );
}
