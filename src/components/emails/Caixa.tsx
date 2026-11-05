"use client";

// Caixa de e-mail em três painéis: pastas, lista e leitura. Só lê: nada é apagado, movido ou marcado na caixa real.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ChevronDown, FileText, Folder, ImageOff, Image as ImagemIcone, Inbox, Loader2, Mail, Paperclip, Reply, Search, Send, X,
  type LucideIcon,
} from "lucide-react";
import { SecoesEscritorio } from "@/components/SecoesEscritorio";
import { supabaseNavegador } from "@/lib/supabase/browser";
import {
  DEMO_EMAILS, dataCurta, dataLonga, demoCorpo, documentoDoEmail, grupoDeData, nomeConta, nomePasta, ordemPasta, tipoPasta,
  type CorpoEmail, type Email,
} from "@/lib/emails";

type Filtro = { tipo: "entradas" } | { tipo: "saidas" } | { tipo: "pasta"; conta: string; pasta: string | null };
type Painel = "pastas" | "lista" | "leitura";

const CHAVE_VISTOS = "gia_emails_vistos";
const CAMPOS = "id, conta, pasta, data, remetente, assunto, anexos, agente";

function lerVistos(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(CHAVE_VISTOS) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

const iniciais = (nome: string | null) =>
  (nome ?? "?").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "?";

const CORES = ["#0a6fdc", "#0f766e", "#7c3aed", "#b45309", "#be123c", "#0369a1", "#4d7c0f"];
const corDe = (t: string | null) => CORES[[...(t ?? "")].reduce((s, c) => (s * 31 + c.charCodeAt(0)) >>> 0, 0) % CORES.length];

function Sigla({ nome, tamanho = 36 }: { nome: string | null; tamanho?: number }) {
  return (
    <span aria-hidden className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: tamanho, height: tamanho, background: corDe(nome), fontSize: tamanho * 0.36 }}>
      {iniciais(nome)}
    </span>
  );
}

function ItemPasta({ Icone, rotulo, n, ativo, recuo = false, onClick }: {
  Icone: LucideIcon; rotulo: string; n: number; ativo: boolean; recuo?: boolean; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} aria-current={ativo ? "true" : undefined}
      className={`flex min-h-11 w-full items-center gap-2.5 rounded-lg pr-2.5 text-left text-sm md:min-h-9 ${recuo ? "pl-6" : "pl-2.5"} ${ativo ? "bg-accent-soft font-semibold text-accent" : "hover:bg-fill"}`}>
      <Icone size={16} aria-hidden className="shrink-0" />
      <span className="min-w-0 flex-1 truncate">{rotulo}</span>
      {n > 0 && <span className="shrink-0 text-xs tabular-nums text-muted">{n}</span>}
    </button>
  );
}

