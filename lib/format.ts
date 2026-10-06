// All user-facing formatting is Thai: Buddhist-era dates, "หน่วย" for kWh, Arabic digits.
export const LOCALE = "th-TH";

export const kwh = (n: number, digits = 1) =>
  n.toLocaleString(LOCALE, { minimumFractionDigits: 0, maximumFractionDigits: digits });

export const baht = (n: number, digits = 0) =>
  `฿${n.toLocaleString(LOCALE, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

export const meter = (n: number) =>
  n.toLocaleString(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 2 });

/** Format a "YYYY-MM-DD" (or "YYYY-MM-01") date string without timezone drift. */
export function thaiDate(iso: string, opts: Intl.DateTimeFormatOptions) {
  return new Date(`${iso.length === 7 ? `${iso}-01` : iso}T00:00:00Z`).toLocaleDateString(LOCALE, {
    ...opts,
    timeZone: "UTC",
  });
}

/** 6 ต.ค. */
export const shortDate = (iso: string) => thaiDate(iso, { day: "numeric", month: "short" });

/** อ. 6 ต.ค. 2569 */
export const longDate = (iso: string) =>
  thaiDate(iso, { weekday: "short", day: "numeric", month: "short", year: "numeric" });

/** ตุลาคม 2569 */
export const monthYear = (iso: string) => thaiDate(iso, { month: "long", year: "numeric" });
