import Image from "next/image";
import Link from "next/link";
import { SITE } from "@/lib/site";

const navLinks = [
  { href: "/", label: "Inicio" },
  { href: "/equipo", label: "Psicólogos" },
  { href: "/cancelar", label: "Mi cita" },
];

export function Header() {
  return (
    <header className="mqf-noprint sticky top-0 z-40 border-b border-mqf-border bg-mqf-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1140px] flex-wrap items-center gap-4 px-5 py-3">
        <Link href="/" className="mr-auto flex items-center gap-2.5">
          <Image
            src="/brand/logo-residuos-que-educan.jpg"
            alt="Residuos que Educan"
            width={44}
            height={44}
            className="h-11 w-11 rounded-full object-contain"
          />
          <span className="leading-tight">
            <span className="block font-display text-lg text-mqf-ink">{SITE.name}</span>
            <span className="block text-[11px] uppercase tracking-widest text-mqf-text-soft">
              {SITE.tagline}
            </span>
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-2 text-sm font-medium text-mqf-text-label transition-colors hover:bg-[#EDE8DA] hover:text-mqf-ink"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/reservar"
            className="rounded-full bg-mqf-green px-[18px] py-2.5 text-sm font-semibold text-[#FFFDF8] transition-colors hover:bg-mqf-ink"
          >
            Reservar cita
          </Link>
        </nav>
      </div>
    </header>
  );
}
