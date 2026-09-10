"use server";

import { getSupabaseServerClient } from "@/lib/supabase";
import { getIpHash } from "@/lib/ip";

export type FoundBooking = {
  code: string;
  fullName: string;
  startsAt: string;
  status: "confirmed" | "cancelled";
};

type LookupResult = { ok: true; booking: FoundBooking } | { ok: false; error: string };

function mapLookupError(message: string): string {
  if (message.includes("RATE_LIMITED")) {
    return "Demasiados intentos. Espera unos minutos y vuelve a intentar.";
  }
  return "No encontramos ninguna reserva con ese código. Revisa el correo de confirmación.";
}

export async function lookupBooking(code: string): Promise<LookupResult> {
  const ipHash = await getIpHash();
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .rpc("get_booking_by_code", { p_code: code, p_ip_hash: ipHash })
    .single();

  if (error || !data) {
    return { ok: false, error: mapLookupError(error?.message ?? "") };
  }

  const row = data as { booking_code: string; full_name: string; starts_at: string; status: string };
  return {
    ok: true,
    booking: {
      code: row.booking_code,
      fullName: row.full_name,
      startsAt: row.starts_at,
      status: row.status as "confirmed" | "cancelled",
    },
  };
}

export async function cancelBooking(code: string): Promise<{ ok: boolean; error?: string }> {
  const ipHash = await getIpHash();
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.rpc("cancel_booking_by_code", {
    p_code: code,
    p_ip_hash: ipHash,
  });

  if (error) {
    if (error.message.includes("RATE_LIMITED")) {
      return { ok: false, error: "Demasiados intentos. Espera unos minutos y vuelve a intentar." };
    }
    return { ok: false, error: "No pudimos cancelar esa reserva. Intenta de nuevo." };
  }
  return { ok: true };
}
