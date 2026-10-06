import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type DB = NeonHttpDatabase<typeof schema>;
let instance: DB | undefined;

// Connect on first query, not at import, so `next build` works without DATABASE_URL.
function connect(): DB {
  if (!instance) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set. Run `neon env pull` or check .env.local.");
    }
    // Pooled connection string, queried over Neon's HTTP driver.
    instance = drizzle(neon(process.env.DATABASE_URL), { schema });
  }
  return instance;
}

export const db = new Proxy({} as DB, {
  get(_, prop) {
    const target = connect();
    const value = Reflect.get(target, prop);
    return typeof value === "function" ? value.bind(target) : value;
  },
});
