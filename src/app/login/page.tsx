"use client";

import { useActionState } from "react";
import { entrar } from "@/app/acoes";

export default function Login() {
  const [estado, acao, enviando] = useActionState(entrar, null);
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form action={acao} className="w-full max-w-sm rounded-2xl border border-line bg-card p-6">
        <h1 className="text-lg font-semibold">Gestor.IA</h1>
        <p className="mb-5 text-sm text-muted">Rafael Enterprises · use o mesmo login do PaviMax</p>
        <label className="mb-1 block text-sm font-medium" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required
          className="mb-3 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent" />
        <label className="mb-1 block text-sm font-medium" htmlFor="senha">Senha</label>
        <input id="senha" name="senha" type="password" autoComplete="current-password" required
          className="mb-4 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent" />
        {estado?.erro && <p className="mb-3 text-sm text-bad">{estado.erro}</p>}
        <button disabled={enviando}
          className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
