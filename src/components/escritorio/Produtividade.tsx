"use client";

// Painel de produtividade dos agentes (reunião #5, 30/10/2026, decisão 4): no canto superior direito do escritório,
// o saldo do dia por agente; um toque na cabeça abre as funções do Rafael que ele cobre, as entregas, as horas
// trabalhadas e o saldo de tempo (horas economizadas, pela régua, menos o tempo do Rafael decidindo as demandas dele).

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, FileText, Gauge, Info, MapPin, Stamp, X,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { FUNCOES, type Modo, type Status } from "@/lib/funcoes-rafael";
import {
  MINUTOS_DECISAO, OUTRA_TAREFA, REGUA, calcularDia, diaDe, fmtHoras, fmtMin, limitesDoDia, nomeDoDia, somarDias,
  type DecisaoRafael, type EventoProd, type ProdAgente, type ProdDia,
} from "@/lib/produtividade";
import { soHoraCliente } from "@/lib/horario";
import { supabaseNavegador } from "@/lib/supabase/browser";
import type { AgenteInfo } from "@/lib/escritorio/modelo";

const ATUALIZAR_MS = 60_000;

async function buscarDia(dia: string): Promise<{ eventos: EventoProd[]; decisoes: DecisaoRafael[] }> {
  const sb = supabaseNavegador();
  const { ini, fim } = limitesDoDia(dia);
  const [ev, hist] = await Promise.all([
    sb.from("central_eventos").select("id, ts, tipo, agente, rotina, resumo, status, documento_id")
      .gte("ts", ini).lt("ts", fim).in("tipo", ["inicio", "passo", "fim", "nota"]).order("id").limit(5000),
    sb.from("central_demanda_historico").select("ts, demanda_id, acao")
      .eq("por", "rafael").like("acao", "decisão:%").gte("ts", ini).lt("ts", fim).order("ts"),
  ]);
  if (ev.error) throw new Error(ev.error.message);
  if (hist.error) throw new Error(hist.error.message);
  const linhas = (hist.data ?? []) as { ts: string; demanda_id: number; acao: string }[];
  const ids = [...new Set(linhas.map((h) => h.demanda_id))];
  const dem = ids.length
    ? await sb.from("central_demandas").select("id, de, titulo").in("id", ids)
    : { data: [] as { id: number; de: string; titulo: string }[], error: null };
  if (dem.error) throw new Error(dem.error.message);
  const porId = new Map((dem.data ?? []).map((d) => [d.id, d]));
  return {
    eventos: (ev.data ?? []) as EventoProd[],
    decisoes: linhas.map((h) => ({
      ts: h.ts, demanda_id: h.demanda_id, acao: h.acao,
      de: porId.get(h.demanda_id)?.de ?? "rafael", titulo: porId.get(h.demanda_id)?.titulo ?? `Demanda #${h.demanda_id}`,
    })),
  };
}

// Dados do dia escolhido. No modo demonstração, calcula sobre os eventos fictícios do escritório (sem decisões).
export function useProdutividade(modo: "real" | "demo", dia: string, eventosDemo: EventoProd[] | undefined) {
  const [bruto, setBruto] = useState<{ dia: string; eventos: EventoProd[]; decisoes: DecisaoRafael[] } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [agora, setAgora] = useState(() => Date.now());
  const hoje = dia === diaDe();

  useEffect(() => {
    if (modo === "demo") return;
    let vivo = true;
    const carregar = async () => {
      try {
        const r = await buscarDia(dia);
        if (!vivo) return;
        setBruto({ dia, ...r });
        setAgora(Date.now());
        setErro(null);
      } catch (e) {
        if (vivo) setErro((e as Error).message);
      }
    };
    carregar();
    if (!hoje) return () => { vivo = false; };
    const t = setInterval(carregar, ATUALIZAR_MS);
    return () => { vivo = false; clearInterval(t); };
  }, [modo, dia, hoje]);

  useEffect(() => {
    if (modo !== "demo") return;
    const t = setInterval(() => setAgora(Date.now()), ATUALIZAR_MS);
    return () => clearInterval(t);
  }, [modo]);

  const prod = useMemo<ProdDia | null>(() => {
    if (modo === "demo") {
      if (!eventosDemo) return null;
      const { ini, fim } = limitesDoDia(dia);
      return calcularDia(eventosDemo.filter((e) => e.ts >= ini && e.ts < fim), [], agora);
    }
    return bruto && bruto.dia === dia ? calcularDia(bruto.eventos, bruto.decisoes, agora) : null;
  }, [modo, eventosDemo, bruto, dia, agora]);

  return { prod, erro, carregando: modo === "real" && (!bruto || bruto.dia !== dia) && !erro };
}

