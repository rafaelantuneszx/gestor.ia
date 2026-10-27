import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CalendarClock, ChevronLeft, FileText, Inbox, Users } from "lucide-react";
import { diaEHora, emQuanto, haQuanto, nomeDe, quando, type Agente } from "@/lib/dados";
import {
  ESTADO_DECISAO, ESTADO_REUNIAO, decisoesDe, horaReferencia, itensPauta, presentes, proximaAgendada,
  type DecisaoReuniao, type Reuniao,
} from "@/lib/reunioes";

type Agentes = Map<string, Agente>;

function Selo({ r }: { r: Pick<Reuniao, "estado"> }) {
  const e = ESTADO_REUNIAO[r.estado];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${e.classe}`}>
      {r.estado === "em_andamento" && <span className="size-1.5 animate-pulse rounded-full bg-ok" />}
      {e.rotulo}
    </span>
  );
}

function quandoTexto(r: Reuniao) {
  const ref = horaReferencia(r);
  if (!ref) return "sem horário";
  if (r.estado === "agendada") return diaEHora(ref);
  if (r.estado === "em_andamento") return `começou ${haQuanto(ref)}`;
  return diaEHora(ref);
}

function Pessoas({ ids, agentes }: { ids: string[]; agentes: Agentes }) {
  return (
    <div className="flex flex-wrap gap-1">
      {ids.map((id) => (
        <span key={id} className="rounded-full border border-line bg-bg px-2 py-0.5 text-xs" title={agentes.get(id)?.cargo}>
          {nomeDe(agentes, id)}
        </span>
      ))}
    </div>
  );
}

function ResumoDecisoes({ decisoes }: { decisoes: DecisaoReuniao[] }) {
  if (decisoes.length === 0) return <span className="text-xs text-muted">Sem decisões registradas</span>;
  const cont = new Map<string, number>();
  for (const d of decisoes) cont.set(d.estado ?? "pendente", (cont.get(d.estado ?? "pendente") ?? 0) + 1);
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="text-muted">{decisoes.length} {decisoes.length === 1 ? "decisão" : "decisões"}:</span>
      {(["pendente", "aprovada", "recusada", "feita"] as const).filter((e) => cont.get(e)).map((e) => (
        <span key={e} className={`rounded-full px-2 py-0.5 font-semibold ${ESTADO_DECISAO[e].classe}`}>
          {cont.get(e)} {ESTADO_DECISAO[e].rotulo.toLowerCase()}{(cont.get(e) ?? 0) > 1 ? "s" : ""}
        </span>
      ))}
    </div>
  );
}

export function CartaoReuniao({ r, agentes, base }: { r: Reuniao; agentes: Agentes; base: string }) {
  const pauta = itensPauta(r);
  const convocou = agentes.get(r.convocada_por);
  return (
    <article className="rounded-xl border border-line bg-card p-4 transition hover:border-accent">
      <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
        <Selo r={r} />
        <span className="text-muted">{quandoTexto(r)} · #{r.id}</span>
      </div>
      <h3 className="text-[15px] font-semibold leading-snug">
        <Link href={`${base}/${r.id}`} className="hover:text-accent">{r.titulo}</Link>
      </h3>
      <p className="mt-0.5 text-sm text-muted">
        Convocada por {nomeDe(agentes, r.convocada_por)}{convocou ? `, ${convocou.cargo}` : ""}
      </p>
      <div className="mt-2">
        <Pessoas ids={presentes(r)} agentes={agentes} />
      </div>
      {pauta.length > 0 && (
        <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-sm">
          {pauta.slice(0, 4).map((p, i) => <li key={i}>{p}</li>)}
          {pauta.length > 4 && <li className="list-none text-xs text-muted">+ {pauta.length - 4} itens</li>}
        </ol>
      )}
      <div className="mt-3 border-t border-line pt-2">
        <ResumoDecisoes decisoes={decisoesDe(r)} />
      </div>
    </article>
  );
}

function Secao({ titulo, vazio, children, n }: { titulo: string; vazio: string; children: React.ReactNode; n: number }) {
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">{titulo}{n > 0 ? ` · ${n}` : ""}</h2>
      {n === 0 ? (
        <p className="rounded-xl border border-line bg-card px-4 py-6 text-center text-sm text-muted">{vazio}</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">{children}</div>
      )}
    </section>
  );
}

export function ListaReunioes({ reunioes, agentes, base }: { reunioes: Reuniao[]; agentes: Agentes; base: string }) {
  const andamento = reunioes.filter((r) => r.estado === "em_andamento");
  const agendadas = reunioes
    .filter((r) => r.estado === "agendada")
    .sort((a, b) => (a.agendada_para ?? "9").localeCompare(b.agendada_para ?? "9"));
  const encerradas = reunioes
    .filter((r) => r.estado === "encerrada" || r.estado === "cancelada")
    .sort((a, b) => (b.encerrada_em ?? b.atualizado_em).localeCompare(a.encerrada_em ?? a.atualizado_em))
    .slice(0, 30);
  const proxima = proximaAgendada(agendadas);

  return (
    <>
      {proxima && (
        <Link href={`${base}/${proxima.id}`}
          className="mb-6 flex items-center gap-3 rounded-xl border border-warn/40 bg-warn-soft px-4 py-3 text-warn transition hover:border-warn">
          <CalendarClock size={22} className="shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-semibold">
              Próxima reunião {diaEHora(proxima.agendada_para!)} · {emQuanto(proxima.agendada_para!)}
            </div>
            <div className="truncate text-sm text-text">
              {proxima.titulo} <span className="text-muted">· {presentes(proxima).map((id) => nomeDe(agentes, id)).join(", ")}</span>
            </div>
          </div>
        </Link>
      )}
      <Secao titulo="Em andamento" vazio="Nenhuma reunião acontecendo agora." n={andamento.length}>
        {andamento.map((r) => <CartaoReuniao key={r.id} r={r} agentes={agentes} base={base} />)}
      </Secao>
      <Secao titulo="Próximas" vazio="Nenhuma reunião agendada." n={agendadas.length}>
        {agendadas.map((r) => <CartaoReuniao key={r.id} r={r} agentes={agentes} base={base} />)}
      </Secao>
      <Secao titulo="Encerradas" vazio="Nenhuma reunião encerrada ainda." n={encerradas.length}>
        {encerradas.map((r) => <CartaoReuniao key={r.id} r={r} agentes={agentes} base={base} />)}
      </Secao>
    </>
  );
}

export type Vinculos = {
  demanda: { id: number; titulo: string; estado: string } | null;
  documento: { id: string; titulo: string } | null;
};

export function DetalheReuniao({
  r, agentes, base, vinculos, linkDemanda = "/", linkDocumento = (id: string) => `/documento/${id}`,
}: {
  r: Reuniao;
  agentes: Agentes;
  base: string;
  vinculos: Vinculos;
  linkDemanda?: string;
  linkDocumento?: (id: string) => string;
}) {
  const pauta = itensPauta(r);
  const decisoes = decisoesDe(r);
  const convocou = agentes.get(r.convocada_por);
  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <Link href={base} className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-text">
        <ChevronLeft size={16} /> Reuniões
      </Link>
      <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
        <Selo r={r} />
        <span className="text-muted">#{r.id}</span>
      </div>
      <h1 className="text-xl font-semibold">{r.titulo}</h1>
      <p className="mb-6 text-sm text-muted">
        Convocada por {nomeDe(agentes, r.convocada_por)}{convocou ? `, ${convocou.cargo}` : ""}
        {r.agendada_para && ` · marcada para ${quando(r.agendada_para)}`}
        {r.iniciada_em && ` · começou ${quando(r.iniciada_em)}`}
        {r.encerrada_em && ` · ${r.estado === "cancelada" ? "cancelada" : "encerrada"} ${quando(r.encerrada_em)}`}
      </p>

      <div className="grid gap-6 md:grid-cols-[1fr_280px]">
        <div className="min-w-0 space-y-6">
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Pauta</h2>
            {pauta.length === 0 ? (
              <p className="rounded-xl border border-line bg-card px-4 py-4 text-sm text-muted">Sem pauta registrada.</p>
            ) : (
              <ol className="divide-y divide-line rounded-xl border border-line bg-card">
                {pauta.map((p, i) => (
                  <li key={i} className="flex gap-3 px-4 py-2.5 text-sm">
                    <span className="w-5 shrink-0 text-right font-semibold tabular-nums text-muted">{i + 1}</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Ata</h2>
            {r.ata ? (
              <article className="md rounded-xl border border-line bg-card p-5 text-[15px]">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{r.ata}</ReactMarkdown>
              </article>
            ) : (
              <p className="rounded-xl border border-line bg-card px-4 py-4 text-sm text-muted">
                {r.estado === "encerrada" ? "A ata não foi registrada." : "A ata fica pronta quando a reunião terminar."}
              </p>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Decisões</h2>
            {decisoes.length === 0 ? (
              <p className="rounded-xl border border-line bg-card px-4 py-4 text-sm text-muted">Nenhuma decisão registrada.</p>
            ) : (
              <ul className="divide-y divide-line rounded-xl border border-line bg-card">
                {decisoes.map((d, i) => {
                  const e = ESTADO_DECISAO[d.estado ?? "pendente"] ?? ESTADO_DECISAO.pendente;
                  const aprova = d.aprovacao === "rafael"
                    ? "Você aprova"
                    : d.aprovacao === "diretor"
                      ? `Diretor aprova${d.aprovador ? ` (${nomeDe(agentes, d.aprovador)})` : ""}`
                      : "Sem aprovação";
                  return (
                    <li key={i} className="flex items-start gap-3 px-4 py-3 text-sm">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{d.texto}</div>
                        <div className="mt-0.5 text-xs text-muted">
                          {d.responsavel ? `Responsável: ${nomeDe(agentes, d.responsavel)} · ` : ""}{aprova}
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${e.classe}`}>{e.rotulo}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section>
            <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
              <Users size={14} /> Participantes
            </h2>
            <ul className="divide-y divide-line rounded-xl border border-line bg-card">
              {presentes(r).map((id) => (
                <li key={id} className="px-4 py-2 text-sm">
                  <div className="font-medium">
                    {nomeDe(agentes, id)}
                    {id === r.convocada_por && <span className="ml-1.5 text-xs font-normal text-muted">convocou</span>}
                  </div>
                  {agentes.get(id) && <div className="text-xs text-muted">{agentes.get(id)!.cargo}</div>}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Ligações</h2>
            <div className="space-y-2 rounded-xl border border-line bg-card px-4 py-3 text-sm">
              {r.demanda_id ? (
                <Link href={linkDemanda} className="flex items-start gap-2 text-accent">
                  <Inbox size={15} className="mt-0.5 shrink-0" />
                  <span>Demanda #{r.demanda_id}{vinculos.demanda ? ` · ${vinculos.demanda.titulo}` : ""}</span>
                </Link>
              ) : (
                <div className="flex items-center gap-2 text-muted"><Inbox size={15} /> Sem demanda ligada</div>
              )}
              {r.documento_id ? (
                <Link href={linkDocumento(r.documento_id)} className="flex items-start gap-2 text-accent">
                  <FileText size={15} className="mt-0.5 shrink-0" />
                  <span>{vinculos.documento?.titulo ?? "Documento no arquivo"}</span>
                </Link>
              ) : (
                <div className="flex items-center gap-2 text-muted"><FileText size={15} /> Sem documento no arquivo</div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
