import Link from "next/link";
import { cookies } from "next/headers";
import { CalendarClock, ChevronRight, FileText, History } from "lucide-react";
import { Agente } from "@/components/Agente";
import { Autonomia } from "@/components/Autonomia";
import { Avatar } from "@/components/Avatar";
import { Decisao } from "@/components/Decisao";
import { MarcarVisto } from "@/components/MarcarVisto";
import { SemAcesso, Topo } from "@/components/Topo";
import { ESTADO_AGUARDANDO_GESTOR, ID_GESTOR, semNomeDoGestor } from "@/lib/banco";
import { autorizado, cadastros, haQuanto, nomeDe, quando, soHora, type Demanda, type Historico } from "@/lib/dados";
import { comEscopo, escopoAtual, ESCOPO_GRUPO } from "@/lib/escopo";
import { hojeEmBrasilia, type Reuniao } from "@/lib/reunioes";
import { supabaseServidor } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const HORA_MS = 3600 * 1000;
const PESO = { alta: 0, media: 1, baixa: 2 } as const;
const PRIORIDADE = {
  alta: ["Prioridade alta", "bg-bad-soft text-bad"],
  media: ["Prioridade média", "bg-warn-soft text-warn"],
  baixa: ["Prioridade baixa", "bg-bg text-muted"],
} as const;
const DECISAO = {
  aprovada: ["Aprovada", "bg-ok-soft text-ok"],
  ajuste: ["Ajuste pedido", "bg-warn-soft text-warn"],
  recusada: ["Recusada", "bg-bad-soft text-bad"],
} as const;
const ESTADO = { aberta: "Aberta", andamento: "Em andamento", feita: "Feita", cancelada: "Cancelada", [ESTADO_AGUARDANDO_GESTOR]: "Aguardando você" };

type Evento = { id: number; ts: string; tipo: string; agente: string; rotina: string; resumo: string | null; empresa?: string | null };
const RE_PARA_GESTOR = new RegExp(`para ${ID_GESTOR}\\b`);

