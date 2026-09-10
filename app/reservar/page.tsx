import { getSupabaseServerClient } from "@/lib/supabase";
import { BookingWizard } from "@/components/BookingWizard";

export const dynamic = "force-dynamic";

export type SlotRow = { id: number; starts_at: string; capacity: number; booked_count: number };

export default async function ReservarPage() {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("slots")
    .select("id, starts_at, capacity, booked_count")
    .order("starts_at");

  return <BookingWizard slots={(data ?? []) as SlotRow[]} />;
}