export function Caixa({ demo = false, agentes = {} }: { demo?: boolean; agentes?: Record<string, string> }) {
  const [emails, setEmails] = useState<Email[] | null>(demo ? DEMO_EMAILS : null);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>({ tipo: "entradas" });
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);
  const [painel, setPainel] = useState<Painel>("lista");
  const [corpo, setCorpo] = useState<CorpoEmail | null | "carregando" | "sem-corpo">(null);
  const [comImagens, setComImagens] = useState(false);
  const [vistos, setVistos] = useState<Set<string>>(() => new Set());
  const [fechadas, setFechadas] = useState<Set<string>>(() => new Set());
  const lista = useRef<HTMLDivElement>(null);

  useEffect(() => setVistos(lerVistos()), []);

  useEffect(() => {
    if (demo) return;
    let vivo = true;
    const carregar = async () => {
      const { data, error } = await supabaseNavegador().from("central_emails").select(CAMPOS).order("data", { ascending: false }).limit(3000);
      if (!vivo) return;
      if (error) setErro(error.message);
      else { setErro(null); setEmails((data ?? []) as Email[]); }
    };
    carregar();
    const t = setInterval(carregar, 120_000);
    return () => { vivo = false; clearInterval(t); };
  }, [demo]);

  const naoVistos = useCallback((l: Email[]) => l.filter((e) => !vistos.has(e.id) && tipoPasta(e.pasta) !== "saida").length, [vistos]);

  const arvore = useMemo(() => {
    const contas = new Map<string, Map<string, Email[]>>();
    for (const e of emails ?? []) {
      if (!contas.has(e.conta)) contas.set(e.conta, new Map());
      const pastas = contas.get(e.conta)!;
      const chave = e.pasta ?? "";
      pastas.set(chave, [...(pastas.get(chave) ?? []), e]);
    }
    return [...contas.entries()]
      .sort(([a], [b]) => nomeConta(a).localeCompare(nomeConta(b), "pt-BR"))
      .map(([conta, pastas]) => ({ conta, pastas: [...pastas.entries()].sort(([a], [b]) => ordemPasta(a, b)) }));
  }, [emails]);

  const entradas = useMemo(() => (emails ?? []).filter((e) => tipoPasta(e.pasta) === "entrada"), [emails]);
  const saidas = useMemo(() => (emails ?? []).filter((e) => tipoPasta(e.pasta) === "saida"), [emails]);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    if (termo) {
      // A busca olha todas as caixas, como no Outlook.
      return (emails ?? []).filter((e) => `${e.assunto ?? ""} ${e.remetente ?? ""}`.toLocaleLowerCase("pt-BR").includes(termo));
    }
    if (filtro.tipo === "entradas") return entradas;
    if (filtro.tipo === "saidas") return saidas;
    return (emails ?? []).filter((e) => e.conta === filtro.conta && (e.pasta ?? "") === (filtro.pasta ?? ""));
  }, [emails, entradas, saidas, filtro, busca]);

  const grupos = useMemo(() => {
    const out: { titulo: string; itens: Email[] }[] = [];
    for (const e of visiveis) {
      const titulo = grupoDeData(e.data);
      const ultimo = out[out.length - 1];
      if (ultimo?.titulo === titulo) ultimo.itens.push(e);
      else out.push({ titulo, itens: [e] });
    }
    return out;
  }, [visiveis]);

  const emailAberto = useMemo(() => (emails ?? []).find((e) => e.id === aberto) ?? null, [emails, aberto]);

  const abrir = useCallback(async (e: Email) => {
    setAberto(e.id);
    setPainel("leitura");
    setComImagens(false);
    setVistos((v) => {
      if (v.has(e.id)) return v;
      const novo = new Set(v).add(e.id);
      try { localStorage.setItem(CHAVE_VISTOS, JSON.stringify([...novo].slice(-3000))); } catch { /* sem armazenamento: só não lembra */ }
      return novo;
    });
    if (demo) { setCorpo(demoCorpo(e)); return; }
    setCorpo("carregando");
    const { data, error } = await supabaseNavegador().from("central_emails_corpo").select("de, para, cc, texto, html, anexos_nomes").eq("id", e.id).maybeSingle();
    setCorpo(error || !data ? "sem-corpo" : (data as CorpoEmail));
  }, [demo]);

  const escolher = (f: Filtro) => {
    setFiltro(f);
    setBusca("");
    setPainel("lista");
  };

  const tituloLista = busca.trim() ? "Resultado da busca"
    : filtro.tipo === "entradas" ? "Caixa de entrada" : filtro.tipo === "saidas" ? "Caixa de saída" : nomePasta(filtro.pasta);
  const subtituloLista = busca.trim() ? "Em todas as caixas"
    : filtro.tipo === "pasta" ? nomeConta(filtro.conta) : "Todas as caixas";

  // Setas para cima e para baixo andam pela lista.
  const teclaLista = (ev: React.KeyboardEvent) => {
    if (ev.key !== "ArrowDown" && ev.key !== "ArrowUp") return;
    ev.preventDefault();
    const i = visiveis.findIndex((e) => e.id === aberto);
    const prox = visiveis[Math.max(0, Math.min(visiveis.length - 1, i + (ev.key === "ArrowDown" ? 1 : -1)))];
    if (!prox) return;
    abrir(prox);
    lista.current?.querySelector<HTMLElement>(`[data-email="${prox.id}"]`)?.focus();
  };

  const corpoPronto = corpo && typeof corpo === "object" ? corpo : null;
  const temImagemRemota = !!corpoPronto?.html && /<img[^>]+src=["']?https?:/i.test(corpoPronto.html);
  const documento = useMemo(() => (corpoPronto?.html ? documentoDoEmail(corpoPronto.html, comImagens) : null), [corpoPronto, comImagens]);
  const emissor = corpoPronto?.de?.match(/<([^>]+)>/)?.[1] ?? (corpoPronto?.de?.includes("@") ? corpoPronto.de : null);
  const responder = emissor && emailAberto
    ? `mailto:${emissor}?subject=${encodeURIComponent(`Re: ${emailAberto.assunto ?? ""}`)}` : null;

  return (
    <div className="flex h-[calc(100dvh-var(--altura-barras))] min-h-0 flex-col bg-bg">
      <div className="flex flex-wrap items-center gap-3 border-b border-line bg-card px-3 py-2">
        <SecoesEscritorio atual="emails" demo={demo} />
        <label className="relative min-w-[200px] flex-1 md:max-w-md">
          <span className="sr-only">Buscar em todas as caixas</span>
          <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input type="search" value={busca} onChange={(e) => { setBusca(e.target.value); setPainel("lista"); }} placeholder="Buscar por assunto ou remetente"
            className="h-11 w-full rounded-lg border border-line bg-bg pl-9 pr-3 text-sm outline-none focus-visible:border-accent md:h-9" />
        </label>
        <p className="text-xs text-muted">{demo ? "Demonstração com e-mails fictícios" : "Últimos 30 dias, somente leitura. Nada muda nas caixas reais."}</p>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* pastas */}
        <nav aria-label="Pastas de e-mail"
          className={`min-h-0 w-full shrink-0 overflow-y-auto border-r border-line bg-card p-2 md:block md:w-60 ${painel === "pastas" ? "block" : "hidden"}`}>
          <h2 className="ios-secao px-2.5 pb-1 pt-1">Favoritos</h2>
          <ItemPasta Icone={Inbox} rotulo="Caixa de entrada" n={naoVistos(entradas)} ativo={filtro.tipo === "entradas" && !busca} onClick={() => escolher({ tipo: "entradas" })} />
          <ItemPasta Icone={Send} rotulo="Caixa de saída" n={0} ativo={filtro.tipo === "saidas" && !busca} onClick={() => escolher({ tipo: "saidas" })} />
          {arvore.map(({ conta, pastas }) => {
            const fechada = fechadas.has(conta);
            return (
              <section key={conta} className="mt-3">
                <button type="button" aria-expanded={!fechada}
                  onClick={() => setFechadas((f) => { const n = new Set(f); if (n.has(conta)) n.delete(conta); else n.add(conta); return n; })}
                  className="flex min-h-11 w-full items-center gap-1.5 rounded-lg px-2 text-left text-[13px] font-semibold hover:bg-fill md:min-h-8">
                  <ChevronDown size={15} aria-hidden className={`shrink-0 transition-transform motion-reduce:transition-none ${fechada ? "-rotate-90" : ""}`} />
                  <span className="truncate">{nomeConta(conta)}</span>
                </button>
                {!fechada && pastas.map(([pasta, itens]) => {
                  const tipo = tipoPasta(pasta);
                  const ativo = !busca && filtro.tipo === "pasta" && filtro.conta === conta && (filtro.pasta ?? "") === pasta;
                  return (
                    <ItemPasta key={pasta} recuo Icone={tipo === "entrada" ? Inbox : tipo === "saida" ? Send : Folder} rotulo={nomePasta(pasta)}
                      n={naoVistos(itens)} ativo={ativo} onClick={() => escolher({ tipo: "pasta", conta, pasta })} />
                  );
                })}
              </section>
            );
          })}
        </nav>

        {/* lista */}
        <section aria-label={tituloLista} className={`min-h-0 w-full shrink-0 flex-col border-r border-line bg-card md:flex md:w-[360px] ${painel === "lista" ? "flex" : "hidden"}`}>
          <header className="flex items-center gap-2 border-b border-line px-3 py-2">
            <button type="button" onClick={() => setPainel("pastas")} aria-label="Ver as pastas"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-accent hover:bg-fill md:hidden"><ArrowLeft size={20} /></button>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[15px] font-semibold leading-tight">{tituloLista}</h2>
              <p className="truncate text-xs text-muted">{subtituloLista} · {visiveis.length} {visiveis.length === 1 ? "e-mail" : "e-mails"}</p>
            </div>
            {busca && (
              <button type="button" onClick={() => setBusca("")} aria-label="Limpar a busca" className="inline-flex size-11 items-center justify-center rounded-lg text-muted hover:bg-fill md:size-9"><X size={17} /></button>
            )}
          </header>
          <div ref={lista} onKeyDown={teclaLista} className="min-h-0 flex-1 overflow-y-auto">
            {emails === null && !erro && <p className="py-10 text-center text-sm text-muted"><Loader2 size={18} className="mx-auto mb-2 animate-spin motion-reduce:animate-none" />Carregando os e-mails</p>}
            {erro && <p className="m-3 rounded-lg bg-bad-soft p-3 text-sm text-bad">Não foi possível ler os e-mails ({erro}).</p>}
            {emails && !erro && visiveis.length === 0 && (
              <p className="px-6 py-10 text-center text-sm text-muted">{busca ? "Nenhum e-mail encontrado." : "Nenhum e-mail nesta pasta."}</p>
            )}
            {grupos.map((g) => (
              <div key={g.titulo}>
                <h3 className="sticky top-0 z-10 border-b border-line bg-card px-3 py-1 text-xs font-semibold text-muted">{g.titulo}</h3>
                {g.itens.map((e) => {
                  const novo = !vistos.has(e.id) && tipoPasta(e.pasta) !== "saida";
                  const ativo = aberto === e.id;
                  return (
                    <button key={e.id} type="button" data-email={e.id} onClick={() => abrir(e)} aria-current={ativo ? "true" : undefined}
                      className={`relative flex w-full gap-2.5 border-b border-line px-3 py-2.5 text-left ${ativo ? "bg-accent-soft" : "hover:bg-fill"}`}>
                      {novo && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-accent" />}
                      <Sigla nome={e.remetente} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                          <span className={`min-w-0 flex-1 truncate text-sm ${novo ? "font-semibold" : ""}`}>{e.remetente || "Remetente não informado"}</span>
                          <span className={`shrink-0 text-xs tabular-nums ${novo ? "font-semibold text-accent" : "text-muted"}`}>{dataCurta(e.data)}</span>
                        </span>
                        <span className={`mt-0.5 flex items-center gap-1.5 text-[13px] ${novo ? "font-semibold" : "text-muted"}`}>
                          <span className="min-w-0 flex-1 truncate">{e.assunto || "(sem assunto)"}</span>
                          {e.anexos > 0 && <Paperclip size={13} aria-label={`${e.anexos} anexos`} className="shrink-0 text-muted" />}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted">
                          {nomeConta(e.conta)}{e.agente && agentes[e.agente] ? ` · ${agentes[e.agente]} supervisiona` : ""}
                        </span>
                      </span>
                      {novo && <span className="sr-only">Não aberto</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </section>

        {/* leitura */}
        <section aria-label="Leitura do e-mail" className={`min-h-0 min-w-0 flex-1 flex-col md:flex ${painel === "leitura" ? "flex" : "hidden"}`}>
          {!emailAberto ? (
            <div className="m-auto flex flex-col items-center gap-2 p-8 text-center text-sm text-muted">
              <Mail size={36} strokeWidth={1.4} aria-hidden />
              Escolha um e-mail para ler.
            </div>
          ) : (
            <>
              <header className="border-b border-line bg-card px-4 py-3">
                <div className="flex items-start gap-2">
                  <button type="button" onClick={() => setPainel("lista")} aria-label="Voltar para a lista"
                    className="-ml-2 inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-accent hover:bg-fill md:hidden"><ArrowLeft size={20} /></button>
                  <h2 className="min-w-0 flex-1 text-lg font-semibold leading-snug">{emailAberto.assunto || "(sem assunto)"}</h2>
                  {responder && (
                    <a href={responder} className="ios-botao inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-medium hover:bg-fill md:min-h-9">
                      <Reply size={16} aria-hidden /> Responder
                    </a>
                  )}
                </div>
                <div className="mt-3 flex items-start gap-3">
                  <Sigla nome={emailAberto.remetente} tamanho={40} />
                  <dl className="min-w-0 flex-1 text-[13px] leading-5">
                    <div className="flex gap-1.5"><dt className="sr-only">De</dt><dd className="truncate font-semibold">{corpoPronto?.de ?? emailAberto.remetente ?? "Remetente não informado"}</dd></div>
                    {corpoPronto?.para && <div className="flex gap-1.5"><dt className="shrink-0 text-muted">Para:</dt><dd className="min-w-0 break-words text-muted">{corpoPronto.para}</dd></div>}
                    {corpoPronto?.cc && <div className="flex gap-1.5"><dt className="shrink-0 text-muted">Cc:</dt><dd className="min-w-0 break-words text-muted">{corpoPronto.cc}</dd></div>}
                    <div className="text-muted first-letter:uppercase">{dataLonga(emailAberto.data)}</div>
                    <div className="text-muted">{nomeConta(emailAberto.conta)} · {nomePasta(emailAberto.pasta)}{emailAberto.agente && agentes[emailAberto.agente] ? ` · ${agentes[emailAberto.agente]} supervisiona` : ""}</div>
                  </dl>
                </div>
                {(corpoPronto?.anexos_nomes?.length ?? 0) > 0 && (
                  <ul aria-label="Anexos" className="mt-3 flex flex-wrap gap-1.5">
                    {corpoPronto!.anexos_nomes!.map((n, i) => (
                      <li key={`${n}${i}`} className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-line bg-bg px-2.5 py-1 text-xs">
                        <FileText size={14} aria-hidden className="shrink-0 text-accent" /><span className="truncate">{n}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {!corpoPronto && emailAberto.anexos > 0 && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted"><Paperclip size={13} aria-hidden /> {emailAberto.anexos} {emailAberto.anexos === 1 ? "anexo" : "anexos"}</p>
                )}
                {temImagemRemota && (
                  <button type="button" onClick={() => setComImagens((v) => !v)} aria-pressed={comImagens}
                    className="mt-3 flex min-h-11 w-full items-center gap-2 rounded-lg bg-fill px-3 text-left text-xs font-medium md:min-h-9">
                    {comImagens ? <ImageOff size={15} aria-hidden /> : <ImagemIcone size={15} aria-hidden />}
                    {comImagens ? "Ocultar as imagens" : "As imagens de fora estão ocultas, porque avisam o remetente que você abriu. Mostrar"}
                  </button>
                )}
              </header>
              <div className="min-h-0 flex-1 overflow-hidden bg-white">
                {corpo === "carregando" && <p className="py-10 text-center text-sm text-neutral-600"><Loader2 size={18} className="mx-auto mb-2 animate-spin motion-reduce:animate-none" />Carregando o e-mail</p>}
                {corpo === "sem-corpo" && (
                  <div className="mx-auto max-w-md p-8 text-center text-sm text-neutral-700">
                    <p className="font-semibold text-neutral-900">O texto deste e-mail não está disponível aqui.</p>
                    <p className="mt-1">Ele pode ter chegado há pouco, ou ter sido movido ou apagado da caixa original.</p>
                  </div>
                )}
                {documento && (
                  <iframe title={`Texto do e-mail: ${emailAberto.assunto ?? "sem assunto"}`} srcDoc={documento} sandbox="allow-popups allow-popups-to-escape-sandbox"
                    referrerPolicy="no-referrer" className="size-full border-0 bg-white" />
                )}
                {corpoPronto && !documento && (
                  <div className="h-full overflow-y-auto whitespace-pre-wrap break-words p-4 text-sm leading-relaxed text-neutral-900">
                    {corpoPronto.texto || "Este e-mail não tem texto."}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
