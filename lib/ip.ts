import { createHash } from "node:crypto";
import { headers } from "next/headers";

/** Hashed client IP (never store raw IPs), used only to rate-limit lookups. */
export async function getIpHash(): Promise<string> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown";
  return createHash("sha256").update(ip).digest("hex");
}
