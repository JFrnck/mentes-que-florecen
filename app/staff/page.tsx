import { adminListBookings, adminSlotSummary, isAdminAuthed } from "./actions";
import { AdminLogin } from "@/components/AdminLogin";
import { AdminDashboard } from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const authed = await isAdminAuthed();

  return (
    <div className="mqf-fade-in mx-auto max-w-[1240px] px-5 py-[clamp(24px,4vw,44px)] pb-[clamp(40px,7vw,70px)]">
      {authed ? (
        <AdminDashboardData />
      ) : (
        <AdminLogin />
      )}
    </div>
  );
}

async function AdminDashboardData() {
  const [bookings, slots] = await Promise.all([adminListBookings(), adminSlotSummary()]);
  return <AdminDashboard initialBookings={bookings} slots={slots} />;
}
