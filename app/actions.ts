"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { readings, settings } from "@/db/schema";
import { checkPin, isPinConfigured, requireUnlocked, setUnlocked } from "@/lib/auth";
import { neighbours, todayISO } from "@/lib/calc";
import { getPoints, RATE_KEY } from "@/lib/data";
import { meter, shortDate } from "@/lib/format";

export type ActionState = { ok: boolean; message?: string; at?: number };

const fmt = (n: number) => meter(n);
const prettyDate = (iso: string) => shortDate(iso);

export async function unlock(_: ActionState, form: FormData): Promise<ActionState> {
  if (!isPinConfigured()) return { ok: false, message: "ยังไม่ได้ตั้งรหัส PIN (ตั้งค่า ENERGIE_PIN ใน environment)", at: Date.now() };
  if (!checkPin(String(form.get("pin") ?? ""))) return { ok: false, message: "รหัส PIN ไม่ถูกต้อง", at: Date.now() };
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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return { error: "กรุณาเลือกวันที่ให้ถูกต้อง" };
  if (date > todayISO()) return { error: "เลือกวันที่ในอนาคตไม่ได้" };
  if (raw === "" || !Number.isFinite(value) || value < 0) return { error: "กรุณากรอกเลขมิเตอร์" };
  if (value >= 1e10) return { error: "ตัวเลขมากเกินไป" };
  return { date, value };
}

/** A meter only counts up: the new value must sit between its chronological neighbours. */
async function checkOrder(date: string, value: number, excludeId?: number): Promise<string | null> {
  const points = await getPoints();
  const clash = points.find((p) => p.date === date && p.id !== excludeId);
  if (clash) return `วันที่ ${prettyDate(date)} มีบันทึกแล้ว (${fmt(clash.value)} หน่วย) กรุณาแก้ไขรายการนั้นแทน`;
  const { prev, next } = neighbours(points, date, excludeId);
  if (prev && value < prev.value)
    return `น้อยกว่าเลขมิเตอร์วันที่ ${prettyDate(prev.date)} (${fmt(prev.value)} หน่วย) ลองตรวจสอบตัวเลขอีกครั้ง`;
  if (next && value > next.value)
    return `มากกว่าเลขมิเตอร์วันที่ ${prettyDate(next.date)} (${fmt(next.value)} หน่วย) ลองตรวจสอบตัวเลขอีกครั้ง`;
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
  return { ok: true, message: `บันทึกแล้ว ${fmt(parsed.value)} หน่วย`, at: Date.now() };
}

export async function updateReading(_: ActionState, form: FormData): Promise<ActionState> {
  await requireUnlocked();
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return { ok: false, message: "ไม่พบรายการนี้", at: Date.now() };
  const parsed = parseReading(form);
  if ("error" in parsed) return { ok: false, message: parsed.error, at: Date.now() };
  const problem = await checkOrder(parsed.date, parsed.value, id);
  if (problem) return { ok: false, message: problem, at: Date.now() };

  await db
    .update(readings)
    .set({ readingDate: parsed.date, kwhValue: String(parsed.value) })
    .where(eq(readings.id, id));
  revalidatePath("/");
  return { ok: true, message: "แก้ไขแล้ว", at: Date.now() };
}

export async function deleteReading(id: number): Promise<ActionState> {
  await requireUnlocked();
  await db.delete(readings).where(eq(readings.id, id));
  revalidatePath("/");
  return { ok: true, message: "ลบแล้ว", at: Date.now() };
}

export async function updateRate(_: ActionState, form: FormData): Promise<ActionState> {
  await requireUnlocked();
  const rate = Number(String(form.get("rate") ?? "").trim());
  if (!Number.isFinite(rate) || rate <= 0 || rate > 100)
    return { ok: false, message: "กรุณากรอกค่าไฟระหว่าง 0–100 บาท", at: Date.now() };

  await db
    .insert(settings)
    .values({ key: RATE_KEY, value: String(rate) })
    .onConflictDoUpdate({ target: settings.key, set: { value: String(rate) } });
  revalidatePath("/");
  return { ok: true, message: `ตั้งค่าไฟเป็น ฿${rate}/หน่วย แล้ว`, at: Date.now() };
}
