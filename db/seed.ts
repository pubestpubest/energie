// Mock meter readings for a two-person Bangkok condo, ~6 months back to today.
// Usage: npm run db:seed   (refuses to touch the production branch)
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const DAY_MS = 86_400_000;

// Hot season (Apr–May) runs the AC hard; rainy season is gentler.
const SEASON: Record<number, number> = { 3: 1.4, 4: 1.45, 5: 1.25, 6: 1.1, 7: 1.05, 8: 1.0, 9: 0.95 };

// Deterministic PRNG so every seed run produces the same data.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function main() {
  if (process.env.NEON_BRANCH === "production") {
    throw new Error("Refusing to seed the production branch. Run `neon checkout development` first.");
  }

  const { db } = await import("./index");
  const { readings } = await import("./schema");
  const { todayISO } = await import("../lib/calc");

  const rand = mulberry32(302);
  const today = Date.parse(`${todayISO()}T00:00:00Z`);
  let day = Date.parse("2026-04-01T00:00:00Z");
  let meter = 12_480.0;
  const rows: { readingDate: string; kwhValue: string }[] = [];

  const last = today - DAY_MS; // yesterday
  while (day < last) {
    rows.push({ readingDate: new Date(day).toISOString().slice(0, 10), kwhValue: meter.toFixed(1) });
    const gap = Math.min(2 + Math.floor(rand() * 4), (last - day) / DAY_MS); // read every 2–5 days
    for (let i = 0; i < gap; i++) {
      const d = new Date(day + i * DAY_MS);
      const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6 ? 1.15 : 1;
      meter += 8.5 * (SEASON[d.getUTCMonth()] ?? 1) * weekend * (0.8 + rand() * 0.4);
    }
    day += gap * DAY_MS;
  }
  // Last reading was yesterday so the dashboard has a live forecast.
  rows.push({ readingDate: new Date(last).toISOString().slice(0, 10), kwhValue: meter.toFixed(1) });

  await db.delete(readings);
  await db.insert(readings).values(rows);
  console.log(
    `Seeded ${rows.length} readings on ${process.env.NEON_BRANCH}: ` +
      `${rows[0].readingDate} (${rows[0].kwhValue}) → ${rows.at(-1)!.readingDate} (${rows.at(-1)!.kwhValue})`,
  );
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
