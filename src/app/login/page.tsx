"use client";

import { useActionState } from "react";
import { entrar } from "@/app/acoes";
import { Logo } from "@/components/marca/Logo";

export default function Login() {
  const [estado, acao, enviando] = useActionState(entrar, null);
  return (
    <main className="grid min-h-dvh md:grid-cols-2">
      <section aria-hidden className="relative hidden flex-col justify-end overflow-hidden bg-noite p-10 md:flex"
        style={{ backgroundImage: "linear-gradient(to top, var(--noite) 38%, transparent 72%), url(/marca/grafismo-trilhas-escuro.svg)", backgroundPosition: "right top", backgroundSize: "cover", backgroundRepeat: "no-repeat" }}>
        <p className="font-display text-[44px] font-bold leading-none tracking-[-0.025em] text-on-marca">
          Seu escritório<br />remoto 24 horas
        </p>
        <p className="mt-3 font-display text-xs font-medium tracking-[0.04em] text-marca-300">Sua empresa e seu grupo em um só lugar</p>
      </section>
      <section className="flex items-center justify-center bg-bg p-8">
        <form action={acao} className="grid w-full max-w-[340px] gap-3">
          <Logo simbolo altura={56} className="mx-auto mb-2 md:mx-0" />
          <h1 className="ios-titulo text-center md:text-left">Entrar no Gestor.IA</h1>
          <p className="mb-2 text-center text-sm text-muted md:text-left">Use o mesmo login do PaviMax.</p>
          <input name="email" type="email" autoComplete="email" required aria-label="E-mail" placeholder="E-mail" className="ios-campo" />
          <input name="senha" type="password" autoComplete="current-password" required aria-label="Senha" placeholder="Senha" className="ios-campo" />
          {estado?.erro && <p className="text-sm text-bad">{estado.erro}</p>}
          <button disabled={enviando}
            className="min-h-11 w-full rounded-full bg-accent-fill px-4 text-sm font-semibold text-white disabled:opacity-60">
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}
