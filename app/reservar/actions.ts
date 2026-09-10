"use server";

import { getSupabaseServerClient } from "@/lib/supabase";

export type BookingInput = {
  slotId: number;
  fullName: string;
  age: number;
  email: string;
  phone: string;
  documentId: string;
  firstTime: "si" | "no" | "";
  notes: string;
  guardianName: string;
  guardianPhone: string;
  guardianConsent: boolean;
  consent: boolean;
};

export type BookingConfirmation = {
  code: string;
  fullName: string;
  email: string;
  startsAt: string;
  age: number;
  guardianName: string | null;
};

export type BookingResult =
  | { ok: true; booking: BookingConfirmation }
  | { ok: false; error: string; code?: string };

const ERROR_MESSAGES: Record<string, string> = {
  AGE_OUT_OF_RANGE: "La campaña atiende de 14 a 29 años. Escribe tu edad dentro de ese rango.",
  CONSENT_REQUIRED: "Necesitamos tu aceptación del uso de datos para reservar.",
  INVALID_PHONE: "Escribe un celular de 9 dígitos.",
  GUARDIAN_REQUIRED:
    "Al ser menor de 18 años necesitamos el nombre y celular de tu padre, madre o tutor, y su autorización.",
  SLOT_NOT_FOUND: "No encontramos esa franja. Elige otra, por favor.",
  SLOT_FULL: "Esa franja se acaba de llenar. Elige otra, por favor.",
  EMAIL_ALREADY_BOOKED:
    'Ya existe una reserva con este correo. Cancélala desde "Mi cita" si quieres cambiar de horario.',
};

function mapError(message: string): { text: string; code?: string } {
  for (const key of Object.keys(ERROR_MESSAGES)) {
    if (message.includes(key)) return { text: ERROR_MESSAGES[key], code: key };
  }
  return { text: "No pudimos completar tu reserva. Intenta de nuevo en unos minutos." };
}

export async function submitBooking(input: BookingInput): Promise<BookingResult> {
  if (!input.fullName.trim() || input.fullName.trim().length < 5) {
    return { ok: false, error: "Escribe tu nombre y apellidos." };
  }
  if (!input.email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email.trim())) {
    return { ok: false, error: "Revisa tu correo electrónico: ahí llega la confirmación." };
  }
  if (!input.documentId.trim()) {
    return { ok: false, error: "Escribe tu documento de identidad." };
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .rpc("book_slot", {
      p_slot_id: input.slotId,
      p_full_name: input.fullName,
      p_age: input.age,
      p_email: input.email,
      p_phone: input.phone,
      p_document_id: input.documentId,
      p_first_time: input.firstTime || null,
      p_notes: input.notes,
      p_guardian_name: input.guardianName,
      p_guardian_phone: input.guardianPhone,
      p_guardian_consent: input.guardianConsent,
      p_consent: input.consent,
    })
    .single();

  if (error) {
    const mapped = mapError(error.message);
    return { ok: false, error: mapped.text, code: mapped.code };
  }

  const row = data as {
    booking_code: string;
    full_name: string;
    email: string;
    starts_at: string;
    age: number;
    guardian_name: string | null;
  };

  return {
    ok: true,
    booking: {
      code: row.booking_code,
      fullName: row.full_name,
      email: row.email,
      startsAt: row.starts_at,
      age: row.age,
      guardianName: row.guardian_name,
    },
  };
}

export async function joinWaitlist(email: string, fullName: string): Promise<{ ok: boolean }> {
  const trimmed = email.trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) return { ok: false };

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("waitlist")
    .insert({ email: trimmed.toLowerCase(), full_name: fullName.trim() || null });

  // ya estaba en la lista de espera: seguimos tratándolo como éxito
  const alreadyOnList = error?.code === "23505";
  return { ok: !error || alreadyOnList };
}
