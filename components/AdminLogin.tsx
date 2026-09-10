"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminLogin } from "@/app/admin/actions";

export function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    setError(false);
    startTransition(async () => {
      const result = await adminLogin(password);
      if (!result.ok) {
        setError(true);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-[420px]">
      <h1 className="font-display text-[34px] font-normal">Administración</h1>
      <p className="mt-2.5 text-[15px] text-mqf-text-soft">
        Panel interno de la campaña. Acceso solo para el equipo.
      </p>
      <div className="mt-5 grid gap-3.5 rounded-[20px] border border-mqf-border-card bg-mqf-card p-6">
        <label className="grid gap-1.5">
          <span className="text-[13px] font-semibold text-mqf-text-label">Contraseña</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            type="password"
            className="rounded-xl border border-mqf-border-input bg-white px-3.5 py-[13px] text-mqf-ink focus:border-mqf-green focus:outline-none"
          />
        </label>
        <button
          onClick={submit}
          disabled={pending}
          className="rounded-full bg-mqf-green px-5.5 py-3.5 text-[15px] font-semibold text-[#FFFDF8] hover:bg-mqf-ink disabled:opacity-60"
        >
          Entrar
        </button>
        {error && <div className="text-sm text-mqf-error-text">Contraseña incorrecta.</div>}
      </div>
    </div>
  );
}
