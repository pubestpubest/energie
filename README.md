# Energie

Household electricity log and monthly bill forecast. Next.js (App Router) + Tailwind + Drizzle + Neon Postgres.

## Run

```bash
npm install
npm run db:push   # create/update tables on the linked Neon branch
npm run dev       # http://localhost:3000
```

`DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` live in `.env.local`, pulled by `neon link` / `neon env pull`.

The unlock PIN is `ENERGIE_PIN` (4 letters/digits, case-insensitive). Keep it in `.env` locally (git-ignored; `.env.local` is managed by `neon link` / `neon checkout`) and set it in Vercel's environment variables. Changing it signs out every device. See `.env.example`.

## Layout

```
app/
  actions.ts        server actions: unlock/lock, add/update/delete reading, update rate
  page.tsx          dashboard (renders PIN gate when locked)
  layout.tsx, globals.css
components/
  pin-gate.tsx      4-character PIN screen
  reading-form.tsx  big-touch-target entry form with live +kWh / ฿ preview
  summary.tsx       forecast card + this-month stat tiles
  usage-chart.tsx   recharts bars: monthly or daily-avg, kWh or ฿
  history.tsx       readings list with inline edit / two-tap delete
  rate-dialog.tsx   Baht-per-kWh setting
db/
  schema.ts         readings, settings
  index.ts          drizzle over @neondatabase/serverless (HTTP)
lib/
  calc.ts           pure meter math: consumption, interpolation, monthly totals, forecast
  data.ts           queries
  auth.ts           cookie gate (PIN checked server-side)
  format.ts
drizzle.config.ts
neon.ts, hello.ts   Neon config + sample Neon Function
```

## How the numbers work

- **Consumption** for a reading = its value − the chronologically previous reading (always sorted by date, so back-dated entries slot in correctly). Readings that would make the meter run backwards are rejected.
- **This month** = latest reading this month − meter value on the 1st, linearly interpolated from the readings either side of it (or the first reading of the month if there's nothing earlier).
- **Forecast** = used so far + daily pace × days not yet covered. With no reading yet this month, it projects from the most recent interval.
- Cost = kWh × the single global rate (`settings.rate_per_kwh`, default ฿4.5).
