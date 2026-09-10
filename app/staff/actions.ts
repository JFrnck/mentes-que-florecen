"use server";

import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase";
import { ADMIN_COOKIE_NAME, ADMIN_COOKIE_MAX_AGE, createSessionValue, isValidSessionValue } from "@/lib/admin-session";

export type AdminBookingRow = {
  id: string;
  booking_code: string;
  starts_at: string;
  full_name: string;
  age: number;
  email: string;
  phone: string;
  document_id: string;
  seat_number: number;
  psychologist_name: string;
  status: "confirmed" | "cancelled";
  attended: boolean;
  first_time: "si" | "no" | null;
  notes: string | null;
  guardian_name: string | null;
  created_at: string;
};

export type AdminSlotSummary = {
  slot_id: number;
  starts_at: string;
  capacity: number;
  booked_count: number;
};

export async function adminLogin(password: string): Promise<{ ok: boolean }> {
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return { ok: false };
  }
  const jar = await cookies();
  jar.set(ADMIN_COOKIE_NAME, createSessionValue(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  return { ok: true };
}

export async function adminLogout(): Promise<void> {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE_NAME);
}

export async function isAdminAuthed(): Promise<boolean> {
  const jar = await cookies();
  return isValidSessionValue(jar.get(ADMIN_COOKIE_NAME)?.value);
}

function adminKey(): string {
  const key = process.env.ADMIN_API_KEY;
  if (!key) throw new Error("Falta ADMIN_API_KEY en el entorno");
  return key;
}

export async function adminListBookings(): Promise<AdminBookingRow[]> {
  if (!(await isAdminAuthed())) return [];
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_list_bookings", { p_admin_key: adminKey() });
  if (error) return [];
  return (data ?? []) as AdminBookingRow[];
}

export async function adminSlotSummary(): Promise<AdminSlotSummary[]> {
  if (!(await isAdminAuthed())) return [];
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_slot_summary", { p_admin_key: adminKey() });
  if (error) return [];
  return (data ?? []) as AdminSlotSummary[];
}

export async function adminSetAttended(id: string, attended: boolean): Promise<{ ok: boolean }> {
  if (!(await isAdminAuthed())) return { ok: false };
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.rpc("admin_set_attended", {
    p_admin_key: adminKey(),
    p_id: id,
    p_attended: attended,
  });
  return { ok: !error };
}

export async function adminCancelBooking(id: string): Promise<{ ok: boolean }> {
  if (!(await isAdminAuthed())) return { ok: false };
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.rpc("admin_cancel_booking", { p_admin_key: adminKey(), p_id: id });
  return { ok: !error };
}
