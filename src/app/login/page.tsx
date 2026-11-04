"use client";

import { useActionState } from "react";
import { entrar } from "@/app/acoes";

export default function Login() {
  const [estado, acao, enviando] = useActionState(entrar, null);
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8">
      <form action={acao} className="ios-card w-full max-w-sm rounded-2xl p-6">
        <h1 className="ios-titulo">Gestor.IA</h1>
        <p className="mb-6 mt-1 text-sm text-muted">Agentes capacitados em gestão · use o mesmo login do PaviMax</p>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="ios-campo mb-4" />
        <label className="mb-1.5 block text-sm font-medium" htmlFor="senha">Senha</label>
        <input id="senha" name="senha" type="password" autoComplete="current-password" required className="ios-campo mb-5" />
        {estado?.erro && <p className="mb-3 text-sm text-bad">{estado.erro}</p>}
        <button disabled={enviando}
          className="min-h-12 w-full rounded-full bg-accent-fill px-4 text-[15px] font-semibold text-white disabled:opacity-60">
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
