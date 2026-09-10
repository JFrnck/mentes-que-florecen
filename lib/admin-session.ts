import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE_NAME = "mqf_admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 horas

function sign(payload: string): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("Falta ADMIN_SESSION_SECRET en el entorno");
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function createSessionValue(): string {
  const issuedAt = Date.now().toString();
  return `${issuedAt}.${sign(issuedAt)}`;
}

export function isValidSessionValue(value: string | undefined | null): boolean {
  if (!value) return false;
  const [issuedAt, sig] = value.split(".");
  if (!issuedAt || !sig) return false;

  const expected = sign(issuedAt);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  const age = Date.now() - Number(issuedAt);
  return age >= 0 && age < MAX_AGE_SECONDS * 1000;
}

export const ADMIN_COOKIE_MAX_AGE = MAX_AGE_SECONDS;