// ---------- pedaços ----------

const VEREDITO: Record<ProdAgente["veredito"], { texto: string; cor: string; anel: string }> = {
  tira: { texto: "Tira trabalho de você", cor: "bg-ok-soft text-ok", anel: "ring-ok" },
  neutro: { texto: "Equilibrado", cor: "bg-bg text-muted", anel: "ring-line" },
  gera: { texto: "Mais aprovação que entrega", cor: "bg-bad-soft text-bad", anel: "ring-bad" },
  parado: { texto: "Sem atividade no dia", cor: "bg-bg text-muted", anel: "ring-transparent" },
};
const MODO: Record<Modo, { texto: string; cor: string }> = {
  entrega: { texto: "Entrega", cor: "bg-ok-soft text-ok" },
  adianta: { texto: "Adianta", cor: "bg-warn-soft text-warn" },
  voce: { texto: "Você", cor: "bg-accent-soft text-accent" },
};
const STATUS: Record<Status, string> = { ativa: "ativa", planejada: "planejada", "sob-demanda": "sob demanda" };
const corSaldo = (h: number) => (h > 0.05 ? "text-ok" : h < -0.05 ? "text-bad" : "text-muted");
const nomeRotina = (r: string) => {
  const m = /^reuniao#(\d+)$/.exec(r);
  if (m) return `Reunião #${m[1]}`;
  const t = r.replace(/-/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
};

type Pessoa = Pick<AgenteInfo, "id" | "nome" | "cargo" | "setor">;
function pessoaDe(agentes: Map<string, AgenteInfo>, id: string): Pessoa {
  const a = agentes.get(id);
  if (a) return a;
  const nome = id.split("-")[0];
  return { id, nome: nome.charAt(0).toUpperCase() + nome.slice(1), cargo: "Agente sem mesa no escritório", setor: null };
}

function Numero({ rotulo, valor, sub, cor = "" }: { rotulo: string; valor: string; sub?: string; cor?: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-bg px-2.5 py-2">
      <div className="truncate text-[11px] text-muted">{rotulo}</div>
      <div className={`text-[15px] font-semibold tabular-nums ${cor}`}>{valor}</div>
      {sub && <div className="truncate text-[10.5px] text-muted">{sub}</div>}
    </div>
  );
}

function Regua() {
  return (
    <div className="space-y-2 text-xs">
      <p className="text-muted">
        <b className="text-text">Horas economizadas são estimativa.</b> Cada rotina que o agente conclui vale o tempo que você
        levaria para fazê-la sozinho, por tipo de tarefa. Rotina com erro não conta.
      </p>
      <table className="w-full">
        <tbody>
          {[...REGUA, OUTRA_TAREFA].map((t) => (
            <tr key={t.id} className="border-t border-line align-top">
              <td className="py-1 pr-2"><div className="font-medium">{t.nome}</div><div className="text-[11px] text-muted">{t.exemplo}</div></td>
              <td className="whitespace-nowrap py-1 text-right font-semibold tabular-nums">{fmtHoras(t.horas)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-muted">
        <b className="text-text">Horas trabalhadas</b> vêm dos eventos início, passo e fim de cada rotina (rotinas ao mesmo tempo
        não contam duas vezes; rotina aberta há mais de 2 h para no último passo).
      </p>
      <p className="text-muted">
        <b className="text-text">Seu tempo aprovando</b> é medido pelas suas decisões na Mesa: quando você decide cartões em
        sequência, conta o intervalo entre uma decisão e a anterior (até 10 min). A primeira de cada sequência usa a régua:
        aprovar {MINUTOS_DECISAO.aprovada} min, recusar {MINUTOS_DECISAO.recusada} min, pedir ajuste {MINUTOS_DECISAO.ajuste} min.
        A demanda conta para o agente que a criou. Reuniões com você não entram aqui.
      </p>
    </div>
  );
}

function Detalhe({ p, pessoa, real, onVoltar, onVerNoEscritorio }: {
  p: ProdAgente | null; pessoa: Pessoa; real: boolean; onVoltar: () => void; onVerNoEscritorio?: () => void;
}) {
  const funcoes = FUNCOES.filter((f) => f.agentes.includes(pessoa.id));
  const v = VEREDITO[p?.veredito ?? "parado"];
  const ordem: (Modo | null)[] = ["entrega", "adianta", "voce", null];
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <button type="button" onClick={onVoltar} aria-label="Voltar para todos"
          className="-ml-1 mt-2 inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-bg"><ChevronLeft size={18} /></button>
        <Avatar id={pessoa.id} nome={pessoa.nome} setor={pessoa.setor} tamanho={46} />
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{pessoa.nome}</div>
          <div className="truncate text-xs text-muted">{pessoa.cargo}</div>
          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${v.cor}`}>{v.texto}</span>
        </div>
        {onVerNoEscritorio && (
          <button type="button" onClick={onVerNoEscritorio} title="Ver a mesa e o terminal"
            className="mt-1 inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-line px-2 text-xs hover:border-accent"><MapPin size={13} /> Mesa</button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <Numero rotulo="Trabalhou" valor={fmtMin(p?.minutosTrabalhados ?? 0)} sub={p?.trabalhandoAgora ? "trabalhando agora" : `${p?.reunioes ?? 0} reunião(ões)`} />
        <Numero rotulo="Entregas" valor={String(p?.entregas.length ?? 0)} sub={`${p?.entregas.filter((e) => e.status === "erro").length ?? 0} com erro`} />
        <Numero rotulo="Economizou do seu tempo" valor={`~${fmtHoras(p?.horasEconomizadas ?? 0)}`} sub="estimativa pela régua" cor="text-ok" />
        <Numero rotulo="Você aprovando" valor={fmtMin(p?.minutosAprovacao ?? 0)} sub={`${p?.aprovacoes.length ?? 0} decisão(ões)`} cor={p?.minutosAprovacao ? "text-bad" : ""} />
      </div>
      <div className="flex items-baseline justify-between rounded-xl border border-line px-3 py-2">
        <span className="text-xs text-muted">Saldo do seu tempo</span>
        <span className={`text-lg font-bold tabular-nums ${corSaldo(p?.saldoHoras ?? 0)}`}>{fmtHoras(p?.saldoHoras ?? 0, true)}</span>
      </div>

      <section>
        <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">Entregas do dia</h3>
        {!p?.entregas.length && <p className="text-xs text-muted">Nenhuma rotina concluída neste dia.</p>}
        <ul className="space-y-1.5">
          {p?.entregas.map((e, i) => (
            <li key={`${e.ts}-${i}`} className="rounded-lg border border-line px-2.5 py-1.5 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="tabular-nums text-muted">{soHoraCliente(e.ts)}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{nomeRotina(e.rotina)}</span>
                {e.status === "erro" ? <span className="text-bad">erro</span>
                  : <span className="whitespace-nowrap text-ok" title={`${e.tipo.nome} (estimativa)`}>~{fmtHoras(e.horas)}</span>}
              </div>
              {e.resumo && <p className="mt-0.5 line-clamp-2 text-muted">{e.resumo}</p>}
              <div className="mt-0.5 flex items-center gap-2 text-[10.5px] text-muted">
                <span>{e.tipo.nome}</span>
                {e.status === "alerta" && <span className="text-warn">com alerta</span>}
                {e.documento_id && real && (
                  <Link href={`/documento/${e.documento_id}`} className="ml-auto inline-flex items-center gap-0.5 text-accent hover:underline"><FileText size={11} /> relatório</Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">Suas decisões nas demandas dele</h3>
        {!p?.aprovacoes.length && <p className="text-xs text-muted">Você não decidiu nenhuma demanda deste agente neste dia.</p>}
        <ul className="space-y-1">
          {p?.aprovacoes.map((a, i) => (
            <li key={`${a.ts}-${i}`} className="flex items-baseline gap-1.5 text-xs">
              <span className="tabular-nums text-muted">{soHoraCliente(a.ts)}</span>
              <span className="min-w-0 flex-1 truncate">#{a.demanda_id} {a.titulo}</span>
              <span className="text-muted">{a.decisao}</span>
              <span className="whitespace-nowrap tabular-nums" title={a.medido ? "medido entre decisões seguidas" : "estimativa pela régua"}>
                {fmtMin(Math.max(1, a.minutos))}{a.medido ? "" : "*"}
              </span>
            </li>
          ))}
        </ul>
        {p?.aprovacoes.some((a) => !a.medido) && <p className="mt-1 text-[10.5px] text-muted">* estimativa pela régua (primeira decisão da sequência)</p>}
      </section>

      <section>
        <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">Suas funções que {pessoa.nome} cobre ({funcoes.length})</h3>
        {funcoes.length === 0 && <p className="text-xs text-muted">Nenhuma função sua está com {pessoa.nome} no quadro de funções.</p>}
        <ul className="space-y-1">
          {ordem.flatMap((m) => funcoes.filter((f) => f.modo === m)).map((f, i) => (
            <li key={i} className="text-xs">
              <div className="flex items-start gap-1.5">
                {f.modo && <span className={`mt-px shrink-0 rounded px-1.5 text-[10.5px] font-medium ${MODO[f.modo].cor}`}>{MODO[f.modo].texto}</span>}
                <span className="min-w-0 flex-1">{f.nome}</span>
              </div>
              <div className="ml-0.5 text-[10.5px] text-muted">{f.area} · {f.quando} · {STATUS[f.status]}{f.ultimo ? ` · você: ${f.ultimo.toLowerCase()}` : ""}</div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// ---------- painel ----------

export function PainelProdutividade({
  prod, erro, carregando, dia, onDia, agentes, agente, onAgente, real, aberto, onAberto, onVerNoEscritorio,
}: {
  prod: ProdDia | null;
  erro: string | null;
  carregando: boolean;
  dia: string;
  onDia: (d: string) => void;
  agentes: Map<string, AgenteInfo>;
  agente: string | null;
  onAgente: (id: string | null) => void;
  real: boolean;
  aberto: boolean;
  onAberto: (v: boolean) => void;
  onVerNoEscritorio: (id: string) => void;
}) {
  const [verRegua, setVerRegua] = useState(false);
  const hoje = diaDe();
  const t = prod?.total;
  const lista = prod?.agentes ?? [];
  const sel = agente ? lista.find((a) => a.agente === agente) ?? null : null;

  const cabecalho = (
    <div className="flex items-center gap-1.5 border-b border-line px-3 py-2">
      <Gauge size={16} className="shrink-0 text-accent" />
      <span className="text-sm font-semibold">Produtividade</span>
      <div className="ml-auto flex items-center rounded-lg border border-line">
        <button type="button" onClick={() => onDia(somarDias(dia, -1))} aria-label="Dia anterior" className="inline-flex size-7 items-center justify-center text-muted hover:text-text"><ChevronLeft size={15} /></button>
        <span className="min-w-[64px] text-center text-xs font-medium">{nomeDoDia(dia)}</span>
        <button type="button" onClick={() => onDia(somarDias(dia, 1))} disabled={dia >= hoje} aria-label="Dia seguinte" className="inline-flex size-7 items-center justify-center text-muted hover:text-text disabled:opacity-30"><ChevronRight size={15} /></button>
      </div>
      <button type="button" onClick={() => onAberto(!aberto)} aria-expanded={aberto} aria-label={aberto ? "Recolher o painel" : "Abrir o painel"}
        className="hidden size-7 items-center justify-center rounded-lg text-muted hover:bg-bg min-[900px]:inline-flex">
        {aberto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      <button type="button" onClick={() => onAberto(false)} aria-label="Fechar" className="inline-flex size-7 items-center justify-center rounded-lg text-muted hover:bg-bg min-[900px]:hidden"><X size={16} /></button>
    </div>
  );

  const corpo = (
    <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2.5">
      {erro && <p className="mb-2 text-xs text-bad">Sem conexão: {erro.slice(0, 80)}</p>}
      {carregando && !prod && <p className="py-6 text-center text-xs text-muted">Carregando o dia…</p>}
      {prod && agente ? (
        <Detalhe p={sel} pessoa={pessoaDe(agentes, agente)} real={real} onVoltar={() => onAgente(null)}
          onVerNoEscritorio={agentes.has(agente) ? () => onVerNoEscritorio(agente) : undefined} />
      ) : prod && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-1.5">
            <Numero rotulo="Horas trabalhadas" valor={fmtMin(t!.minutosTrabalhados)} sub={`${lista.filter((a) => a.minutosTrabalhados > 0).length} agentes`} />
            <Numero rotulo="Entregas" valor={String(t!.entregas)} sub="rotinas concluídas" />
            <Numero rotulo="Economizou do seu tempo" valor={`~${fmtHoras(t!.horasEconomizadas)}`} sub="estimativa pela régua" cor="text-ok" />
            <Numero rotulo="Você aprovando" valor={fmtMin(t!.minutosAprovacao)} sub="decisões na Mesa" cor={t!.minutosAprovacao ? "text-bad" : ""} />
          </div>
          <div className="flex items-baseline justify-between rounded-xl border border-line px-3 py-2">
            <span className="text-xs text-muted">Saldo do seu tempo {nomeDoDia(dia) === "hoje" ? "hoje" : `em ${nomeDoDia(dia)}`}</span>
            <span className={`text-lg font-bold tabular-nums ${corSaldo(t!.saldoHoras)}`}>{fmtHoras(t!.saldoHoras, true)}</span>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
              Por agente <span className="font-normal normal-case tracking-normal">· toque na cabeça</span>
            </div>
            {lista.length === 0 && <p className="text-xs text-muted">Nenhum agente trabalhou neste dia.</p>}
            <div className="grid grid-cols-4 gap-x-1 gap-y-2 min-[900px]:grid-cols-5">
              {lista.map((a) => {
                const pe = pessoaDe(agentes, a.agente);
                return (
                  <button key={a.agente} type="button" onClick={() => onAgente(a.agente)}
                    title={`${pe.nome}: ${fmtMin(a.minutosTrabalhados)} trabalhadas, ${a.entregas.length} entregas, saldo ${fmtHoras(a.saldoHoras, true)}`}
                    className="flex min-w-0 flex-col items-center gap-0.5 rounded-xl px-0.5 py-1 hover:bg-bg focus-visible:outline-2 focus-visible:outline-accent">
                    <span className={`relative rounded-full ring-2 ring-offset-1 ring-offset-card ${VEREDITO[a.veredito].anel}`}>
                      <Avatar id={a.agente} nome={pe.nome} setor={pe.setor} tamanho={38} selo={false} />
                      {a.trabalhandoAgora && <span className="absolute -right-0.5 -top-0.5 size-2.5 animate-pulse rounded-full bg-accent ring-2 ring-card" />}
                    </span>
                    <span className="w-full truncate text-center text-[11px] font-medium">{pe.nome}</span>
                    <span className={`text-[10.5px] font-semibold tabular-nums ${corSaldo(a.saldoHoras)}`}>{fmtHoras(a.saldoHoras, true)}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-muted">
              <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-ok" /> tira trabalho</span>
              <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-bad" /> mais aprovação que entrega</span>
              <span className="inline-flex items-center gap-1"><Clock size={10} /> saldo em horas</span>
              <span className="inline-flex items-center gap-1"><Stamp size={10} /> {lista.reduce((s, a) => s + a.aprovacoes.length, 0)} decisões suas</span>
            </div>
          </div>
        </div>
      )}
      <div className="mt-3 border-t border-line pt-2">
        <button type="button" onClick={() => setVerRegua((v) => !v)} aria-expanded={verRegua}
          className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-text">
          <Info size={12} /> Horas economizadas são estimativa · {verRegua ? "esconder a régua" : "ver a régua"}
        </button>
        {verRegua && <div className="mt-2"><Regua /></div>}
      </div>
    </div>
  );

  return (
    <>
      {/* tela larga: cartão no canto superior direito, abaixo das câmeras */}
      <aside aria-label="Produtividade dos agentes"
        className="absolute right-3 top-[104px] z-30 hidden max-h-[calc(100%-120px)] w-[380px] flex-col overflow-hidden rounded-2xl border border-line bg-card/95 shadow-lg backdrop-blur min-[900px]:flex">
        {cabecalho}
        {aberto ? corpo : prod && (
          <button type="button" onClick={() => onAberto(true)} className="flex items-center gap-3 px-3 py-2 text-left text-xs hover:bg-bg">
            <span className="text-muted">{fmtMin(prod.total.minutosTrabalhados)} trabalhadas · {prod.total.entregas} entregas</span>
            <span className={`ml-auto font-semibold tabular-nums ${corSaldo(prod.total.saldoHoras)}`}>saldo {fmtHoras(prod.total.saldoHoras, true)}</span>
          </button>
        )}
      </aside>

      {/* celular: botão flutuante e painel por baixo */}
      {!aberto && (
        <button type="button" onClick={() => onAberto(true)}
          className="absolute bottom-[92px] right-2 z-30 inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-card/95 px-3 text-sm font-medium shadow-md backdrop-blur min-[900px]:hidden">
          <Gauge size={16} className="text-accent" />
          {prod ? <span className={`tabular-nums ${corSaldo(prod.total.saldoHoras)}`}>{fmtHoras(prod.total.saldoHoras, true)}</span> : "Produtividade"}
        </button>
      )}
      {aberto && (
        <aside aria-label="Produtividade dos agentes"
          className="absolute inset-x-2 bottom-2 z-30 flex h-[62%] flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-lg min-[900px]:hidden">
          {cabecalho}
          {corpo}
        </aside>
      )}
    </>
  );
}

// Uma linha do dia no painel do agente (o que abre ao tocar no boneco).
export function ResumoProdutividade({ p, dia, onAbrir }: { p: ProdAgente | null; dia: string; onAbrir: () => void }) {
  return (
    <button type="button" onClick={onAbrir}
      className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-lg border border-line px-2 py-1 text-[11px] hover:border-accent">
      <Gauge size={12} className="shrink-0 text-accent" />
      <span className="truncate text-muted">
        {nomeDoDia(dia).replace(/^./, (c) => c.toUpperCase())}: {fmtMin(p?.minutosTrabalhados ?? 0)} · {p?.entregas.length ?? 0} entregas · saldo{" "}
        <b className={corSaldo(p?.saldoHoras ?? 0)}>{fmtHoras(p?.saldoHoras ?? 0, true)}</b>
      </span>
    </button>
  );
}
