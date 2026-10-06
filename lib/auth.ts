import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// Household-only gate. The PIN comes from ENERGIE_PIN (never committed). The cookie holds a
// hash of the PIN, so it can't be forged without knowing it, and changing the PIN logs everyone out.
const COOKIE = "energie_unlocked";
const MAX_AGE = 60 * 60 * 24 * 180; // stay unlocked on our phones for ~6 months

function configuredPin(): string | null {
  const pin = process.env.ENERGIE_PIN?.trim().toUpperCase();
  return pin ? pin : null;
}

function token(pin: string) {
  return createHash("sha256").update(`energie:${pin}`).digest("hex");
}

function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function isPinConfigured() {
  return configuredPin() != null;
}

export function checkPin(input: string) {
  const pin = configuredPin();
  return pin != null && same(input.trim().toUpperCase(), pin);
}

export async function isUnlocked() {
  const pin = configuredPin();
  const value = (await cookies()).get(COOKIE)?.value;
  return pin != null && value != null && same(value, token(pin));
}

export async function setUnlocked(on: boolean) {
  const jar = await cookies();
  const pin = configuredPin();
  if (on && pin) {
    jar.set(COOKIE, token(pin), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: MAX_AGE,
      path: "/",
    });
  } else {
    jar.delete(COOKIE);
  }
}

export async function requireUnlocked() {
  if (!(await isUnlocked())) throw new Error("Locked");
}
