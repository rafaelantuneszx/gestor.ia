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
    <button type="button" onClick={() => setEscolha(valor)} aria-pressed={escolha === valor}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold ${
        escolha === valor ? cor : "bg-fill text-text"
      }`}>
      <Icone size={16} /> {rotulo}
    </button>
  );

  return (
    <form action={acao} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="decisao" value={escolha ?? ""} />
      <div className="flex flex-wrap gap-2">
        {botao("aprovada", "Aprovar", Check, "bg-ok-soft text-ok ring-1 ring-inset ring-ok")}
        {botao("ajuste", "Pedir ajuste", PenLine, "bg-warn-soft text-warn ring-1 ring-inset ring-warn")}
        {botao("recusada", "Recusar", X, "bg-bad-soft text-bad ring-1 ring-inset ring-bad")}
      </div>
      {escolha && (
        <>
          <textarea name="nota" rows={2} aria-label="Nota para o agente"
            placeholder={escolha === "aprovada" ? "Comentário para o agente (opcional)"
              : escolha === "ajuste" ? "O que precisa ser ajustado" : "Motivo da recusa"}
            className="ios-campo" />
          {estado?.erro && <p className="text-sm text-bad">{estado.erro}</p>}
          <button disabled={enviando}
            className="min-h-11 rounded-full bg-accent-fill px-6 text-sm font-semibold text-white disabled:opacity-60">
            {enviando ? "Registrando…" : "Confirmar"}
          </button>
        </>
      )}
    </form>
  );
}
