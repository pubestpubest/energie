"use client";

import { useActionState, useEffect, useRef } from "react";
import { CircleAlert, Settings2, X } from "lucide-react";
import { updateRate, type ActionState } from "@/app/actions";

export function RateButton({ rate }: { rate: number }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState<ActionState, FormData>(updateRate, { ok: false });

  useEffect(() => {
    if (state.ok) ref.current?.close();
  }, [state]);

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="inline-flex h-10 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-xs transition hover:bg-slate-50"
      >
        <Settings2 className="size-4 text-slate-400" />฿{rate}
        <span className="text-slate-400">/หน่วย</span>
      </button>

      <dialog
        ref={ref}
        onClick={(e) => e.target === ref.current && ref.current?.close()}
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl bg-white p-0 shadow-xl"
      >
        <form action={action} className="p-5">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold">ค่าไฟต่อหน่วย</h2>
              <p className="mt-0.5 text-sm text-slate-500">ใช้คำนวณค่าไฟและการคาดการณ์ทั้งหมด</p>
            </div>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              aria-label="ปิด"
              className="-mr-2 -mt-1 flex size-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
            >
              <X className="size-4" />
            </button>
          </div>

          <label className="relative block">
            <span className="sr-only">บาทต่อหน่วย</span>
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl text-slate-400">฿</span>
            <input
              key={rate}
              name="rate"
              type="text"
              inputMode="decimal"
              defaultValue={rate}
              required
              className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-20 font-mono text-2xl font-semibold outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/15"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">ต่อหน่วย</span>
          </label>

          {state.at && !state.ok && (
            <p className="mt-3 flex items-start gap-1.5 text-sm text-rose-600" role="alert">
              <CircleAlert className="mt-0.5 size-4 shrink-0" /> {state.message}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-4 h-12 w-full rounded-xl bg-slate-900 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {pending ? "กำลังบันทึก…" : "บันทึกค่าไฟ"}
          </button>
        </form>
      </dialog>
    </>
  );
}
