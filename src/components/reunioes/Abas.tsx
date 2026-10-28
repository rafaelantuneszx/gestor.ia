"use client";

// Abas "Conversa" e "Resumo" da reunião. As duas ficam montadas (a conversa continua tocando ao trocar de aba).
import { useState, type ReactNode } from "react";
import { FileText, MessagesSquare } from "lucide-react";

export function Abas({
  inicial, conversa, resumo, nFalas,
}: {
  inicial: "conversa" | "resumo";
  conversa: ReactNode;
  resumo: ReactNode;
  nFalas: number;
}) {
  const [aba, setAba] = useState(inicial);
  const trocar = (a: "conversa" | "resumo") => {
    setAba(a);
    const u = new URL(window.location.href);
    u.searchParams.set("aba", a);
    u.searchParams.delete("assistir");
    window.history.replaceState(null, "", u);
  };
  const item = (a: "conversa" | "resumo", rotulo: string, Icone: typeof FileText, extra?: string) => (
    <button type="button" role="tab" aria-selected={aba === a} onClick={() => trocar(a)}
      className={`inline-flex h-10 items-center gap-2 rounded-lg px-3.5 text-sm font-medium transition ${
        aba === a ? "bg-card text-text shadow-sm" : "text-muted hover:text-text"}`}>
      <Icone size={16} /> {rotulo}
      {extra && <span className="rounded-full bg-accent-soft px-1.5 text-xs font-semibold text-accent">{extra}</span>}
    </button>
  );
  return (
    <>
      <div role="tablist" className="mb-5 inline-flex rounded-xl bg-line/60 p-1">
        {item("conversa", "Conversa", MessagesSquare, nFalas ? String(nFalas) : undefined)}
        {item("resumo", "Pauta, ata e decisões", FileText)}
      </div>
      <div role="tabpanel" hidden={aba !== "conversa"}>{conversa}</div>
      <div role="tabpanel" hidden={aba !== "resumo"}>{resumo}</div>
    </>
  );
}
