import Link from "next/link";
import { CircleAlert, TriangleAlert } from "lucide-react";
import { Topo, SemAcesso } from "@/components/Topo";
import { Avatar } from "@/components/Avatar";
import { autorizado, cadastros, type Demanda } from "@/lib/dados";
import { supabaseServidor } from "@/lib/supabase/server";
import {
  AREAS, FUNCOES, GARGALO, NOME_AGENTE, liga, normalizar, situacao, type Funcao, type Situacao, type Status,
} from "@/lib/funcoes-rafael";

export const dynamic = "force-dynamic";

const STATUS: Record<Status, string> = { ativa: "Ativa", planejada: "Planejada", "sob-demanda": "Sob demanda" };
const MODO = { entrega: "Entrega", adianta: "Adianta", voce: "Você" } as const;
const LINHA: Record<Situacao, string> = {
  "sem-dono": "border-l-4 border-l-bad bg-bad-soft",
  "para-em-voce": "border-l-4 border-l-warn",
  "sem-agente": "border-l-4 border-l-warn",
  ok: "border-l-4 border-l-transparent",
};
const ESTADO: Record<Demanda["estado"], string> = {
  "aguardando-rafael": "aguardando você", aberta: "aberta", andamento: "em andamento", feita: "feita", cancelada: "cancelada",
};
const ESTADO_CHIP: Record<Demanda["estado"], string> = {
  "aguardando-rafael": "bg-warn-soft text-warn",
  aberta: "bg-bg text-muted",
  andamento: "bg-accent-soft text-accent",
  feita: "bg-ok-soft text-ok",
  cancelada: "bg-bg text-muted",
};

type DemandaCurta = Pick<Demanda, "id" | "titulo" | "estado" | "de" | "para">;

