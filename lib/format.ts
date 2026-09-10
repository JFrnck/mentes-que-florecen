import { SITE } from "./site";

const timeFormatter = new Intl.DateTimeFormat("es-PE", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: SITE.timezone,
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: SITE.timezone,
});

export function formatSlotTime(iso: string): string {
  return timeFormatter.format(new Date(iso)).replace("a. m.", "am").replace("p. m.", "pm");
}

export function formatSlotDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}
