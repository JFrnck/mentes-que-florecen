"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { SlotRow } from "@/app/reservar/page";
import { submitBooking, joinWaitlist, type BookingConfirmation } from "@/app/reservar/actions";
import { formatSlotTime } from "@/lib/format";
import { downloadBookingIcs } from "@/lib/ics";
import { SITE } from "@/lib/site";

type Step = "slots" | "form" | "confirm";

type FormState = {
  name: string;
  age: string;
  email: string;
  phone: string;
  doc: string;
  first: "" | "si" | "no";
  notes: string;
  gname: string;
  gphone: string;
  gconsent: boolean;
  consent: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  age: "",
  email: "",
  phone: "",
  doc: "",
  first: "",
  notes: "",
  gname: "",
  gphone: "",
  gconsent: false,
  consent: false,
};

const inputClass =
  "rounded-xl border border-mqf-border-input bg-white px-3.5 py-[13px] text-mqf-ink focus:border-mqf-green focus:outline-none";

export function BookingWizard({ slots }: { slots: SlotRow[] }) {
  const [step, setStep] = useState<Step>("slots");
  const [selected, setSelected] = useState<SlotRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistDone, setWaitlistDone] = useState(false);

  const totalCapacity = useMemo(() => slots.reduce((s, x) => s + x.capacity, 0), [slots]);
  const totalBooked = useMemo(() => slots.reduce((s, x) => s + x.booked_count, 0), [slots]);
  const allFull = slots.length > 0 && totalBooked >= totalCapacity;
  const age = parseInt(form.age, 10);
  const isMinor = !!age && age >= 14 && age < 18;

  function setF<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function selectSlot(slot: SlotRow) {
    setSelected(slot);
    setStep("form");
    setError("");
    window.scrollTo(0, 0);
  }

  function submit() {
    if (!selected) return;
    setError("");
    startTransition(async () => {
      const result = await submitBooking({
        slotId: selected.id,
        fullName: form.name,
        age: parseInt(form.age, 10),
        email: form.email,
        phone: form.phone,
        documentId: form.doc,
        firstTime: form.first,
        notes: form.notes,
        guardianName: form.gname,
        guardianPhone: form.gphone,
        guardianConsent: form.gconsent,
        consent: form.consent,
      });
      if (!result.ok) {
        setError(result.error);
        if (result.code === "SLOT_FULL") setStep("slots");
        return;
      }
      setConfirmation(result.booking);
      setStep("confirm");
      setForm(EMPTY_FORM);
      window.scrollTo(0, 0);
    });
  }

  async function submitWaitlist() {
    const res = await joinWaitlist(waitlistEmail, form.name);
    if (res.ok) setWaitlistDone(true);
  }

  return (
    <div className="mqf-fade-in mx-auto max-w-[900px] px-5 py-[clamp(24px,5vw,56px)] pb-[clamp(40px,7vw,80px)]">
      {step === "slots" && (
        <div>
          <h1 className="font-display text-[clamp(28px,4.6vw,44px)] font-normal tracking-[-0.015em]">
            Elige tu horario
          </h1>
          <p className="mt-3 max-w-[58ch] text-base leading-relaxed text-mqf-text-muted">
            {SITE.eventDate} · {SITE.venue}. Cada franja dura 30 minutos. Selecciona la que mejor
            te acomode.
          </p>

          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {slots.map((s) => {
              const full = s.booked_count >= s.capacity;
              const isSelected = selected?.id === s.id;
              return (
                <button
                  key={s.id}
                  disabled={full}
                  onClick={() => selectSlot(s)}
                  className="rounded-2xl border p-4 text-left transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55"
                  style={{
                    background: full ? "#F0EDE2" : "#FFFDF8",
                    borderColor: isSelected ? "#2C6E49" : full ? "#E3DCCB" : "#DCD4C1",
                  }}
                >
                  <div className="font-display text-xl text-mqf-ink">{formatSlotTime(s.starts_at)}</div>
                  <div
                    className="mt-1.5 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: full ? "#9AA39B" : "#2C6E49" }}
                  >
                    {full ? "Lleno" : "Disponible"}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-3.5 rounded-2xl border border-dashed border-mqf-border-input bg-mqf-panel-2 px-4.5 py-3.5 text-sm text-mqf-text-soft">
            1:00 pm — receso de almuerzo, no hay atención.
          </div>

          {allFull && (
            <div className="mt-5 rounded-2xl border border-mqf-warn-border bg-mqf-warn-bg p-5">
              <h3 className="font-display text-xl font-normal">Se agotaron los cupos</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-mqf-warn-text">
                Déjanos tu correo y te avisamos si se libera un espacio o si abrimos una nueva
                fecha.
              </p>
              {waitlistDone ? (
                <p className="mt-3 text-sm font-medium text-mqf-green">
                  Listo, te avisaremos a {waitlistEmail}.
                </p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2.5">
                  <input
                    value={waitlistEmail}
                    onChange={(e) => setWaitlistEmail(e.target.value)}
                    type="email"
                    placeholder="tucorreo@ejemplo.com"
                    className={`${inputClass} min-w-[220px] flex-1`}
                  />
                  <button
                    onClick={submitWaitlist}
                    className="rounded-full bg-mqf-green px-6 py-3 text-sm font-semibold text-[#FFFDF8] hover:bg-mqf-ink"
                  >
                    Avísame
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {step === "form" && selected && (
        <div>
          <button
            onClick={() => setStep("slots")}
            className="border-none bg-transparent p-0 text-sm font-semibold text-mqf-green"
          >
            ← Cambiar horario
          </button>
          <h1 className="mt-3.5 font-display text-[clamp(28px,4.6vw,44px)] font-normal tracking-[-0.015em]">
            Tus datos
          </h1>
          <p className="mt-2.5 text-base text-mqf-text-muted">
            Cita del {SITE.eventDate} a las{" "}
            <strong className="text-mqf-ink">{formatSlotTime(selected.starts_at)}</strong>
          </p>

          <div className="mt-6 grid gap-4.5 rounded-[22px] border border-mqf-border-card bg-mqf-card p-[clamp(20px,4vw,32px)]">
            <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-2">
              <Field label="Nombre y apellidos">
                <input
                  value={form.name}
                  onChange={(e) => setF("name", e.target.value)}
                  placeholder="Ana Quispe Herrera"
                  className={inputClass}
                />
              </Field>
              <Field label="Edad">
                <input
                  value={form.age}
                  onChange={(e) => setF("age", e.target.value)}
                  type="number"
                  min={14}
                  max={29}
                  placeholder="19"
                  className={inputClass}
                />
              </Field>
              <Field label="Correo electrónico">
                <input
                  value={form.email}
                  onChange={(e) => setF("email", e.target.value)}
                  type="email"
                  placeholder="tucorreo@ejemplo.com"
                  className={inputClass}
                />
              </Field>
              <Field label="Celular / WhatsApp">
                <input
                  value={form.phone}
                  onChange={(e) => setF("phone", e.target.value)}
                  placeholder="9XX XXX XXX"
                  className={inputClass}
                />
              </Field>
              <Field label="Documento de identidad">
                <input
                  value={form.doc}
                  onChange={(e) => setF("doc", e.target.value)}
                  placeholder="DNI o carné"
                  className={inputClass}
                />
              </Field>
              <Field label="¿Es tu primera vez buscando apoyo psicológico?">
                <select
                  value={form.first}
                  onChange={(e) => setF("first", e.target.value as FormState["first"])}
                  className={inputClass}
                >
                  <option value="">Prefiero no decirlo</option>
                  <option value="si">Sí, es la primera vez</option>
                  <option value="no">No, ya he ido antes</option>
                </select>
              </Field>
            </div>

            {isMinor && (
              <div className="grid gap-4 rounded-2xl border border-mqf-warn-border bg-mqf-warn-bg p-5">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-mqf-warn-text-strong">
                    Menor de 18 años
                  </div>
                  <p className="mt-2 text-[15px] leading-relaxed text-mqf-warn-text">
                    Necesitamos los datos de tu padre, madre o tutor. Te enviaremos el formato de
                    autorización al correo; debes traerlo firmado el día de la cita.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Nombre del padre, madre o tutor">
                    <input
                      value={form.gname}
                      onChange={(e) => setF("gname", e.target.value)}
                      className={inputClass}
                      style={{ borderColor: "#E0D2A8" }}
                    />
                  </Field>
                  <Field label="Celular del padre, madre o tutor">
                    <input
                      value={form.gphone}
                      onChange={(e) => setF("gphone", e.target.value)}
                      className={inputClass}
                      style={{ borderColor: "#E0D2A8" }}
                    />
                  </Field>
                </div>
                <label className="flex cursor-pointer items-start gap-2.5 text-sm leading-relaxed text-mqf-warn-text">
                  <input
                    type="checkbox"
                    checked={form.gconsent}
                    onChange={(e) => setF("gconsent", e.target.checked)}
                    className="mt-0.5 h-[18px] w-[18px] accent-mqf-green"
                  />
                  <span>
                    Confirmo que mi padre, madre o tutor conoce y autoriza mi participación, y que
                    traeré la autorización firmada.
                  </span>
                </label>
              </div>
            )}

            <Field label="¿Algo que quieras contarle al psicólogo antes? (opcional)">
              <textarea
                value={form.notes}
                onChange={(e) => setF("notes", e.target.value)}
                rows={3}
                placeholder="Puedes dejarlo en blanco."
                className={`${inputClass} resize-y`}
              />
            </Field>

            <div className="rounded-2xl bg-mqf-panel px-4.5 py-4 text-[13px] leading-relaxed text-mqf-text-soft">
              <strong className="text-mqf-ink">Privacidad.</strong> Guardamos tu nombre, correo,
              teléfono y edad solo para organizar la cita y avisarte por correo. No guardamos
              información clínica. Nadie fuera del equipo de la campaña accede a estos datos y los
              eliminamos 60 días después del evento.
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 text-sm leading-relaxed text-mqf-text-label">
              <input
                type="checkbox"
                checked={form.consent}
                onChange={(e) => setF("consent", e.target.checked)}
                className="mt-0.5 h-[18px] w-[18px] accent-mqf-green"
              />
              <span>
                Acepto el uso de mis datos para gestionar esta cita y entiendo que el screening no
                es un diagnóstico médico.
              </span>
            </label>

            {error && (
              <div className="rounded-xl border border-mqf-error-border bg-mqf-error-bg px-4 py-3.5 text-sm text-mqf-error-text">
                {error}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={submit}
                disabled={pending}
                className="rounded-full bg-mqf-green px-7 py-[15px] text-base font-semibold text-[#FFFDF8] hover:bg-mqf-ink disabled:opacity-60"
              >
                {pending ? "Confirmando…" : "Confirmar mi cita"}
              </button>
              <span className="text-[13px] text-mqf-text-softer">
                Recibirás la confirmación por correo.
              </span>
            </div>
          </div>
        </div>
      )}

      {step === "confirm" && confirmation && (
        <div className="rounded-[24px] border border-mqf-border-card bg-mqf-card p-[clamp(24px,5vw,40px)]">
          <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-mqf-icon-bg text-2xl text-mqf-green">
            ✓
          </div>
          <h1 className="mt-5 font-display text-[clamp(28px,4.6vw,42px)] font-normal tracking-[-0.015em]">
            Tu cita está reservada, {confirmation.fullName.split(" ")[0]}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-mqf-text-muted">
            Te enviamos la confirmación a{" "}
            <strong className="text-mqf-ink">{confirmation.email}</strong>. Llega 10 minutos antes
            con tu documento de identidad.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <SummaryCard label="Hora" value={formatSlotTime(confirmation.startsAt)} />
            <SummaryCard label="Fecha" value={SITE.eventDate} />
            <SummaryCard label="Código" value={confirmation.code} />
          </div>

          {confirmation.age < 18 && (
            <div className="mt-4.5 rounded-2xl border border-mqf-warn-border bg-mqf-warn-bg px-5 py-4.5 text-sm leading-relaxed text-mqf-warn-text">
              <strong>Recuerda:</strong> como eres menor de 18 años, debes traer la autorización
              firmada por {confirmation.guardianName} y una copia de su documento de identidad. El
              formato va adjunto en el correo.
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() =>
                downloadBookingIcs({ code: confirmation.code, startsAt: confirmation.startsAt })
              }
              className="rounded-full bg-mqf-ink px-5.5 py-3.5 text-[15px] font-semibold text-[#FFFDF8] hover:bg-mqf-green"
            >
              Añadir al calendario
            </button>
            <Link
              href="/cancelar"
              className="rounded-full border border-mqf-border-btn px-5.5 py-3.5 text-[15px] font-medium text-mqf-ink hover:border-mqf-green"
            >
              Cancelar o consultar mi cita
            </Link>
          </div>
          <p className="mt-4.5 text-[13px] text-mqf-text-softer">
            Si no puedes asistir, cancela con tu código: liberas el cupo para otra persona.
          </p>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[13px] font-semibold text-mqf-text-label">{label}</span>
      {children}
    </label>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-mqf-panel p-4.5">
      <div className="text-[11px] uppercase tracking-[0.12em] text-mqf-text-softer">{label}</div>
      <div className="mt-1.5 font-display text-xl">{value}</div>
    </div>
  );
}
