"use client";

import { useActionState, useState } from "react";
import { Check, PenLine, X } from "lucide-react";
import { decidir } from "@/app/acoes";

type Escolha = "aprovada" | "ajuste" | "recusada";

export function Decisao({ id }: { id: number }) {
  const [estado, acao, enviando] = useActionState(decidir, null);
  const [escolha, setEscolha] = useState<Escolha | null>(null);

  if (estado?.ok) return <p className="text-sm font-medium text-ok">Decisão registrada. O agente continua na próxima rodada.</p>;

  const botao = (valor: Escolha, rotulo: string, Icone: typeof Check, cor: string) => (
    <button type="button" onClick={() => setEscolha(valor)}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium ${
        escolha === valor ? cor : "border-line text-text hover:bg-bg"
      }`}>
      <Icone size={15} /> {rotulo}
    </button>
  );

  return (
    <form action={acao} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="decisao" value={escolha ?? ""} />
      <div className="flex flex-wrap gap-2">
        {botao("aprovada", "Aprovar", Check, "border-ok bg-ok-soft text-ok")}
        {botao("ajuste", "Pedir ajuste", PenLine, "border-warn bg-warn-soft text-warn")}
        {botao("recusada", "Recusar", X, "border-bad bg-bad-soft text-bad")}
      </div>
      {escolha && (
        <>
          <textarea name="nota" rows={2}
            placeholder={escolha === "aprovada" ? "Comentário para o agente (opcional)"
              : escolha === "ajuste" ? "O que precisa ser ajustado" : "Motivo da recusa"}
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent" />
          {estado?.erro && <p className="text-sm text-bad">{estado.erro}</p>}
          <button disabled={enviando}
            className="rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60">
            {enviando ? "Registrando…" : "Confirmar"}
          </button>
        </>
      )}
    </form>
  );
}
