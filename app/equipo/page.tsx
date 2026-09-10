import { getSupabaseServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Psychologist = { seat_number: number; full_name: string; cpsp: string; specialty: string };

function initials(name: string) {
  return name
    .split(" ")
    .slice(1, 3)
    .map((w) => w[0])
    .join("");
}

export default async function EquipoPage() {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("psychologists")
    .select("seat_number, full_name, cpsp, specialty")
    .order("seat_number");
  const psicologos = (data ?? []) as Psychologist[];

  return (
    <div className="mqf-fade-in mx-auto max-w-[1140px] px-5 py-[clamp(28px,6vw,68px)]">
      <h1 className="font-display text-[clamp(28px,5vw,48px)] font-normal tracking-[-0.015em]">
        Quiénes te van a atender
      </h1>
      <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-mqf-text-muted">
        Diez psicólogos colegiados de Consultoría Murillo atienden en simultáneo durante toda la
        jornada. El profesional se asigna al llegar; no puedes elegirlo al reservar.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {psicologos.map((p) => (
          <div
            key={p.seat_number}
            className="rounded-[20px] border border-mqf-border-card bg-mqf-card p-6"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-mqf-icon-bg font-display text-[17px] text-mqf-green">
              {initials(p.full_name)}
            </div>
            <h3 className="mt-3.5 font-display text-xl font-normal leading-tight">
              {p.full_name}
            </h3>
            <div className="mt-1 text-xs tracking-wider text-mqf-text-softer">
              C.Ps.P. {p.cpsp}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-mqf-text-muted">{p.specialty}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
