// Edge Function: envía confirmaciones y recordatorios por correo (Brevo).
//
// Disparadores:
// - Database Webhook (insert en `bookings`): payload { type, table, record }
// - pg_cron (recordatorios 24h/1h): payload { kind, booking_id }
//
// Secretos usados (via `supabase secrets set`): BREVO_API_KEY.
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase automáticamente.

import { createClient } from "jsr:@supabase/supabase-js@2";

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY")!;
const FROM_EMAIL = Deno.env.get("MAIL_FROM_EMAIL") ?? "hola@mentesqueflorecen.pe";
const FROM_NAME = "Mentes que Florecen";
const VENUE = Deno.env.get("EVENT_VENUE") ?? "Sede por confirmar, Arequipa";
const TIMEZONE = "America/Lima";

type Kind = "confirmation" | "reminder_24h" | "reminder_1h";

const SENT_AT_COLUMN: Record<Kind, string> = {
  confirmation: "confirmation_sent_at",
  reminder_24h: "reminder_24h_sent_at",
  reminder_1h: "reminder_1h_sent_at",
};

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("es-PE", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: TIMEZONE,
  })
    .format(new Date(iso))
    .replace("a. m.", "am")
    .replace("p. m.", "pm");
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TIMEZONE,
  }).format(new Date(iso));
}

function wrapEmail(title: string, bodyHtml: string): string {
  return `
  <div style="font-family: 'Manrope', Arial, sans-serif; background:#F7F4EC; padding:28px 16px;">
    <div style="max-width:520px; margin:0 auto; background:#FFFDF8; border:1px solid #E8E1D0; border-radius:20px; padding:32px;">
      <div style="font-family: Georgia, serif; font-size:20px; color:#14351F; margin-bottom:4px;">Mentes que Florecen</div>
      <div style="font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color:#6B7A6D; margin-bottom:24px;">Campaña gratuita de salud mental</div>
      <h1 style="font-family: Georgia, serif; font-weight:400; font-size:24px; color:#14351F; margin:0 0 16px;">${title}</h1>
      ${bodyHtml}
      <p style="font-size:12px; color:#8A9A8C; margin-top:32px; border-top:1px solid #E3DCCB; padding-top:16px;">
        ¿Necesitas ayuda ahora? Línea 113, opción 5 — salud mental, 24 h. Emergencias: 106.
      </p>
    </div>
  </div>`;
}

function confirmationEmail(b: BookingRow) {
  const guardianNote =
    b.age < 18
      ? `<div style="background:#FFF8E1; border:1px solid #F0DFA6; border-radius:14px; padding:16px 18px; font-size:14px; line-height:1.6; color:#43502F; margin-top:16px;">
           <strong>Como eres menor de 18 años</strong>, debes traer el día de la cita: autorización firmada por ${b.guardian_name ?? "tu padre, madre o tutor"}, y una copia de su documento de identidad.
         </div>`
      : "";
  return {
    subject: `Tu cita está confirmada — ${formatTime(b.starts_at)}, ${formatDate(b.starts_at)}`,
    html: wrapEmail(
      `Tu cita está reservada, ${b.full_name.split(" ")[0]}`,
      `<p style="font-size:15px; line-height:1.6; color:#4A5A4C;">Te esperamos el <strong>${formatDate(b.starts_at)}</strong> a las <strong>${formatTime(b.starts_at)}</strong> en ${VENUE}. Llega 10 minutos antes con tu documento de identidad.</p>
       <div style="background:#F4F1E6; border-radius:14px; padding:16px 18px; margin:16px 0;">
         <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.08em; color:#8A9A8C;">Código de reserva</div>
         <div style="font-family:Georgia, serif; font-size:22px; color:#14351F;">${b.booking_code}</div>
       </div>
       <p style="font-size:14px; color:#6B7A6D;">Si no puedes asistir, cancela desde "Mi cita" en la web con este código para liberar el cupo a otra persona.</p>
       ${guardianNote}`,
    ),
  };
}

function reminderEmail(b: BookingRow, kind: "reminder_24h" | "reminder_1h") {
  const when = kind === "reminder_24h" ? "mañana" : "en aproximadamente una hora";
  return {
    subject: `Recordatorio: tu cita es ${when} a las ${formatTime(b.starts_at)}`,
    html: wrapEmail(
      `Nos vemos ${when}, ${b.full_name.split(" ")[0]}`,
      `<p style="font-size:15px; line-height:1.6; color:#4A5A4C;">Tu cita de screening es el <strong>${formatDate(b.starts_at)}</strong> a las <strong>${formatTime(b.starts_at)}</strong> en ${VENUE}. Llega 10 minutos antes con tu documento de identidad.</p>
       <div style="background:#F4F1E6; border-radius:14px; padding:16px 18px; margin:16px 0;">
         <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.08em; color:#8A9A8C;">Código de reserva</div>
         <div style="font-family:Georgia, serif; font-size:22px; color:#14351F;">${b.booking_code}</div>
       </div>
       <p style="font-size:14px; color:#6B7A6D;">Si ya no puedes asistir, cancela con tu código para liberar el cupo.</p>`,
    ),
  };
}

type BookingRow = {
  id: string;
  booking_code: string;
  full_name: string;
  email: string;
  age: number;
  guardian_name: string | null;
  status: string;
  starts_at: string;
};

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const bookingId: string | undefined = payload.record?.id ?? payload.booking_id;
    const kind: Kind = payload.kind ?? "confirmation";

    if (!bookingId) {
      return new Response("missing booking id", { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: booking, error } = await supabase
      .from("bookings")
      .select("id, booking_code, full_name, email, age, guardian_name, status, slots(starts_at)")
      .eq("id", bookingId)
      .single();

    if (error || !booking || booking.status !== "confirmed") {
      return new Response("skip", { status: 200 });
    }

    const row: BookingRow = {
      id: booking.id,
      booking_code: booking.booking_code,
      full_name: booking.full_name,
      email: booking.email,
      age: booking.age,
      guardian_name: booking.guardian_name,
      status: booking.status,
      // @ts-expect-error: nested relation shape from PostgREST
      starts_at: booking.slots.starts_at,
    };

    const { subject, html } =
      kind === "confirmation" ? confirmationEmail(row) : reminderEmail(row, kind);

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: FROM_NAME, email: FROM_EMAIL },
        to: [{ email: row.email, name: row.full_name }],
        subject,
        htmlContent: html,
      }),
    });

    if (!res.ok) {
      console.error("brevo error", res.status);
      return new Response("email provider error", { status: 502 });
    }

    await supabase
      .from("bookings")
      .update({ [SENT_AT_COLUMN[kind]]: new Date().toISOString() })
      .eq("id", bookingId);

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("send-email error", err);
    return new Response("internal error", { status: 500 });
  }
});
