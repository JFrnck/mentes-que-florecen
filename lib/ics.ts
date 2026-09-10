import { SITE } from "./site";

function icsStamp(date: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}${get("month")}${get("day")}T${get("hour")}${get("minute")}${get("second")}`;
}

export function downloadBookingIcs(opts: { code: string; startsAt: string }) {
  const start = new Date(opts.startsAt);
  const end = new Date(start.getTime() + 30 * 60 * 1000);

  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mentes que Florecen//ES",
    "BEGIN:VEVENT",
    `UID:${opts.code}@mentesqueflorecen`,
    `DTSTART;TZID=${SITE.timezone}:${icsStamp(start, SITE.timezone)}`,
    `DTEND;TZID=${SITE.timezone}:${icsStamp(end, SITE.timezone)}`,
    "SUMMARY:Screening de salud mental — Mentes que Florecen",
    `LOCATION:${SITE.venue}`,
    `DESCRIPTION:Código ${opts.code}. Llega 10 minutos antes con tu documento de identidad. Cómo llegar: ${SITE.mapsUrl}`,
    `URL:${SITE.mapsUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([body], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cita-mentes-que-florecen.ics";
  a.click();
  URL.revokeObjectURL(url);
}
