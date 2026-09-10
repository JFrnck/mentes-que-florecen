import Image from "next/image";
import { SITE } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mqf-noprint mt-auto border-t border-mqf-border bg-mqf-panel-2">
      <div className="mx-auto grid max-w-[1140px] grid-cols-1 items-center gap-7 px-5 py-8 sm:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
        <div>
          <div className="font-display text-lg text-mqf-ink">{SITE.name}</div>
          <p className="mt-2 max-w-[34ch] text-[13px] leading-relaxed text-mqf-text-soft">
            Una colaboración entre Residuos que Educan y Consultoría Murillo, con el apoyo de
            Arequipa Somos Todos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <Image
            src="/brand/logo-residuos-que-educan.jpg"
            alt="Residuos que Educan"
            width={120}
            height={40}
            className="h-10 w-auto object-contain mix-blend-multiply"
          />
          <Image
            src="/brand/arequipa-somos-todos.png"
            alt="Arequipa Somos Todos"
            width={120}
            height={34}
            className="h-[34px] w-auto object-contain mix-blend-multiply"
          />
        </div>
        <div className="text-[13px] leading-relaxed text-mqf-text-soft">
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
