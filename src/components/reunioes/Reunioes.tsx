import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CalendarClock, ChevronLeft, FileText, Headphones, Inbox, LogIn, MessagesSquare, Plus } from "lucide-react";
import { Avatar, Avatares } from "@/components/Avatar";
import { diaEHora, emQuanto, haQuanto, nomeDe, quando, type Agente } from "@/lib/dados";
import type { Fala } from "@/lib/falas";
import { Abas } from "./Abas";
import { Conversa } from "./Conversa";
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
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <Avatares pessoas={ids.map((id) => ({ id, nome: nomeDe(agentes, id), setor: agentes.get(id)?.setor }))} tamanho={30} max={7} />
      <span className="min-w-0 text-xs text-muted">{ids.map((id) => nomeDe(agentes, id)).join(", ")}</span>
    </div>
  );
}

// Pessoas para os componentes do navegador (nome, cargo e setor de cada um, e o Rafael).
export function pessoasDe(agentes: Agentes) {
  return [
    { id: "rafael", nome: "Rafael", cargo: "Dono", setor: null },
    ...[...agentes.values()].map((a) => ({ id: a.id, nome: a.nome, cargo: a.cargo, setor: a.setor })),
  ];
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

export function CartaoReuniao({ r, agentes, base, falas = 0 }: { r: Reuniao; agentes: Agentes; base: string; falas?: number }) {
  const pauta = itensPauta(r);
  const convocou = agentes.get(r.convocada_por);
  const aoVivo = r.estado === "em_andamento";
  return (
    <article className="flex flex-col rounded-xl border border-line bg-card p-4 transition hover:border-accent">
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
      <div className="mt-auto pt-3">
        <div className="border-t border-line pt-2">
          <ResumoDecisoes decisoes={decisoesDe(r)} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs text-muted">
            <MessagesSquare size={14} /> {falas} {falas === 1 ? "fala" : "falas"}
          </span>
          {(falas > 0 || aoVivo) && (
            <Link href={`${base}/${r.id}?aba=conversa&assistir=1`}
              className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full bg-accent px-3.5 text-sm font-semibold text-white hover:brightness-110">
              <Headphones size={15} /> {aoVivo ? "Assistir ao vivo" : "Assistir"}
            </Link>
          )}
          {aoVivo && (
            <Link href={`${base}/${r.id}/sala`}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3.5 text-sm font-semibold hover:border-accent">
              <LogIn size={15} /> Entrar
            </Link>
          )}
        </div>
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

export function ListaReunioes({
  reunioes, agentes, base, falas = {},
}: {
  reunioes: Reuniao[];
  agentes: Agentes;
  base: string;
  falas?: Record<number, number>;
}) {
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
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1 text-sm text-muted">
          Reuniões que os agentes marcam entre si: a conversa fala por fala (com voz), a ata e as decisões que precisam de aprovação.
        </p>
        <Link href={`${base}/nova`}
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-text px-4 text-sm font-semibold text-card hover:opacity-90">
          <Plus size={16} /> Convocar reunião
        </Link>
      </div>
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
        {andamento.map((r) => <CartaoReuniao key={r.id} r={r} agentes={agentes} base={base} falas={falas[r.id] ?? 0} />)}
      </Secao>
      <Secao titulo="Próximas" vazio="Nenhuma reunião agendada." n={agendadas.length}>
        {agendadas.map((r) => <CartaoReuniao key={r.id} r={r} agentes={agentes} base={base} falas={falas[r.id] ?? 0} />)}
      </Secao>
      <Secao titulo="Encerradas" vazio="Nenhuma reunião encerrada ainda." n={encerradas.length}>
        {encerradas.map((r) => <CartaoReuniao key={r.id} r={r} agentes={agentes} base={base} falas={falas[r.id] ?? 0} />)}
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
  falas, aba, assistir = false, modo = "real", demoBase,
}: {
  r: Reuniao;
  agentes: Agentes;
  base: string;
  vinculos: Vinculos;
  linkDemanda?: string;
  linkDocumento?: (id: string) => string;
  falas: Fala[];
  aba?: "conversa" | "resumo";
  assistir?: boolean;
  modo?: "real" | "demo";
  demoBase?: number;
}) {
  const pauta = itensPauta(r);
  const decisoes = decisoesDe(r);
  const convocou = agentes.get(r.convocada_por);
  const aoVivo = r.estado === "em_andamento";
  const abaInicial = aba ?? (falas.length > 0 || aoVivo ? "conversa" : "resumo");

  const resumo = (
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
                    {d.responsavel && (
                      <Avatar id={d.responsavel} nome={nomeDe(agentes, d.responsavel)} setor={agentes.get(d.responsavel)?.setor}
                        tamanho={30} selo={false} className="mt-0.5" />
                    )}
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
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <Link href={base} className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-text">
        <ChevronLeft size={16} /> Reuniões
      </Link>
      <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
        <Selo r={r} />
        <span className="text-muted">#{r.id}</span>
      </div>
      <div className="flex flex-wrap items-start gap-3">
        <h1 className="min-w-0 flex-1 text-xl font-semibold sm:text-2xl">{r.titulo}</h1>
        {aoVivo && (
          <Link href={`${base}/${r.id}/sala`}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-text px-4 text-sm font-semibold text-card hover:opacity-90">
            <LogIn size={16} /> Entrar na reunião
          </Link>
        )}
      </div>
      <p className="mb-4 text-sm text-muted">
        Convocada por {nomeDe(agentes, r.convocada_por)}{convocou ? `, ${convocou.cargo}` : ""}
        {r.agendada_para && ` · marcada para ${quando(r.agendada_para)}`}
        {r.iniciada_em && ` · começou ${quando(r.iniciada_em)}`}
        {r.encerrada_em && ` · ${r.estado === "cancelada" ? "cancelada" : "encerrada"} ${quando(r.encerrada_em)}`}
      </p>

      {/* participantes */}
      <ul className="mb-6 flex flex-wrap gap-2" aria-label="Participantes">
        {presentes(r).map((id) => (
          <li key={id} className="flex items-center gap-2 rounded-full border border-line bg-card py-1 pl-1 pr-3">
            <Avatar id={id} nome={nomeDe(agentes, id)} setor={agentes.get(id)?.setor} tamanho={32} selo={false} />
            <span className="text-sm leading-tight">
              <span className="font-medium">{nomeDe(agentes, id)}</span>
              {id === r.convocada_por && <span className="ml-1 text-xs text-muted">convocou</span>}
              {agentes.get(id) && <span className="block text-[11px] text-muted">{agentes.get(id)!.cargo}</span>}
            </span>
          </li>
        ))}
      </ul>

      <Abas inicial={abaInicial} nFalas={falas.length} resumo={resumo}
        conversa={
          <Conversa reuniaoId={r.id} estadoInicial={r.estado} falasIniciais={falas} pessoas={pessoasDe(agentes)}
            participantes={presentes(r)} modo={modo} demoBase={demoBase} autoAssistir={assistir}
            linkSala={`${base}/${r.id}/sala`} />
        } />
    </main>
  );
}
