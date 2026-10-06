import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { readings, settings } from "@/db/schema";
import { DEFAULT_RATE, type Point } from "./calc";

export const RATE_KEY = "rate_per_kwh";

export async function getPoints(): Promise<Point[]> {
  const rows = await db.select().from(readings).orderBy(asc(readings.readingDate));
  return rows.map((r) => ({ id: r.id, date: r.readingDate, value: Number(r.kwhValue) }));
}

export async function getRate(): Promise<number> {
  const [row] = await db.select().from(settings).where(eq(settings.key, RATE_KEY));
  const n = row ? Number(row.value) : NaN;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_RATE;
}
