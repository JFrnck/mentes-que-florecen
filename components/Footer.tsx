import Image from "next/image";
import { SITE } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mqf-noprint mt-auto border-t border-mqf-border bg-mqf-panel-2">
      <div className="mx-auto grid max-w-[1140px] grid-cols-1 items-center gap-7 px-5 py-8 sm:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
        <div className="min-w-0">
          <div className="font-display text-lg text-mqf-ink">{SITE.name}</div>
          <p className="mt-2 max-w-[34ch] text-[13px] leading-relaxed text-mqf-text-soft">
            Una colaboración entre Residuos que Educan y Consultoría Murillo, con el apoyo de
            Arequipa Somos Todos.
          </p>
        </div>
        <div className="min-w-0 flex flex-wrap items-center gap-5">
          <Image
            src="/brand/logo-residuos-que-educan.png"
            alt="Residuos que Educan"
            width={140}
            height={79}
            className="h-10 w-auto object-contain"
          />
          <Image
            src="/brand/logo-consultoria-murillo.png"
            alt="Consultoría Murillo"
            width={1254}
            height={1254}
            className="h-14 w-auto object-contain"
          />
          <Image
            src="/brand/arequipa-somos-todos.png"
            alt="Arequipa Somos Todos"
            width={120}
            height={34}
            className="h-[34px] w-auto object-contain mix-blend-multiply"
          />
        </div>
        <div className="min-w-0 break-words text-[13px] leading-relaxed text-mqf-text-soft">
          <div>
            <strong className="text-mqf-ink">Contacto</strong>
          </div>
          <div>
            <a href={`mailto:${SITE.contactEmail}`} className="hover:text-mqf-green">
              {SITE.contactEmail}
            </a>
          </div>
          <div>
            <a
              href={`https://${SITE.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-mqf-green"
            >
              {SITE.website}
            </a>
          </div>
        </div>
        <div className="min-w-0 break-words text-[13px] leading-relaxed text-mqf-text-soft">
          <div>
            <strong className="text-mqf-ink">¿Necesitas ayuda ahora?</strong>
          </div>
          <div>{SITE.helpline}</div>
          <div>{SITE.emergency}</div>
        </div>
      </div>
    </footer>
  );
}
