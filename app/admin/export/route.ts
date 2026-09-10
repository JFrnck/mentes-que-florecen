import { NextResponse } from "next/server";
import { adminListBookings, isAdminAuthed } from "../actions";
import { formatSlotTime } from "@/lib/format";

function csvEscape(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export async function GET() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const rows = await adminListBookings();
  const sorted = rows
    .slice()
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at) || a.full_name.localeCompare(b.full_name));

  const head = [
    "Codigo",
    "Hora",
    "Nombre",
    "Edad",
    "Correo",
    "Celular",
    "Documento",
    "Psicologo",
    "Primera vez",
    "Tutor",
    "Estado",
    "Asistio",
    "Notas",
  ];

  const lines = sorted.map((b) =>
    [
      b.booking_code,
      formatSlotTime(b.starts_at),
      b.full_name,
      b.age,
      b.email,
      b.phone,
      b.document_id,
      b.psychologist_name,
      b.first_time ?? "",
      b.guardian_name ?? "",
      b.status === "confirmed" ? "Confirmada" : "Cancelada",
      b.attended ? "Si" : "No",
      b.notes ?? "",
    ]
      .map(csvEscape)
      .join(","),
  );

  const csv = "﻿" + [head.map(csvEscape).join(","), ...lines].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="reservas-mentes-que-florecen.csv"',
    },
  });
}
