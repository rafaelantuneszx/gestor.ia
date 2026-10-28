"use client";

// Aba "Conversa" da reunião: a transcrição em balões (agrupando quem fala) e o "Assistir", que toca a conversa
// com uma voz por agente. Em reunião em andamento, acompanha as falas novas a cada 3 s; com "Ao vivo" ligado,
// fala as novas assim que chegam.
import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { Info, LogIn, Radio } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { agrupar, type Fala } from "@/lib/falas";
import { soHoraCliente } from "@/lib/horario";
import { nomeCurtoVoz } from "@/lib/voz";
import type { EstadoReuniao } from "@/lib/reunioes";
import { Controles, Legenda, type Pessoa } from "./Controles";
import { useFalas } from "./useFalas";
import { useLeitor } from "./useLeitor";

export function Conversa({
  reuniaoId, estadoInicial, falasIniciais, pessoas, participantes, modo, demoBase, autoAssistir = false, linkSala,
}: {
  reuniaoId: number;
  estadoInicial: EstadoReuniao;
  falasIniciais: Fala[];
  pessoas: Pessoa[];
  participantes: string[];
  modo: "real" | "demo";
  demoBase?: number;
  autoAssistir?: boolean;
  linkSala?: string | null;
}) {
  const mapa = useMemo(() => new Map(pessoas.map((p) => [p.id, p])), [pessoas]);
  const { falas, estado, erro } = useFalas({ reuniaoId, inicial: falasIniciais, estadoInicial, modo, demoBase });
  const aoVivo = estado === "em_andamento";
  const leitor = useLeitor({ falas, ids: participantes, aoVivoInicial: false });
  const lista = useRef<HTMLOListElement>(null);

  // Veio pelo botão "Assistir" da lista: começa sozinho (a navegação dentro do site conta como toque do usuário).
  const comecou = useRef(false);
  useEffect(() => {
    if (!autoAssistir || comecou.current || leitor.modo === "carregando" || falas.length === 0) return;
    comecou.current = true;
    if (aoVivo) leitor.setAoVivo(true);
    leitor.play(0);
  }, [autoAssistir, leitor, falas.length, aoVivo]);

  // Rola até a fala atual enquanto toca.
  useEffect(() => {
    if (!leitor.tocando) return;
    const el = lista.current?.querySelector<HTMLElement>(`[data-i="${leitor.indice}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [leitor.indice, leitor.tocando]);

  const grupos = agrupar(falas);
  const vozes = participantes.map((id) => ({ id, p: leitor.perfis[id] })).filter((x) => x.p);

  return (
    <div className="space-y-4">
      {/* player */}
      <section className="sticky top-[57px] z-[5] rounded-2xl border border-line bg-card/95 p-4 shadow-sm backdrop-blur">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          {aoVivo && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-ok-soft px-2 py-0.5 font-semibold text-ok">
              <Radio size={13} className="animate-pulse" /> Reunião ao vivo · novas falas a cada 3 s
            </span>
          )}
          <span className="text-muted">
            {falas.length} {falas.length === 1 ? "fala" : "falas"}
            {leitor.modo === "voz" ? " · uma voz por pessoa" : leitor.modo === "legenda" ? " · só legenda" : ""}
          </span>
          {linkSala && aoVivo && (
            <Link href={linkSala} className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-full bg-text px-3 font-semibold text-card hover:opacity-90">
              <LogIn size={14} /> Entrar na reunião
            </Link>
          )}
        </div>
        <div className="min-h-[72px]">
          <Legenda leitor={leitor} pessoas={mapa} />
        </div>
        <div className="mt-3 border-t border-line pt-3">
          <Controles leitor={leitor} total={falas.length} aoVivoDisponivel={aoVivo} />
        </div>
        {(leitor.aviso || erro) && (
          <p className="mt-2 flex items-start gap-1.5 text-xs text-warn">
            <Info size={14} className="mt-px shrink-0" /> {leitor.aviso ?? `Sem conexão para buscar falas novas (${erro}).`}
          </p>
        )}
      </section>

      {/* transcrição */}
      {falas.length === 0 ? (
        <p className="rounded-xl border border-line bg-card px-4 py-8 text-center text-sm text-muted">
          {aoVivo ? "A reunião começou. As falas aparecem aqui assim que alguém falar." : "Esta reunião não tem falas registradas."}
        </p>
      ) : (
        <ol ref={lista} className="space-y-4" aria-label="Transcrição">
          {grupos.map((g) => {
            const p = mapa.get(g.agente);
            const eu = g.agente === "rafael";
            return (
              <li key={g.itens[0].f.id} className={`flex gap-3 ${eu ? "flex-row-reverse" : ""}`}>
                <Avatar id={g.agente} nome={p?.nome ?? g.agente} setor={p?.setor} tamanho={40}
                  falando={leitor.tocando && g.itens.some((x) => x.i === leitor.indice)} className="mt-5" />
                <div className={`min-w-0 max-w-[85%] sm:max-w-[75%] ${eu ? "items-end text-right" : ""} flex flex-col`}>
                  <div className="mb-1 flex flex-wrap items-baseline gap-x-2 text-xs text-muted">
                    <span className="font-semibold text-text">{p?.nome ?? g.agente}</span>
                    {p?.cargo && <span>{p.cargo}</span>}
                    <span className="tabular-nums">{soHoraCliente(g.itens[0].f.ts)}</span>
                  </div>
                  <div className={`flex flex-col gap-1 ${eu ? "items-end" : "items-start"}`}>
                    {g.itens.map(({ f, i }) => {
                      const atual = i === leitor.indice && (leitor.tocando || leitor.indice > 0);
                      return (
                        <button key={f.id} type="button" data-i={i}
                          onClick={() => leitor.play(i)}
                          title="Tocar a partir daqui"
                          className={`rounded-2xl px-3.5 py-2 text-left text-[15px] leading-relaxed transition ${
                            eu ? "rounded-tr-md bg-accent text-white" : "rounded-tl-md border border-line bg-card"
                          } ${atual ? "ring-2 ring-ok ring-offset-2 ring-offset-bg" : "hover:border-accent"}`}>
                          {f.texto}
                          {g.itens.length > 1 && (
                            <span className={`ml-2 text-[11px] tabular-nums ${eu ? "text-white/70" : "text-muted"}`}>{soHoraCliente(f.ts)}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {vozes.length > 0 && leitor.modo === "voz" && (
        <details className="rounded-xl border border-line bg-card px-4 py-3 text-xs text-muted">
          <summary className="cursor-pointer font-medium text-text">Vozes desta reunião</summary>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {vozes.map(({ id, p }) => (
              <li key={id}>
                <span className="font-medium text-text">{mapa.get(id)?.nome ?? id}</span>: {nomeCurtoVoz(p!.voz)}
                {` · tom ${p!.pitch.toFixed(2).replace(".", ",")}`}
                {p!.genero && !p!.casou ? " (sem voz do mesmo tipo no aparelho; tom ajustado)" : ""}
              </li>
            ))}
          </ul>
          <p className="mt-2">As vozes são as instaladas no seu aparelho; trocam de navegador para navegador.</p>
        </details>
      )}
    </div>
  );
}
