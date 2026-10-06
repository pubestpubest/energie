"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Lock, Zap } from "lucide-react";
import { unlock, type ActionState } from "@/app/actions";

export function PinGate() {
  const [state, action, pending] = useActionState<ActionState, FormData>(unlock, { ok: false });
  const [pin, setPin] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Clear and refocus after a wrong attempt.
  useEffect(() => {
    if (state.at && !state.ok) {
      setPin("");
      inputRef.current?.focus();
    }
  }, [state]);

  function onChange(value: string) {
    const next = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
    setPin(next);
    if (next.length === 4) queueMicrotask(() => formRef.current?.requestSubmit());
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <form ref={formRef} action={action} className="w-full max-w-xs text-center">
        <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
          <Zap className="size-7" strokeWidth={2.25} />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Energie</h1>
        <p className="mt-1 text-sm text-slate-500">Enter the house PIN</p>

        <label className="relative mt-8 block">
          <span className="sr-only">PIN</span>
          <input
            ref={inputRef}
            name="pin"
            value={pin}
            onChange={(e) => onChange(e.target.value)}
            autoFocus
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={4}
            disabled={pending}
            aria-invalid={state.at && !state.ok ? true : undefined}
            className="absolute inset-0 opacity-0"
          />
          <div className="grid grid-cols-4 gap-3" aria-hidden>
            {[0, 1, 2, 3].map((i) => {
              const active = i === pin.length && !pending;
              return (
                <div
                  key={i}
                  className={`flex h-16 items-center justify-center rounded-xl border bg-white font-mono text-2xl font-semibold shadow-xs transition ${
                    state.at && !state.ok && pin.length === 0
                      ? "border-rose-300"
                      : active
                        ? "border-emerald-500 ring-4 ring-emerald-500/15"
                        : "border-slate-200"
                  }`}
                >
                  {pin[i] ? "•" : ""}
                </div>
              );
            })}
          </div>
        </label>

        <p className="mt-4 h-5 text-sm text-rose-600" role="alert">
          {state.at && !state.ok ? state.message : ""}
        </p>

        <button
          type="submit"
          disabled={pending || pin.length !== 4}
          className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 font-medium text-white transition hover:bg-slate-800 disabled:opacity-40"
        >
          <Lock className="size-4" /> {pending ? "Checking…" : "Unlock"}
        </button>
      </form>
    </main>
  );
}