export default async function Funcoes({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  if (!(await autorizado())) return <SemAcesso />;
  const so = (await searchParams).ver === "gargalo";
  const sb = await supabaseServidor();
  const [{ agentes }, dem] = await Promise.all([
    cadastros(),
    sb.from("central_demandas").select("id, titulo, estado, de, para").not("estado", "in", "(feita,cancelada)").order("id"),
  ]);
  const abertas = (dem.data ?? []) as DemandaCurta[];
  const aguardando = abertas.filter((d) => d.estado === "aguardando-rafael").length;
  const titulos = abertas.map((d) => ({ d, t: normalizar(d.titulo) }));
  const ligadas = new Map<Funcao, DemandaCurta[]>(
    FUNCOES.map((fn) => [fn, titulos.filter(({ t }) => liga(fn, t)).map(({ d }) => d)]),
  );
  const soltas = titulos.filter(({ t }) => !FUNCOES.some((fn) => liga(fn, t))).map(({ d }) => d);
  const nome = (id: string) => agentes.get(id)?.nome ?? NOME_AGENTE[id] ?? id;

  const sit = new Map(FUNCOES.map((fn) => [fn, situacao(fn)]));
  const semDono = FUNCOES.filter((fn) => sit.get(fn) === "sem-dono");
  const paraEmVoce = FUNCOES.filter((fn) => sit.get(fn) === "para-em-voce");
  const semAgente = FUNCOES.filter((fn) => sit.get(fn) === "sem-agente");
  const visiveis = so ? FUNCOES.filter((fn) => sit.get(fn) !== "ok") : FUNCOES;

  return (
    <>
      <Topo aba="funcoes" pendentes={aguardando} />
      <main className="mx-auto max-w-[1600px] px-4 py-6 2xl:text-[17px]">
        <h1 className="text-2xl font-semibold tracking-tight">Funções do Rafael</h1>
        <p className="mt-1 max-w-4xl text-sm text-muted">
          Cada função sua, o agente que prepara, a pessoa do escritório que pode executar e as demandas abertas ligadas.
          Vem do mapa de funções por agente (outubro/2026), dos assuntos dos seus e-mails e das suas decisões.
          A coluna da pessoa é uma proposta para você validar.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {([
            [FUNCOES.length, "funções", ""],
            [FUNCOES.filter((fn) => fn.agentes.length > 0).length, "com agente que prepara", ""],
            [FUNCOES.filter((fn) => fn.pessoas.length > 0).length, "com pessoa do escritório", ""],
            [paraEmVoce.length + semAgente.length, "param em você ou sem agente", "text-warn"],
            [semDono.length, "sem dono", "text-bad"],
          ] as const).map(([n, rotulo, cor]) => (
            <div key={rotulo} className="rounded-xl border border-line bg-card px-4 py-3">
              <div className={`text-3xl font-semibold tabular-nums ${cor}`}>{n}</div>
              <div className="text-sm text-muted">{rotulo}</div>
            </div>
          ))}
        </div>

        <section className="mt-6 rounded-xl border border-bad/40 bg-card p-4 sm:p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <CircleAlert size={20} className="text-bad" /> Onde está o gargalo do Rafael
          </h2>
          <p className="mt-1 text-sm text-muted">
            O que hoje para em você, quantas funções terminam nesse passo e quem poderia assumir.
            Na Mesa, agora: <Link href="/" className="font-semibold text-accent">{aguardando} aguardando você</Link>.
          </p>
          {semDono.length > 0 && (
            <div className="mt-3 rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">
              <span className="font-semibold">Sem dono ({semDono.length}): </span>
              {semDono.map((fn) => fn.nome).join(" · ")}
            </div>
          )}
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {GARGALO.map((g) => {
              const fns = FUNCOES.filter((fn) => fn.passo === g.passo);
              const semNinguem = fns.filter((fn) => fn.pessoas.length === 0).length;
              return (
                <article key={g.passo} className="rounded-lg border border-line p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold leading-snug">{g.oque}</p>
                    <span className="shrink-0 rounded-full bg-warn-soft px-2 py-0.5 text-xs font-semibold tabular-nums text-warn">
                      {fns.length} {fns.length === 1 ? "função" : "funções"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm"><span className="text-muted">Quem poderia assumir: </span>{g.quem}</p>
                  <details className="mt-2 text-xs text-muted">
                    <summary className="cursor-pointer">
                      Ver as funções{semNinguem > 0 && <span className="text-bad"> · {semNinguem} sem ninguém do escritório</span>}
                    </summary>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4">
                      {fns.map((fn) => (
                        <li key={fn.nome} className={fn.pessoas.length === 0 ? "text-bad" : ""}>
                          {fn.nome}: {minusc(fn.ultimo)}
                        </li>
                      ))}
                    </ul>
                  </details>
                </article>
              );
            })}
          </div>
        </section>

        <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <div className="flex gap-1 rounded-lg border border-line bg-card p-1">
            <Link href="/funcoes" className={`rounded-md px-3 py-1 ${!so ? "bg-accent-soft font-semibold text-accent" : "text-muted"}`}>
              Todas ({FUNCOES.length})
            </Link>
            <Link href="/funcoes?ver=gargalo" className={`rounded-md px-3 py-1 ${so ? "bg-accent-soft font-semibold text-accent" : "text-muted"}`}>
              Só as que precisam de dono ({FUNCOES.length - FUNCOES.filter((fn) => sit.get(fn) === "ok").length})
            </Link>
          </div>
          <span className="inline-flex items-center gap-1.5 text-muted"><span className="h-3 w-3 rounded-sm bg-bad" /> sem dono: só você</span>
          <span className="inline-flex items-center gap-1.5 text-muted"><span className="h-3 w-3 rounded-sm bg-warn" /> o agente prepara, mas ninguém do escritório fecha (ou falta agente)</span>
        </div>

        {AREAS.map((area) => {
          const fns = visiveis.filter((fn) => fn.area === area);
          if (fns.length === 0) return null;
          return (
            <section key={area} className="mt-6">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{area} · {fns.length}</h2>
              <div className="overflow-hidden rounded-xl border border-line bg-card">
                <div className="hidden grid-cols-[minmax(0,2.3fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.7fr)] gap-4 border-b border-line px-4 py-2 text-xs font-semibold text-muted lg:grid">
                  <span>Função</span><span>Agente que prepara</span><span>Pessoa que pode executar</span><span>Demandas abertas ligadas</span>
                </div>
                <ul className="divide-y divide-line">
                  {fns.map((fn) => (
                    <Linha key={fn.nome} fn={fn} s={sit.get(fn)!} demandas={ligadas.get(fn) ?? []} nome={nome}
                      setor={(id) => agentes.get(id)?.setor} />
                  ))}
                </ul>
              </div>
            </section>
          );
        })}

        {!so && soltas.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
              Demandas abertas que não se ligam a nenhuma função · {soltas.length}
            </h2>
            <div className="flex flex-wrap gap-1.5 rounded-xl border border-line bg-card px-4 py-3">
              {soltas.map((d) => <Chip key={d.id} d={d} nome={nome} />)}
            </div>
          </section>
        )}
      </main>
    </>
  );
}

// Primeira letra minúscula, para encaixar no meio da frase sem mexer nos nomes ("A Lúcia fecha" → "a Lúcia fecha").
function minusc(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

// Só o número, com quem está e o estado. O título fica na Mesa: alguns citam nomes de colaboradores.
function Chip({ d, nome }: { d: DemandaCurta; nome: (id: string) => string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs ${ESTADO_CHIP[d.estado]}`}>
      <span className="font-semibold tabular-nums">#{d.id}</span>
      <span>{d.para === "rafael" ? "com você" : nome(d.para)} · {ESTADO[d.estado]}</span>
    </span>
  );
}

function Linha({ fn, s, demandas, nome, setor }: {
  fn: Funcao; s: Situacao; demandas: DemandaCurta[]; nome: (id: string) => string; setor: (id: string) => string | null | undefined;
}) {
  const rotulo = "text-xs font-semibold text-muted lg:hidden";
  return (
    <li className={`grid gap-3 px-4 py-3 lg:grid-cols-[minmax(0,2.3fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.7fr)] lg:gap-4 ${LINHA[s]}`}>
      <div className="min-w-0">
        <div className={`font-semibold leading-snug ${s === "sem-dono" ? "text-bad" : ""}`}>
          {s === "sem-dono" && <CircleAlert size={15} className="mr-1 inline -translate-y-px" />}
          {fn.nome}
        </div>
        <div className="mt-0.5 text-xs text-muted">
          {fn.modo && `${MODO[fn.modo]} · `}{STATUS[fn.status]} · {fn.quando}
        </div>
        <div className="mt-0.5 text-xs">
          {fn.passo === "ler"
            ? <span className="text-muted">Você: {minusc(fn.ultimo)}</span>
            : <span className={s === "ok" ? "" : "font-medium text-warn"}>Hoje fica com você: {minusc(fn.ultimo)}</span>}
        </div>
        {fn.fonte && <div className="mt-0.5 text-xs text-muted">Fonte: {fn.fonte}</div>}
      </div>

      <div className="min-w-0">
        <div className={rotulo}>Agente que prepara</div>
        {fn.agentes.length === 0 ? (
          <span className={`inline-flex items-center gap-1 text-sm ${s === "sem-dono" ? "font-semibold text-bad" : "text-warn"}`}>
            <TriangleAlert size={14} /> Nenhum agente
          </span>
        ) : (
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {fn.agentes.map((id) => (
              <span key={id} className="inline-flex items-center gap-1.5 text-sm">
                <Avatar id={id} nome={nome(id)} setor={setor(id)} tamanho={24} selo={false} />
                {nome(id)}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="min-w-0">
        <div className={rotulo}>Pessoa que pode executar</div>
        {fn.pessoas.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {fn.pessoas.map((p) => (
              <span key={p} className="rounded-full border border-line px-2 py-0.5 text-sm">{p}</span>
            ))}
          </div>
        ) : fn.passo === "ler" ? (
          <span className="text-sm text-muted">Não precisa: o agente entrega</span>
        ) : (
          <span className={`text-sm ${s === "sem-dono" ? "font-semibold text-bad" : "text-warn"}`}>Ninguém: fica com você</span>
        )}
      </div>

      <div className="min-w-0">
        <div className={rotulo}>Demandas abertas ligadas</div>
        {demandas.length === 0 ? (
          <span className="text-sm text-muted">Nenhuma</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {demandas.map((d) => <Chip key={d.id} d={d} nome={nome} />)}
          </div>
        )}
      </div>
    </li>
  );
}
