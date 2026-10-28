import Link from "next/link";
import { CalendarClock, FileText, History } from "lucide-react";
import { Topo, SemAcesso } from "@/components/Topo";
import { Decisao } from "@/components/Decisao";
import { Avatar } from "@/components/Avatar";
import { autorizado, cadastros, haQuanto, nomeDe, quando, soHora, type Demanda, type Historico } from "@/lib/dados";
import { hojeEmBrasilia, type Reuniao } from "@/lib/reunioes";
import { supabaseServidor } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PESO = { alta: 0, media: 1, baixa: 2 } as const;
const PRIORIDADE = {
  alta: "bg-bad-soft text-bad",
  media: "bg-warn-soft text-warn",
  baixa: "bg-bg text-muted",
} as const;
const DECISAO = {
  aprovada: ["Aprovada", "bg-ok-soft text-ok"],
  ajuste: ["Ajuste pedido", "bg-warn-soft text-warn"],
  recusada: ["Recusada", "bg-bad-soft text-bad"],
} as const;
const ESTADO = { aberta: "Aberta", andamento: "Em andamento", feita: "Feita", cancelada: "Cancelada", "aguardando-rafael": "Aguardando você" };

export default async function Mesa() {
  if (!(await autorizado())) return <SemAcesso />;
  const sb = await supabaseServidor();
  const hoje = hojeEmBrasilia();
  const [{ agentes, setores }, dem, hist, reu] = await Promise.all([
    cadastros(),
    sb.from("central_demandas").select("*").order("id", { ascending: false }),
    sb.from("central_demanda_historico").select("*").order("ts"),
    sb.from("central_reunioes").select("id, titulo, agendada_para")
      .eq("estado", "agendada").gte("agendada_para", hoje.inicio).lt("agendada_para", hoje.fim)
      .order("agendada_para"),
  ]);
  // Reunião de hoje: a próxima que ainda não passou ou, se todas passaram, a última atrasada.
  const reunioesHoje = (reu.data ?? []) as Pick<Reuniao, "id" | "titulo" | "agendada_para">[];
  const agora = Date.now();
  const reuniaoHoje = reunioesHoje.find((r) => new Date(r.agendada_para!).getTime() >= agora)
    ?? reunioesHoje[reunioesHoje.length - 1] ?? null;
  const demandas = (dem.data ?? []) as Demanda[];
  const historico = (hist.data ?? []) as Historico[];
  const nomeSetor = new Map(setores.map((s) => [s.id, s.nome]));

  const aguardando = demandas
    .filter((d) => d.estado === "aguardando-rafael")
    .sort((a, b) => PESO[a.prioridade] - PESO[b.prioridade] || a.criada.localeCompare(b.criada));
  const comAgentes = demandas.filter((d) => d.estado === "aberta" || d.estado === "andamento");
  const decididas = demandas
    .filter((d) => d.decidida_em)
    .sort((a, b) => (b.decidida_em ?? "").localeCompare(a.decidida_em ?? ""))
    .slice(0, 10);

  return (
    <>
      <Topo aba="mesa" pendentes={aguardando.length} />
      <main className="mx-auto max-w-6xl px-4 py-6">
        {reuniaoHoje && (
          <Link href={`/reunioes/${reuniaoHoje.id}`}
            className="mb-4 inline-flex max-w-full items-center gap-2 rounded-lg border border-line bg-card px-3 py-1.5 text-sm hover:border-accent">
            <CalendarClock size={15} className="shrink-0 text-accent" />
            <span className="truncate">
              <span className="font-medium">Reunião agendada {soHora(reuniaoHoje.agendada_para!)}</span>
              <span className="text-muted"> · {reuniaoHoje.titulo}</span>
              {reunioesHoje.length > 1 && <span className="text-muted"> · +{reunioesHoje.length - 1} hoje</span>}
            </span>
          </Link>
        )}
        <div className="mb-6 grid grid-cols-3 gap-3">
          {[
            [aguardando.length, "aguardando você"],
            [comAgentes.length, "com os agentes"],
            [decididas.length, "decididas por você"],
          ].map(([n, rotulo]) => (
            <div key={rotulo} className="rounded-xl border border-line bg-card px-4 py-3">
              <div className="text-2xl font-semibold tabular-nums">{n}</div>
              <div className="text-sm text-muted">{rotulo}</div>
            </div>
          ))}
        </div>

        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Aguardando você</h2>
        {aguardando.length === 0 && (
          <p className="rounded-xl border border-line bg-card px-4 py-6 text-center text-muted">Nada esperando a sua decisão.</p>
        )}
        <div className="space-y-3">
          {aguardando.map((d) => {
            const autor = agentes.get(d.de);
            const passos = historico.filter((h) => h.demanda_id === d.id);
            return (
              <article key={d.id} className="rounded-xl border border-line bg-card p-4">
                <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${PRIORIDADE[d.prioridade]}`}>
                    {d.prioridade === "alta" ? "Prioridade alta" : d.prioridade === "media" ? "Prioridade média" : "Prioridade baixa"}
                  </span>
                  {d.setor && <span className="text-muted">{nomeSetor.get(d.setor)}</span>}
                  <span className="text-muted">· #{d.id} · {haQuanto(d.criada)}</span>
                </div>
                <div className="flex items-start gap-3">
                  <Avatar id={d.de} nome={autor?.nome ?? d.de} setor={autor?.setor} tamanho={44} className="mt-0.5" />
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-semibold leading-snug">{d.titulo}</h3>
                    <p className="mt-0.5 text-sm text-muted">
                      Enviado por {autor?.nome ?? d.de}{autor ? `, ${autor.cargo}` : ""}
                    </p>
                  </div>
                </div>
                {d.detalhe && <p className="mt-2 whitespace-pre-wrap text-sm">{d.detalhe}</p>}
                <div className="mt-2 flex flex-wrap gap-3 text-sm">
                  {d.documento_id && (
                    <Link href={`/documento/${d.documento_id}`} className="inline-flex items-center gap-1 text-accent">
                      <FileText size={15} /> Abrir documento
                    </Link>
                  )}
                  {passos.length > 0 && (
                    <details className="text-muted">
                      <summary className="inline-flex cursor-pointer items-center gap-1"><History size={15} /> Histórico</summary>
                      <ul className="mt-1 space-y-0.5 text-xs">
                        {passos.map((h) => (
                          <li key={h.id}>{quando(h.ts)} · {nomeDe(agentes, h.por)}: {h.acao}{h.nota ? ` (${h.nota})` : ""}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
                <div className="mt-3 border-t border-line pt-3">
                  <Decisao id={d.id} />
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Com os agentes</h2>
            <ul className="divide-y divide-line rounded-xl border border-line bg-card">
              {comAgentes.length === 0 && <li className="px-4 py-3 text-sm text-muted">Nenhuma demanda em aberto.</li>}
              {comAgentes.map((d) => (
                <li key={d.id} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                  <Avatar id={d.para} nome={nomeDe(agentes, d.para)} setor={agentes.get(d.para)?.setor} tamanho={32} selo={false} className="mt-0.5" />
                  <div className="min-w-0">
                    <div className="font-medium">#{d.id} {d.titulo}</div>
                    <div className="text-xs text-muted">
                      {nomeDe(agentes, d.de)} → {nomeDe(agentes, d.para)} · {ESTADO[d.estado]} · {haQuanto(d.atualizada)}
                      {d.decisao && ` · ${DECISAO[d.decisao][0].toLowerCase()} por você`}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Suas últimas decisões</h2>
            <ul className="divide-y divide-line rounded-xl border border-line bg-card">
              {decididas.length === 0 && <li className="px-4 py-3 text-sm text-muted">Você ainda não decidiu nada por aqui.</li>}
              {decididas.map((d) => (
                <li key={d.id} className="px-4 py-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${DECISAO[d.decisao!][1]}`}>{DECISAO[d.decisao!][0]}</span>
                    <span className="font-medium">#{d.id} {d.titulo}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted">
                    {quando(d.decidida_em!)}{d.decisao_nota ? ` · “${d.decisao_nota}”` : ""} · agora: {ESTADO[d.estado]}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </>
  );
}
