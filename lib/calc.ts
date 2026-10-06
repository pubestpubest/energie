// Pure meter math. Dates are "YYYY-MM-DD" strings; internally converted to whole
// day numbers so intervals are exact and timezone-free.

export type Point = { id: number; date: string; value: number };

export type Row = Point & {
  consumption: number | null; // kWh since the previous reading
  days: number | null; // days since the previous reading
  perDay: number | null; // kWh/day over that interval
  cost: number | null; // Baht for the interval
};

export type MonthBar = { key: string; label: string; kwh: number; cost: number; partial: boolean };

export type MonthStats = {
  monthLabel: string;
  daysInMonth: number;
  usedKwh: number;
  usedCost: number;
  avgDaily: number | null;
  forecastKwh: number | null;
  forecastCost: number | null;
  /** Where "used so far" is measured from, for honest labelling. */
  since: { date: string; estimated: boolean } | null;
  latestDate: string | null;
  basis: "month" | "recent" | "none";
};

export const DEFAULT_RATE = 4.5;
const DAY_MS = 86_400_000;

export function toDay(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / DAY_MS;
}

export function fromDay(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

/** Today's date in Thailand, regardless of server timezone. */
export function todayISO(timeZone = "Asia/Bangkok"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

export function sortPoints(points: Point[]): Point[] {
  return [...points].sort((a, b) => toDay(a.date) - toDay(b.date));
}

/** Per-reading consumption, always computed against the chronologically previous reading. */
export function computeRows(points: Point[], rate: number): Row[] {
  const sorted = sortPoints(points);
  return sorted.map((p, i) => {
    if (i === 0) return { ...p, consumption: null, days: null, perDay: null, cost: null };
    const prev = sorted[i - 1];
    const consumption = round(p.value - prev.value);
    const days = toDay(p.date) - toDay(prev.date);
    return {
      ...p,
      consumption,
      days,
      perDay: days > 0 ? consumption / days : null,
      cost: consumption * rate,
    };
  });
}

/** Meter value at a given day, linearly interpolated between readings. Null outside the data range. */
export function valueAt(sorted: Point[], day: number): number | null {
  if (sorted.length === 0) return null;
  for (let i = 0; i < sorted.length; i++) {
    const d = toDay(sorted[i].date);
    if (d === day) return sorted[i].value;
    if (d > day) {
      if (i === 0) return null;
      const a = sorted[i - 1];
      const da = toDay(a.date);
      return a.value + ((sorted[i].value - a.value) * (day - da)) / (d - da);
    }
  }
  return null;
}

function monthBounds(iso: string) {
  const [y, m] = iso.split("-").map(Number);
  const start = Date.UTC(y, m - 1, 1) / DAY_MS;
  const end = Date.UTC(y, m, 1) / DAY_MS; // exclusive
  return { y, m, start, end };
}

const monthFmt = new Intl.DateTimeFormat("th-TH", { month: "short", timeZone: "UTC" });
const monthYearFmt = new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric", timeZone: "UTC" });

/** Monthly totals, splitting intervals that straddle a month boundary by interpolation. */
export function monthlySeries(points: Point[], rate: number): MonthBar[] {
  const sorted = sortPoints(points);
  if (sorted.length < 2) return [];
  const first = toDay(sorted[0].date);
  const last = toDay(sorted[sorted.length - 1].date);
  const bars: MonthBar[] = [];
  let { y, m } = monthBounds(sorted[0].date);
  for (;;) {
    const start = Date.UTC(y, m - 1, 1) / DAY_MS;
    if (start > last) break;
    const end = Date.UTC(y, m, 1) / DAY_MS;
    const from = Math.max(start, first);
    const to = Math.min(end, last);
    if (to > from) {
      const kwh = round((valueAt(sorted, to) ?? 0) - (valueAt(sorted, from) ?? 0));
      const date = new Date(start * DAY_MS);
      bars.push({
        key: `${y}-${String(m).padStart(2, "0")}`,
        label: `${monthFmt.format(date)}${m === 1 || bars.length === 0 ? ` ${String(y + 543).slice(2)}` : ""}`,
        kwh,
        cost: kwh * rate,
        partial: from > start || to < end,
      });
    }
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return bars;
}

/**
 * Current-month usage and a straight-line forecast.
 * Baseline is the meter value on the 1st (interpolated) when an earlier reading exists,
 * otherwise the first reading of the month. Forecast = used + daily pace × uncovered days.
 */
export function monthStats(points: Point[], rate: number, today: string): MonthStats {
  const sorted = sortPoints(points);
  const { start, end } = monthBounds(today);
  const todayDay = toDay(today);
  const daysInMonth = end - start;
  const monthLabel = monthYearFmt.format(new Date(start * DAY_MS));
  const empty: MonthStats = {
    monthLabel, daysInMonth, usedKwh: 0, usedCost: 0, avgDaily: null,
    forecastKwh: null, forecastCost: null, since: null, latestDate: null, basis: "none",
  };

  const known = sorted.filter((p) => toDay(p.date) <= todayDay);
  const inMonth = known.filter((p) => toDay(p.date) >= start);
  const before = known.filter((p) => toDay(p.date) < start);
  const latest = known.at(-1) ?? null;
  if (!latest) return empty;

  if (inMonth.length > 0) {
    const last = inMonth[inMonth.length - 1];
    const lastDay = toDay(last.date);
    const baseline = before.length > 0
      ? { day: start, value: valueAt(known, start)!, estimated: toDay(inMonth[0].date) !== start }
      : { day: toDay(inMonth[0].date), value: inMonth[0].value, estimated: false };

    const used = Math.max(0, last.value - baseline.value);
    const span = lastDay - baseline.day;
    const pace = span > 0 ? used / span : recentPace(known);
    const uncovered = end - lastDay + (baseline.day - start);
    const forecast = pace == null ? null : used + pace * uncovered;
    return {
      monthLabel, daysInMonth,
      usedKwh: round(used),
      usedCost: used * rate,
      avgDaily: pace,
      forecastKwh: forecast == null ? null : round(forecast),
      forecastCost: forecast == null ? null : forecast * rate,
      since: { date: fromDay(baseline.day), estimated: baseline.estimated },
      latestDate: last.date,
      basis: span > 0 ? "month" : pace == null ? "none" : "recent",
    };
  }

  // No reading yet this month: project from the most recent interval.
  const pace = recentPace(known);
  return {
    ...empty,
    avgDaily: pace,
    forecastKwh: pace == null ? null : round(pace * daysInMonth),
    forecastCost: pace == null ? null : pace * daysInMonth * rate,
    latestDate: latest.date,
    basis: pace == null ? "none" : "recent",
  };
}

function recentPace(sorted: Point[]): number | null {
  if (sorted.length < 2) return null;
  const a = sorted[sorted.length - 2];
  const b = sorted[sorted.length - 1];
  const days = toDay(b.date) - toDay(a.date);
  return days > 0 ? Math.max(0, b.value - a.value) / days : null;
}

/** Neighbouring readings around a date, used to reject a meter that runs backwards. */
export function neighbours(points: Point[], date: string, excludeId?: number) {
  const day = toDay(date);
  const others = sortPoints(points.filter((p) => p.id !== excludeId));
  const prev = others.filter((p) => toDay(p.date) < day).at(-1) ?? null;
  const next = others.find((p) => toDay(p.date) > day) ?? null;
  return { prev, next };
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

export type DayPoint = {
  label: string; // day of month, "1".."31"
  date: string;
  daily: number | null; // avg kWh/day of the interval ending on this reading
  cumulative: number | null; // kWh since the start of the month
  projected: number | null; // forecast path (current month only)
  spanDays?: number;
  estimated?: boolean; // interpolated month-boundary point, not a real reading
};

/**
 * One slot per calendar day of `monthKey` ("YYYY-MM"). Only days with a reading carry
 * values (plus interpolated month boundaries for the running total); the chart joins the gaps.
 */
export function daySeries(points: Point[], monthKey: string, rate: number, today: string): DayPoint[] {
  const sorted = sortPoints(points);
  const { start, end } = monthBounds(`${monthKey}-01`);
  const n = end - start;
  const days: DayPoint[] = Array.from({ length: n }, (_, i) => ({
    label: String(i + 1),
    date: fromDay(start + i),
    daily: null,
    cumulative: null,
    projected: null,
  }));
  if (sorted.length === 0) return days;

  const inMonth = sorted.filter((p) => toDay(p.date) >= start && toDay(p.date) < end);
  const onFirst = valueAt(sorted, start);
  const baseline = onFirst ?? inMonth[0]?.value ?? null;

  if (onFirst != null && inMonth[0]?.date !== fromDay(start)) {
    days[0] = { ...days[0], cumulative: 0, estimated: true };
  }

  for (const p of inMonth) {
    const i = sorted.indexOf(p);
    const slot = days[toDay(p.date) - start];
    const prev = i > 0 ? sorted[i - 1] : null;
    const span = prev ? toDay(p.date) - toDay(prev.date) : 0;
    slot.daily = prev && span > 0 ? round((p.value - prev.value) / span) : null;
    slot.spanDays = span || undefined;
    slot.cumulative = baseline == null ? null : round(p.value - baseline);
    slot.estimated = false;
  }

  // Close the running total at month end when a later reading lets us interpolate it.
  const atEnd = valueAt(sorted, end);
  const lastSlot = days[n - 1];
  if (baseline != null && atEnd != null && lastSlot.cumulative == null) {
    days[n - 1] = { ...lastSlot, cumulative: round(atEnd - baseline), estimated: true };
  }

  // Dashed forecast path from the latest reading to the month-end projection.
  if (today.startsWith(monthKey)) {
    const stats = monthStats(points, rate, today);
    if (stats.forecastKwh != null) {
      const fromIdx = stats.latestDate?.startsWith(monthKey) ? toDay(stats.latestDate) - start : 0;
      days[fromIdx].projected = fromIdx === 0 && !stats.latestDate?.startsWith(monthKey) ? 0 : stats.usedKwh;
      if (fromIdx < n - 1) days[n - 1].projected = stats.forecastKwh;
    }
  }
  return days;
}
