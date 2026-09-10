"use client";

import { useState, useTransition } from "react";
import { lookupBooking, cancelBooking, type FoundBooking } from "./actions";
import { formatSlotTime } from "@/lib/format";
import { SITE } from "@/lib/site";

export default function CancelarPage() {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [found, setFound] = useState<FoundBooking | null>(null);
  const [pending, startTransition] = useTransition();

  function search() {
    setMessage("");
    setFound(null);
    startTransition(async () => {
      const result = await lookupBooking(code);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setFound(result.booking);
    });
  }

  function doCancel() {
    if (!found) return;
    startTransition(async () => {
      const result = await cancelBooking(found.code);
      if (!result.ok) {
        setMessage(result.error ?? "No pudimos cancelar esa reserva.");
        return;
      }
      setFound({ ...found, status: "cancelled" });
      setMessage("Tu cita fue cancelada y el cupo quedó libre. Puedes reservar otro horario cuando quieras.");
    });
  }

  return (
    <div className="mqf-fade-in mx-auto max-w-[620px] px-5 py-[clamp(28px,6vw,72px)] pb-[clamp(40px,7vw,80px)]">
      <h1 className="font-display text-[clamp(28px,4.6vw,42px)] font-normal tracking-[-0.015em]">
        Mi cita
      </h1>
      <p className="mt-3 text-base leading-relaxed text-mqf-text-muted">
        Ingresa el código que recibiste por correo para ver o cancelar tu reserva.
      </p>

      <div className="mt-5.5 grid gap-4 rounded-[22px] border border-mqf-border-card bg-mqf-card p-[clamp(20px,4vw,30px)]">
        <label className="grid gap-1.5">
          <span className="text-[13px] font-semibold text-mqf-text-label">Código de reserva</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="MQF-1234"
            className="rounded-xl border border-mqf-border-input bg-white px-3.5 py-[13px] tracking-wider text-mqf-ink focus:border-mqf-green focus:outline-none"
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={search}
            disabled={pending || !code.trim()}
            className="rounded-full bg-mqf-green px-6 py-3.5 text-[15px] font-semibold text-[#FFFDF8] hover:bg-mqf-ink disabled:opacity-60"
          >
            Buscar
          </button>
        </div>

        {message && (
          <div className="rounded-xl bg-mqf-panel px-4 py-3.5 text-sm leading-relaxed text-mqf-text-label">
            {message}
          </div>
        )}

        {found && (
          <div className="rounded-2xl border border-mqf-border-card p-4.5">
            <div className="font-display text-xl">
              {formatSlotTime(found.startsAt)} · {found.fullName}
            </div>
            <div className="mt-1 text-sm text-mqf-text-soft">
              {found.status === "confirmed"
                ? `${SITE.eventDate} · reserva confirmada`
                : "Esta reserva ya fue cancelada."}
            </div>
            {found.status === "confirmed" && (
              <button
                onClick={doCancel}
                disabled={pending}
                className="mt-4 rounded-full border border-[#D9A79A] px-5 py-2.5 text-sm font-semibold text-mqf-error-text hover:bg-mqf-error-bg disabled:opacity-60"
              >
                Cancelar esta cita
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
