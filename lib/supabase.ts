import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Server-side Supabase client using the public anon key. Every write/read of
 * sensitive data (bookings, admin) goes through `security definer` Postgres
 * functions that enforce their own checks — RLS blocks direct table access.
 */
export function getSupabaseServerClient() {
  return createClient(url, anonKey, {
    auth: { persistSession: false },
  });
}