export default async function Hoje() {
  if (!(await autorizado())) return <SemAcesso />;
  const sb = await supabaseServidor();
  const escopo = await escopoAtual();
  const hoje = hojeEmBrasilia();

  // "Fora" = desde o seu último acesso; menos de 1 hora (ou nenhum), mostra as últimas 24 horas.
  const visto = (await cookies()).get("gia_visto")?.value;
  const agora = Date.now();
  const vistoMs = visto ? new Date(decodeURIComponent(visto)).getTime() : NaN;
  const foiFora = Number.isFinite(vistoMs) && agora - vistoMs >= HORA_MS;
  const desde = new Date(foiFora ? vistoMs : agora - 24 * HORA_MS).toISOString();

  const [{ agentes, setores, empresas }, dem, hist, reu, ev] = await Promise.all([
    cadastros(),
    comEscopo(sb.from("central_demandas").select("*"), escopo).order("id", { ascending: false }),
    sb.from("central_demanda_historico").select("*").order("ts"),
    sb.from("central_reunioes").select("id, titulo, agendada_para")
      .eq("estado", "agendada").gte("agendada_para", hoje.inicio).lt("agendada_para", hoje.fim)
      .order("agendada_para"),
    comEscopo(sb.from("central_eventos").select("*"), escopo).gte("ts", desde).in("tipo", ["inicio", "fim", "demanda", "nota"]).order("id").limit(3000),
  ]);

  const reunioesHoje = (reu.data ?? []) as Pick<Reuniao, "id" | "titulo" | "agendada_para">[];
  const reuniaoHoje = reunioesHoje.find((r) => new Date(r.agendada_para!).getTime() >= agora)
    ?? reunioesHoje[reunioesHoje.length - 1] ?? null;
  const demandas = (dem.data ?? []) as Demanda[];
  const historico = (hist.data ?? []) as Historico[];
  const eventos = (ev.data ?? []) as Evento[];
  const nomeSetor = new Map(setores.map((s) => [s.id, s.nome]));
  const nomeEmpresa = new Map(empresas.map((e) => [e.id, e.nome]));
  const empresaDe = (id?: string | null) => (escopo === ESCOPO_GRUPO && id ? nomeEmpresa.get(id) ?? null : null);

  const esperando = demandas
    .filter((d) => d.estado === ESTADO_AGUARDANDO_GESTOR)
    .sort((a, b) => PESO[a.prioridade] - PESO[b.prioridade] || a.criada.localeCompare(b.criada));
  const comAgentes = demandas.filter((d) => d.estado === "aberta" || d.estado === "andamento");
  const decididas = demandas
    .filter((d) => d.decidida_em)
    .sort((a, b) => (b.decidida_em ?? "").localeCompare(a.decidida_em ?? ""))
    .slice(0, 10);

  // Plantão: tarefas concluídas no período e quantos agentes concluíram.
  const interno = (e: Evento) => e.rotina.startsWith("reuniao#") || e.agente === ID_GESTOR;
  const concluidas = eventos.filter((e) => e.tipo === "fim" && !interno(e));
  const nAgentes = new Set(concluidas.map((e) => e.agente)).size;
  const resumo = `${foiFora ? "Enquanto você estava fora" : "Nas últimas 24 horas"}, ${nAgentes} ${nAgentes === 1 ? "agente concluiu" : "agentes concluíram"} ${concluidas.length} ${concluidas.length === 1 ? "tarefa" : "tarefas"}.`;

  // Linha do tempo: até 6 fatos, com o que está acontecendo agora por último.
  const fechou = new Set<string>();
  const abertas: Evento[] = [];
  const limiteAgora = agora - HORA_MS / 2;
  for (const e of [...eventos].reverse()) {
    const k = `${e.agente}|${e.rotina}`;
    if (e.tipo === "fim") fechou.add(k);
    else if (e.tipo === "inicio" && !fechou.has(k) && !interno(e) && new Date(e.ts).getTime() >= limiteAgora) {
      fechou.add(k);
      abertas.push(e);
    }
  }
  const fatos = eventos.filter((e) => !interno(e) && e.tipo !== "inicio" && !(e.tipo === "nota" && /^fala:/i.test(e.resumo ?? "")));
  const agoraNaLinha = abertas.slice(0, 2);
  const linha = fatos.slice(-(6 - agoraNaLinha.length));
  const textoFato = (e: Evento) => `${nomeDe(agentes, e.agente)}: ${semNomeDoGestor(e.resumo || e.rotina)}`;

  return (
    <>
      <Topo aba="hoje" />
      <MarcarVisto />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="ios-titulo mb-3">Hoje</h1>
        <section aria-label="Plantão 24 horas" className="gi-plantao mb-4">
          <Agente texto="Escritório aberto · 24h" />
          <span className="gi-plantao-titulo">{resumo}</span>
          <span className="text-[13px] text-muted">
            {esperando.length === 0 ? "Nada precisa de você" : esperando.length === 1 ? "1 precisa de você" : `${esperando.length} precisam de você`}
          </span>
        </section>

        {reuniaoHoje && (
          <Link href={`/reunioes/${reuniaoHoje.id}`} className="ios-card mb-4 inline-flex max-w-full items-center gap-2 px-3 py-2 text-sm hover:border-accent">
            <CalendarClock size={15} className="shrink-0 text-accent" aria-hidden />
            <span className="truncate">
              <span className="font-medium">Reunião agendada {soHora(reuniaoHoje.agendada_para!)}</span>
              <span className="text-muted"> · {semNomeDoGestor(reuniaoHoje.titulo)}</span>
              {reunioesHoje.length > 1 && <span className="text-muted"> · +{reunioesHoje.length - 1} hoje</span>}
            </span>
          </Link>
        )}

        <div className="grid gap-4 md:grid-cols-5">
          <section className="min-w-0 md:col-span-3">
            <h2 className="ios-secao mb-2">Esperando você{esperando.length > 0 ? ` · ${esperando.length}` : ""}</h2>
            {esperando.length === 0 && (
              <p className="ios-card px-4 py-6 text-center text-muted">Nada esperando a sua decisão. O escritório segue trabalhando.</p>
            )}
            <div className="space-y-3">
              {esperando.map((d) => {
                const autor = agentes.get(d.de);
                const passos = historico.filter((h) => h.demanda_id === d.id);
                const empresa = empresaDe(d.empresa);
                return (
                  <article key={d.id} className="ios-card p-4">
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                      <span className={`rounded-full px-2 py-0.5 font-semibold ${PRIORIDADE[d.prioridade][1]}`}>{PRIORIDADE[d.prioridade][0]}</span>
                      <span className="text-muted">
                        {[empresa, d.setor ? nomeSetor.get(d.setor) : null, `#${d.id}`, haQuanto(d.criada)].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Avatar id={d.de} nome={autor?.nome ?? d.de} setor={autor?.setor} tamanho={44} className="mt-0.5" />
                      <div className="min-w-0">
                        <h3 className="text-[15px] font-semibold leading-snug">{semNomeDoGestor(d.titulo)}</h3>
                        <p className="mt-0.5 text-sm text-muted">Preparado por {autor?.nome ?? d.de}{autor ? `, ${autor.cargo}` : ""}</p>
                      </div>
                    </div>
                    {d.detalhe && <p className="mt-2 whitespace-pre-wrap text-sm">{semNomeDoGestor(d.detalhe)}</p>}
                    <div className="mt-2 flex flex-wrap gap-3 text-sm">
                      {d.documento_id && (
                        <Link href={`/documento/${d.documento_id}`} className="inline-flex items-center gap-1 text-accent">
                          <FileText size={15} aria-hidden /> Abrir documento
                        </Link>
                      )}
                      {passos.length > 0 && (
                        <details className="text-muted">
                          <summary className="inline-flex cursor-pointer items-center gap-1"><History size={15} aria-hidden /> Histórico</summary>
                          <ul className="mt-1 space-y-0.5 text-xs">
                            {passos.map((h) => (
                              <li key={h.id}>{quando(h.ts)} · {nomeDe(agentes, h.por)}: {semNomeDoGestor(h.acao)}{h.nota ? ` (${semNomeDoGestor(h.nota)})` : ""}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                    <div className="mt-3 border-t border-line pt-3"><Decisao id={d.id} /></div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="min-w-0 md:col-span-2">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h2 className="ios-secao">{foiFora ? "Enquanto você estava fora" : "Nas últimas 24 horas"}</h2>
              <Link href="/escritorio" className="inline-flex min-h-8 items-center gap-0.5 text-[13px] text-accent">Ver tudo <ChevronRight size={14} aria-hidden /></Link>
            </div>
            <div className="ios-card px-4 py-1">
              {linha.length === 0 && agoraNaLinha.length === 0 && <p className="py-5 text-center text-sm text-muted">Nada registrado no período.</p>}
              <ol className="gi-linha-tempo">
                {linha.map((e) => {
                  const empresa = empresaDe(e.empresa);
                  const decide = e.tipo === "demanda" && RE_PARA_GESTOR.test(e.rotina);
                  return (
                    <li key={e.id}>
                      <time dateTime={e.ts}>{soHora(e.ts)}</time>
                      <div className="gi-fato break-words" data-tipo={decide ? "decidir" : undefined}>
                        {textoFato(e)}{decide && <b> · esperando você</b>}{empresa ? ` · ${empresa}` : ""}
                      </div>
                    </li>
                  );
                })}
                {agoraNaLinha.map((e) => (
                  <li key={e.id}>
                    <time dateTime={e.ts}>agora</time>
                    <div className="gi-fato break-words" data-tipo="agora">{textoFato(e)}</div>
                  </li>
                ))}
              </ol>
            </div>

            <h2 className="ios-secao mb-2 mt-4">Autonomia {escopo === ESCOPO_GRUPO ? "do grupo" : "da empresa"}</h2>
            <div className="ios-card p-4"><Autonomia /></div>
          </section>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <details className="ios-card p-4">
            <summary className="ios-secao min-h-6 cursor-pointer">Com os agentes · {comAgentes.length}</summary>
            <ul className="mt-3 divide-y divide-line">
              {comAgentes.length === 0 && <li className="py-2 text-sm text-muted">Nenhuma demanda em aberto.</li>}
              {comAgentes.map((d) => (
                <li key={d.id} className="flex items-start gap-3 py-2.5 text-sm">
                  <Avatar id={d.para} nome={nomeDe(agentes, d.para)} setor={agentes.get(d.para)?.setor} tamanho={32} selo={false} className="mt-0.5" />
                  <div className="min-w-0">
                    <div className="font-medium">#{d.id} {semNomeDoGestor(d.titulo)}</div>
                    <div className="text-xs text-muted">
                      {nomeDe(agentes, d.de)} → {nomeDe(agentes, d.para)} · {ESTADO[d.estado]} · {haQuanto(d.atualizada)}
                      {d.decisao && ` · ${DECISAO[d.decisao][0].toLowerCase()} por você`}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </details>
          <details className="ios-card p-4">
            <summary className="ios-secao min-h-6 cursor-pointer">Suas últimas decisões · {decididas.length}</summary>
            <ul className="mt-3 divide-y divide-line">
              {decididas.length === 0 && <li className="py-2 text-sm text-muted">Você ainda não decidiu nada por aqui.</li>}
              {decididas.map((d) => (
                <li key={d.id} className="py-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${DECISAO[d.decisao!][1]}`}>{DECISAO[d.decisao!][0]}</span>
                    <span className="min-w-0 font-medium">#{d.id} {semNomeDoGestor(d.titulo)}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted">
                    {quando(d.decidida_em!)}{d.decisao_nota ? ` · “${semNomeDoGestor(d.decisao_nota)}”` : ""} · agora: {ESTADO[d.estado]}
                  </div>
                </li>
              ))}
            </ul>
          </details>
        </div>
      </main>
    </>
  );
}
