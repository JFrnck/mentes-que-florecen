"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  adminCancelBooking,
  adminLogout,
  adminSetAttended,
  type AdminBookingRow,
  type AdminSlotSummary,
} from "@/app/staff/actions";
import { formatSlotTime } from "@/lib/format";
import { SITE } from "@/lib/site";

export function AdminDashboard({
  initialBookings,
  slots,
}: {
  initialBookings: AdminBookingRow[];
  slots: AdminSlotSummary[];
}) {
  const [bookings, setBookings] = useState(initialBookings);
  const [filter, setFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [, startTransition] = useTransition();
  const router = useRouter();

  const confirmed = useMemo(() => bookings.filter((b) => b.status === "confirmed"), [bookings]);
  const totalCap = useMemo(() => slots.reduce((s, x) => s + x.capacity, 0), [slots]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings
      .slice()
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at) || a.full_name.localeCompare(b.full_name))
      .filter((b) => filter === null || b.starts_at === filter)
      .filter((b) => !q || `${b.full_name} ${b.email} ${b.booking_code}`.toLowerCase().includes(q));
  }, [bookings, filter, search]);

  function toggleAttend(row: AdminBookingRow) {
    const next = !row.attended;
    setBookings((prev) => prev.map((b) => (b.id === row.id ? { ...b, attended: next } : b)));
    startTransition(async () => {
      const res = await adminSetAttended(row.id, next);
      if (!res.ok) setBookings((prev) => prev.map((b) => (b.id === row.id ? { ...b, attended: !next } : b)));
    });
  }

  function cancelRow(row: AdminBookingRow) {
    setBookings((prev) => prev.map((b) => (b.id === row.id ? { ...b, status: "cancelled", attended: false } : b)));
    startTransition(async () => {
      const res = await adminCancelBooking(row.id);
      if (!res.ok) setBookings((prev) => prev.map((b) => (b.id === row.id ? { ...b, status: row.status } : b)));
    });
  }

  function logout() {
    startTransition(async () => {
      await adminLogout();
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-4">
        <div className="mr-auto">
          <h1 className="font-display text-[clamp(26px,4vw,38px)] font-normal">
            Reservas de la campaña
          </h1>
          <p className="mt-2 text-sm text-mqf-text-soft">
            {SITE.eventDate} · {SITE.venue} · {SITE.capacityPerSlot} cupos por franja
          </p>
        </div>
        <div className="mqf-noprint flex flex-wrap gap-2.5">
          <a
            href="/staff/export"
            className="rounded-full bg-mqf-ink px-5 py-3 text-sm font-semibold text-[#FFFDF8] hover:bg-mqf-green"
          >
            Descargar CSV
          </a>
          <button
            onClick={() => window.print()}
            className="rounded-full border border-mqf-border-btn px-5 py-3 text-sm font-medium text-mqf-ink hover:border-mqf-green"
          >
            Imprimir
          </button>
          <button
            onClick={logout}
            className="rounded-full border border-mqf-border-btn px-4.5 py-3 text-sm text-mqf-text-soft hover:border-mqf-green hover:text-mqf-green"
          >
            Salir
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Confirmadas" value={confirmed.length} />
        <Stat label="Cupos libres" value={totalCap - confirmed.length} />
        <Stat label="Ocupación" value={`${totalCap ? Math.round((confirmed.length / totalCap) * 100) : 0}%`} />
        <Stat label="Menores de 18" value={confirmed.filter((b) => b.age < 18).length} />
        <Stat label="Canceladas" value={bookings.filter((b) => b.status === "cancelled").length} />
      </div>

      <h2 className="mt-8 font-display text-2xl font-normal">Ocupación por franja</h2>
      <div className="mt-3.5 grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {slots.map((s) => {
          const pct = s.capacity ? Math.round((s.booked_count / s.capacity) * 100) : 0;
          const active = filter === s.starts_at;
          return (
            <button
              key={s.slot_id}
              onClick={() => setFilter(active ? null : s.starts_at)}
              className="rounded-2xl border p-3.5 text-left hover:border-mqf-green"
              style={{ background: active ? "#EAF2E4" : "#FFFDF8", borderColor: active ? "#2C6E49" : "#E8E1D0" }}
            >
              <div className="font-display text-lg">{formatSlotTime(s.starts_at)}</div>
              <div className="mt-1 text-[13px] font-semibold text-mqf-text-label">
                {s.booked_count}/{s.capacity}
              </div>
              <div className="mt-2 h-[5px] overflow-hidden rounded-full bg-mqf-border">
                <div className="h-full rounded-full bg-mqf-green" style={{ width: `${pct}%` }} />
              </div>
            </button>
          );
        })}
      </div>

      <div className="mb-3.5 mt-8 flex flex-wrap items-center gap-3.5">
        <h2 className="mr-auto font-display text-2xl font-normal">
          Listado {filter ? `· ${formatSlotTime(filter)}` : "· todas las franjas"}
        </h2>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, correo o código"
          className="mqf-noprint min-w-[240px] rounded-full border border-mqf-border-input bg-white px-3.5 py-2.5 text-mqf-ink focus:border-mqf-green focus:outline-none"
        />
        {filter && (
          <button
            onClick={() => setFilter(null)}
            className="mqf-noprint rounded-full border border-mqf-border-btn px-4 py-2.5 text-[13px] text-mqf-text-soft hover:border-mqf-green"
          >
            Ver todas
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-[18px] border border-mqf-border-card bg-mqf-card">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="bg-mqf-panel text-left">
              {["Hora", "Persona", "Contacto", "Psicólogo", "Estado", "Acciones"].map((h) => (
                <th key={h} className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-mqf-text-soft">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-[#EFE9DA]">
                <td className="whitespace-nowrap px-4 py-3.5 font-display text-[17px]">
                  {formatSlotTime(r.starts_at)}
                </td>
                <td className="px-4 py-3.5">
                  <div className="font-semibold text-mqf-ink">{r.full_name}</div>
                  <div className="text-xs text-mqf-text-softer">
                    {r.age} años{r.age < 18 ? " · menor, requiere autorización" : ""} · {r.booking_code}
                  </div>
                </td>
                <td className="px-4 py-3.5 text-mqf-text-muted">
                  <div>{r.phone}</div>
                  <div className="text-xs text-mqf-text-softer">{r.email}</div>
                </td>
                <td className="px-4 py-3.5 text-mqf-text-muted">{r.psychologist_name}</td>
                <td className="px-4 py-3.5">
                  <StatusBadge row={r} />
                </td>
                <td className="mqf-noprint px-4 py-3.5">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => toggleAttend(r)}
                      className="rounded-full border border-mqf-border-btn px-3 py-1.5 text-xs text-mqf-text-label hover:border-mqf-green hover:text-mqf-green"
                    >
                      {r.attended ? "Quitar asistencia" : "Marcar asistió"}
                    </button>
                    {r.status === "confirmed" && (
                      <button
                        onClick={() => cancelRow(r)}
                        className="rounded-full border border-mqf-error-border-soft px-3 py-1.5 text-xs text-mqf-error-text hover:bg-mqf-error-bg"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-mqf-text-softer">
            No hay reservas que coincidan.
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-mqf-border-card bg-mqf-card p-4.5">
      <div className="text-[11px] uppercase tracking-wider text-mqf-text-softer">{label}</div>
      <div className="mt-1 font-display text-3xl">{value}</div>
    </div>
  );
}

function StatusBadge({ row }: { row: AdminBookingRow }) {
  const label = row.status === "cancelled" ? "Cancelada" : row.attended ? "Asistió" : "Confirmada";
  const bg = row.status === "cancelled" ? "#F3E7E3" : row.attended ? "#EAF2E4" : "#F4F1E6";
  const color = row.status === "cancelled" ? "#8A3A22" : row.attended ? "#2C6E49" : "#5C6B5E";
  return (
    <span className="inline-block rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: bg, color }}>
      {label}
    </span>
  );
}
