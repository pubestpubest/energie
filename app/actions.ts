"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { readings, settings } from "@/db/schema";
import { checkPin, isPinConfigured, requireUnlocked, setUnlocked } from "@/lib/auth";
import { neighbours, todayISO } from "@/lib/calc";
import { getPoints, RATE_KEY } from "@/lib/data";

export type ActionState = { ok: boolean; message?: string; at?: number };

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });
const prettyDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { day: "numeric", month: "short", timeZone: "UTC" });

export async function unlock(_: ActionState, form: FormData): Promise<ActionState> {
  if (!isPinConfigured()) return { ok: false, message: "No PIN set. Add ENERGIE_PIN to the environment.", at: Date.now() };
  if (!checkPin(String(form.get("pin") ?? ""))) return { ok: false, message: "Wrong PIN", at: Date.now() };
  await setUnlocked(true);
  revalidatePath("/");
  return { ok: true };
}

export async function lock() {
  await setUnlocked(false);
  revalidatePath("/");
}

function parseReading(form: FormData) {
  const date = String(form.get("date") ?? "");
  const raw = String(form.get("kwh") ?? "").replace(/,/g, "").trim();
  const value = Number(raw);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return { error: "Pick a valid date." };
  if (date > todayISO()) return { error: "That date is in the future." };
  if (raw === "" || !Number.isFinite(value) || value < 0) return { error: "Enter the meter reading in kWh." };
  if (value >= 1e10) return { error: "That reading looks too large." };
  return { date, value };
}

/** A meter only counts up: the new value must sit between its chronological neighbours. */
async function checkOrder(date: string, value: number, excludeId?: number): Promise<string | null> {
  const points = await getPoints();
  const clash = points.find((p) => p.date === date && p.id !== excludeId);
  if (clash) return `There's already a reading for ${prettyDate(date)} (${fmt(clash.value)} kWh). Edit that one instead.`;
  const { prev, next } = neighbours(points, date, excludeId);
  if (prev && value < prev.value)
    return `Lower than the earlier reading on ${prettyDate(prev.date)} (${fmt(prev.value)} kWh). Check the digits?`;
  if (next && value > next.value)
    return `Higher than the later reading on ${prettyDate(next.date)} (${fmt(next.value)} kWh). Check the digits?`;
  return null;
}

export async function addReading(_: ActionState, form: FormData): Promise<ActionState> {
  await requireUnlocked();
  const parsed = parseReading(form);
  if ("error" in parsed) return { ok: false, message: parsed.error, at: Date.now() };
  const problem = await checkOrder(parsed.date, parsed.value);
  if (problem) return { ok: false, message: problem, at: Date.now() };

  await db.insert(readings).values({ readingDate: parsed.date, kwhValue: String(parsed.value) });
  revalidatePath("/");
  return { ok: true, message: `Saved ${fmt(parsed.value)} kWh`, at: Date.now() };
}

export async function updateReading(_: ActionState, form: FormData): Promise<ActionState> {
  await requireUnlocked();
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return { ok: false, message: "Missing reading.", at: Date.now() };
  const parsed = parseReading(form);
  if ("error" in parsed) return { ok: false, message: parsed.error, at: Date.now() };
  const problem = await checkOrder(parsed.date, parsed.value, id);
  if (problem) return { ok: false, message: problem, at: Date.now() };

  await db
    .update(readings)
    .set({ readingDate: parsed.date, kwhValue: String(parsed.value) })
    .where(eq(readings.id, id));
  revalidatePath("/");
  return { ok: true, message: "Updated", at: Date.now() };
}

export async function deleteReading(id: number): Promise<ActionState> {
  await requireUnlocked();
  await db.delete(readings).where(eq(readings.id, id));
  revalidatePath("/");
  return { ok: true, message: "Deleted", at: Date.now() };
}

export async function updateRate(_: ActionState, form: FormData): Promise<ActionState> {
  await requireUnlocked();
  const rate = Number(String(form.get("rate") ?? "").trim());
  if (!Number.isFinite(rate) || rate <= 0 || rate > 100)
    return { ok: false, message: "Enter a rate between 0 and 100 Baht.", at: Date.now() };

  await db
    .insert(settings)
    .values({ key: RATE_KEY, value: String(rate) })
    .onConflictDoUpdate({ target: settings.key, set: { value: String(rate) } });
  revalidatePath("/");
  return { ok: true, message: `Rate set to ฿${rate}/kWh`, at: Date.now() };
}
