import Image from "next/image";
import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabase";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

async function getFreeCount() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("slots").select("capacity, booked_count");
  if (error || !data) return { free: 0, total: 0 };
  const total = data.reduce((sum, s) => sum + s.capacity, 0);
  const booked = data.reduce((sum, s) => sum + s.booked_count, 0);
  return { free: total - booked, total };
}

export default async function HomePage() {
  const { free, total } = await getFreeCount();

  return (
    <div className="mqf-fade-in">
      <section className="mx-auto grid max-w-[1140px] grid-cols-1 items-center gap-10 px-5 py-[clamp(28px,6vw,72px)] md:grid-cols-2 md:gap-14">
        <div>
          <span className="inline-block rounded-full bg-mqf-yellow px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-mqf-ink">
            Atención gratuita · Arequipa
          </span>
          <h1 className="mt-5 font-display text-[clamp(34px,6.2vw,62px)] font-normal leading-[1.06] tracking-[-0.02em] text-balance">
            Un espacio tranquilo para saber cómo estás
          </h1>
          <p className="mt-[18px] max-w-[46ch] text-[clamp(16px,2.2vw,19px)] leading-relaxed text-mqf-text-muted text-pretty">
            Screening gratuito de ansiedad y depresión con psicólogos colegiados, para personas
            de 14 a 29 años. Una conversación de 30 minutos, sin costo y confidencial.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/reservar"
              className="rounded-full bg-mqf-green px-[26px] py-[15px] text-base font-semibold text-[#FFFDF8] transition-colors hover:bg-mqf-ink"
            >
              Reservar mi cita
            </Link>
            <Link
              href="/equipo"
              className="rounded-full border border-mqf-border-btn px-6 py-[15px] text-base font-medium text-mqf-ink transition-colors hover:border-mqf-green"
            >
              Conocer al equipo
            </Link>
          </div>
          <p className="mt-[18px] text-sm text-mqf-text-soft">
            Quedan <strong className="text-mqf-green">{free}</strong> cupos de {total}.
          </p>
        </div>
        <div className="flex justify-center">
          <Image
            src="/brand/logo-mentes-que-florecen.png"
            alt="Mentes que Florecen"
            width={420}
            height={420}
            className="h-auto w-full max-w-[420px]"
          />
        </div>
      </section>

      <section className="mx-auto max-w-[1140px] px-5">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCard label="Fecha" value={SITE.eventDate} />
          <InfoCard label="Horario" value="9:00 a 17:00" />
          <InfoCard label="Lugar" value={SITE.venue} link={SITE.mapsUrl} />
          <div className="rounded-[18px] border border-mqf-ink bg-mqf-ink p-[22px] text-[#F2EFE4]">
            <div className="text-[11px] uppercase tracking-[0.12em] text-[#A8BCA9]">Costo</div>
            <div className="mt-2 font-display text-[22px] leading-tight">Totalmente gratuito</div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1140px] px-5 pt-6">
        <div className="overflow-hidden rounded-[18px] border border-mqf-border-card bg-mqf-card">
          <iframe
            src={SITE.mapsEmbedUrl}
            title={`Mapa: ${SITE.venue}`}
            width="100%"
            height="320"
            style={{ border: 0, display: "block" }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>

      <section className="mx-auto max-w-[1140px] px-5 pt-[clamp(36px,7vw,72px)]">
        <h2 className="font-display text-[clamp(26px,4vw,38px)] font-normal tracking-[-0.01em]">
          Cómo funciona
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-4.5 sm:grid-cols-2 lg:grid-cols-3">
          <StepCard
            n={1}
            title="Eliges tu horario"
            body="Franjas de 30 minutos entre las 9:00 y las 17:00. Reservas con tu nombre y correo, nada más."
          />
          <StepCard
            n={2}
            title="Conversas 30 minutos"
            body="Un psicólogo colegiado aplica un tamizaje breve de ansiedad y depresión y conversa contigo sobre el resultado."
          />
          <StepCard
            n={3}
            title="Te llevas orientación"
            body="Recibes recomendaciones y, si hace falta, la derivación a un servicio de atención continua en la ciudad."
          />
        </div>
        <p className="mt-[18px] max-w-[70ch] text-sm text-mqf-text-soft">
          Un screening no es un diagnóstico ni un tratamiento. Es una primera lectura de cómo
          estás, hecha por un profesional.
        </p>
      </section>

      <section className="mx-auto max-w-[1140px] px-5 pt-[clamp(32px,6vw,60px)]">
        <div className="grid grid-cols-1 gap-6 rounded-[22px] border border-mqf-warn-border bg-mqf-warn-bg p-[clamp(22px,4vw,34px)] md:grid-cols-2">
          <div>
            <span className="inline-block rounded-full bg-mqf-yellow px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-mqf-ink">
              Importante
            </span>
            <h2 className="mt-4 font-display text-[clamp(24px,3.6vw,32px)] font-normal leading-tight">
              Si tienes menos de 18 años, necesitas autorización de tu padre, madre o tutor
            </h2>
          </div>
          <div className="text-[15px] leading-relaxed text-mqf-warn-text">
            <p className="m-0">
              La campaña atiende de <strong>14 a 29 años</strong>. Los adolescentes de 14 a 17
              años pueden reservar, pero el día de la cita deben presentar:
            </p>
            <ul className="mt-3 grid gap-1.5 pl-5">
              <li>Autorización firmada por el padre, madre o tutor legal.</li>
              <li>Copia del documento de identidad de quien autoriza.</li>
              <li>De preferencia, venir acompañado por esa persona.</li>
            </ul>
            <p className="mt-3">
              Sin la autorización no podemos realizar el screening. El formato se envía por
              correo al reservar.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1140px] px-5 py-[clamp(36px,7vw,76px)]">
        <div className="grid grid-cols-1 items-center gap-6 rounded-[24px] bg-mqf-green p-[clamp(28px,5vw,48px)] text-[#F4F1E6] md:grid-cols-2">
          <div>
            <h2 className="font-display text-[clamp(26px,4.2vw,40px)] font-normal leading-[1.15]">
              150 cupos gratuitos. Reserva el tuyo.
            </h2>
            <p className="mt-3.5 max-w-[46ch] text-base leading-relaxed text-[#CFE0CE]">
              10 psicólogos atendiendo en simultáneo, todo el día. Cancela cuando quieras para
              liberar tu cupo.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/reservar"
              className="rounded-full bg-mqf-yellow px-7 py-4 text-base font-bold text-mqf-ink transition-colors hover:bg-[#FFFDF8]"
            >
              Reservar mi cita
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function InfoCard({ label, value, link }: { label: string; value: string; link?: string }) {
  return (
    <div className="rounded-[18px] border border-mqf-border-card bg-mqf-card p-[22px]">
      <div className="text-[11px] uppercase tracking-[0.12em] text-mqf-text-softer">{label}</div>
      <div className="mt-2 font-display text-[22px] leading-tight">{value}</div>
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-sm font-semibold text-mqf-green hover:text-mqf-ink"
        >
          Cómo llegar →
        </a>
      )}
    </div>
  );
}

function StepCard({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="rounded-[20px] border border-mqf-border-card bg-mqf-card p-[26px]">
      <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-mqf-icon-bg text-[15px] font-bold text-mqf-green">
        {n}
      </div>
      <h3 className="mt-4 font-display text-xl font-normal">{title}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-mqf-text-muted">{body}</p>
    </div>
  );
}
