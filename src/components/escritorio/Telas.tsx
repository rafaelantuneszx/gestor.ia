"use client";

// Telas suspensas do escritório: supervisão de e-mails, fala com a equipe (voz ou texto) e resultados.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Bot, Loader2, Mail, Mic, Paperclip, Send, Square, Volume2, VolumeX, X } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { useLeitor } from "@/components/reunioes/useLeitor";
import { useMicrofone } from "@/components/reunioes/useMicrofone";
import { respostasDemo } from "@/lib/escritorio/demo";
import type { Fracao, Indicadores } from "@/lib/escritorio/indicadores";
import type { AgenteInfo } from "@/lib/escritorio/modelo";
import type { Fala } from "@/lib/falas";
import type { ReuniaoResumo } from "@/lib/reunioes";
import { supabaseNavegador } from "@/lib/supabase/browser";

// ---------- moldura ----------
export function TelaSuspensa({ titulo, subtitulo, icone, onFechar, children, rodape }: {
  titulo: string;
  subtitulo?: string;
  icone: ReactNode;
  onFechar: () => void;
  children: ReactNode;
  rodape?: ReactNode;
}) {
  return (
    <aside aria-label={titulo}
      className="absolute inset-x-2 bottom-2 z-40 flex h-[68%] flex-col min-[900px]:inset-x-auto min-[900px]:bottom-4 min-[900px]:right-4 min-[900px]:top-[132px] min-[900px]:h-auto min-[900px]:w-[440px]">
      {/* cabos que seguram a tela */}
      <div aria-hidden className="pointer-events-none absolute -top-[132px] hidden h-[132px] w-full min-[900px]:block">
        <span className="absolute left-14 h-full w-px bg-gradient-to-b from-transparent to-cyan-400/50" />
        <span className="absolute right-14 h-full w-px bg-gradient-to-b from-transparent to-cyan-400/50" />
      </div>
      <div className="tech-vidro flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl shadow-[0_0_40px_rgba(34,211,238,0.14)]">
        <header className="flex items-start gap-3 border-b border-line px-4 py-3">
          <span className="mt-0.5 text-accent">{icone}</span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold leading-tight">{titulo}</h2>
            {subtitulo && <p className="mt-0.5 text-xs text-muted">{subtitulo}</p>}
          </div>
          <button type="button" onClick={onFechar} aria-label={`Fechar ${titulo}`}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-fill"><X size={18} /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {rodape && <div className="border-t border-line p-3">{rodape}</div>}
      </div>
    </aside>
  );
}

// ---------- supervisão de e-mails ----------
type CartaoEmail = {
  id: string;
  conta: string;
  pasta: string | null;
  data: string | null;
  remetente: string | null;
  assunto: string | null;
  anexos: number;
  agente: string | null;
  situacao: string | null;
};

const CONTAS: Record<string, string> = {
  "rafael@fpav.com.br": "Rafael",
  "faturamento@fpav.com.br": "Faturamento FPAV",
  "faturamento@bractos.com.br": "Faturamento BRACTOS",
};
const QUANDO = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const DEMO_EMAILS: CartaoEmail[] = [
  { id: "1", conta: "faturamento@fpav.com.br", pasta: "INBOX", data: new Date(Date.now() - 18 * 60_000).toISOString(), remetente: "Fornecedor Exemplo", assunto: "Exemplo fictício: nota fiscal de outubro", anexos: 2, agente: "bruno-financeiro", situacao: "novo" },
  { id: "2", conta: "rafael@fpav.com.br", pasta: "INBOX", data: new Date(Date.now() - 66 * 60_000).toISOString(), remetente: "Cliente Exemplo", assunto: "Exemplo fictício: medição da obra para conferir", anexos: 1, agente: "otavio-pavimax", situacao: "com-agente" },
  { id: "3", conta: "faturamento@bractos.com.br", pasta: "INBOX", data: new Date(Date.now() - 140 * 60_000).toISOString(), remetente: "Empresa Exemplo", assunto: "Exemplo fictício: boleto com vencimento na sexta", anexos: 1, agente: "davi-faturas", situacao: "com-agente" },
];

export function TelaEmails({ modo, agentes, onFechar }: { modo: "real" | "demo"; agentes: Map<string, AgenteInfo>; onFechar: () => void }) {
  const [cartoes, setCartoes] = useState<CartaoEmail[] | null>(modo === "demo" ? DEMO_EMAILS : null);
  const [semTabela, setSemTabela] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [conta, setConta] = useState<string | null>(null);

  useEffect(() => {
    if (modo === "demo") return;
    let vivo = true;
    const carregar = async () => {
      const { data, error } = await supabaseNavegador().from("central_emails")
        .select("id, conta, pasta, data, remetente, assunto, anexos, agente, situacao").order("data", { ascending: false }).limit(80);
      if (!vivo) return;
      if (error) {
        const falta = error.code === "42P01" || error.code === "PGRST205" || /central_emails/.test(error.message);
        setSemTabela(falta);
        setErro(falta ? null : error.message);
        setCartoes([]);
      } else {
        setSemTabela(false);
        setErro(null);
        setCartoes((data ?? []) as CartaoEmail[]);
      }
    };
    carregar();
    const t = setInterval(carregar, 60_000);
    return () => { vivo = false; clearInterval(t); };
  }, [modo]);

  const visiveis = (cartoes ?? []).filter((c) => !conta || c.conta === conta);
  return (
    <TelaSuspensa titulo="Supervisão de e-mails" subtitulo={modo === "demo" ? "Demonstração com e-mails fictícios" : "As 3 caixas, só com leitura. Sem o texto das mensagens."}
      icone={<Mail size={18} />} onFechar={onFechar}>
      {!semTabela && (cartoes?.length ?? 0) > 0 && (
        <div role="group" aria-label="Filtrar por caixa" className="flex gap-1.5 overflow-x-auto border-b border-line px-3 py-2 [scrollbar-width:none]">
          {[null, ...Object.keys(CONTAS)].map((c) => {
            const n = (cartoes ?? []).filter((x) => !c || x.conta === c).length;
            return (
              <button key={c ?? "todas"} type="button" onClick={() => setConta(c)} aria-pressed={conta === c}
                className={`min-h-9 shrink-0 rounded-full px-3 text-xs font-semibold ${conta === c ? "bg-accent-fill text-white" : "bg-fill text-muted"}`}>
                {c ? CONTAS[c] : "Todas"} · {n}
              </button>
            );
          })}
        </div>
      )}
      <div className="space-y-2 p-3">
        {cartoes === null && <p className="py-8 text-center text-sm text-muted"><Loader2 size={18} className="mx-auto mb-2 animate-spin" />Carregando…</p>}
        {semTabela && (
          <div className="rounded-xl bg-warn-soft p-4 text-sm text-warn">
            <p className="font-semibold">A publicação dos e-mails ainda não foi ligada.</p>
            <p className="mt-1 text-text">Os agentes já leem as caixas neste computador. Para os cartões aparecerem aqui, falta autorizar a tabela que guarda remetente e assunto no banco.</p>
          </div>
        )}
        {erro && <p className="rounded-xl bg-bad-soft p-3 text-sm text-bad">Não foi possível ler os e-mails ({erro}).</p>}
        {cartoes && !semTabela && !erro && visiveis.length === 0 && <p className="py-8 text-center text-sm text-muted">Nenhum e-mail publicado.</p>}
        {visiveis.map((c) => {
          const ag = c.agente ? agentes.get(c.agente) : null;
          return (
            <article key={c.id} className="rounded-xl border border-line bg-card p-3">
              <div className="flex items-center gap-2 text-[11px] text-muted">
                <span className="truncate rounded-full bg-accent-soft px-2 py-0.5 font-semibold text-accent">{CONTAS[c.conta] ?? c.conta}</span>
                {c.data && <span className="ml-auto shrink-0 tabular-nums">{QUANDO.format(new Date(c.data))}</span>}
              </div>
              <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug">{c.assunto || "(sem assunto)"}</h3>
              <p className="mt-0.5 truncate text-xs text-muted">{c.remetente || "remetente não informado"}</p>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                {ag ? (
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <Avatar id={ag.id} nome={ag.nome} setor={ag.setor} tamanho={22} selo={false} />
                    <span className="truncate">{ag.nome} supervisiona</span>
                  </span>
                ) : <span>Sem agente definido</span>}
                {c.anexos > 0 && <span className="ml-auto inline-flex shrink-0 items-center gap-1"><Paperclip size={12} />{c.anexos}</span>}
              </div>
            </article>
          );
        })}
      </div>
    </TelaSuspensa>
  );
}

// ---------- falar com a equipe ----------
const TITULO_CONVERSA = "Conversa com a equipe";
const PADRAO = ["helena"];

export function TelaEquipe({ modo, agentes, reunioes, falasDoBanco, onFechar }: {
  modo: "real" | "demo";
  agentes: AgenteInfo[];
  reunioes: ReuniaoResumo[];
  falasDoBanco: Fala[];
  onFechar: () => void;
}) {
  const aberta = useMemo(
    () => reunioes.find((r) => r.estado === "em_andamento" && r.titulo === TITULO_CONVERSA && r.convocada_por === "rafael") ?? null,
    [reunioes],
  );
  const [id, setId] = useState<number | null>(aberta?.id ?? null);
  useEffect(() => { if (aberta && id === null) setId(aberta.id); }, [aberta, id]);
  const [sel, setSel] = useState<string[]>(() => {
    const base = aberta?.participantes?.length ? aberta.participantes : PADRAO;
    return base.filter((x) => agentes.some((a) => a.id === x));
  });
  const [locais, setLocais] = useState<Fala[]>([]);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [semChave, setSemChave] = useState(false);
  const proximoId = useRef(-1);
  const fim = useRef<HTMLDivElement>(null);

  const falas = useMemo(() => {
    const doBanco = id ? falasDoBanco.filter((f) => f.reuniaoId === id) : [];
    const mapa = new Map<number, Fala>();
    for (const f of [...doBanco, ...locais]) mapa.set(f.id, f);
    return [...mapa.values()].sort((a, b) => a.ts.localeCompare(b.ts));
  }, [id, falasDoBanco, locais]);

  const leitor = useLeitor({ falas, pularFala: (f) => f.agente === "rafael", aoVivoInicial: true, ids: sel });
  const leitorRef = useRef(leitor);
  leitorRef.current = leitor;
  useEffect(() => { fim.current?.scrollIntoView({ block: "end" }); }, [falas.length, pensando]);

  const adicionarLocal = useCallback((agente: string, t: string) => {
    const f: Fala = { id: proximoId.current--, ts: new Date().toISOString(), agente, texto: t, reuniaoId: 0 };
    setLocais((l) => [...l, f]);
  }, []);

  const enviar = useCallback(async (bruto: string) => {
    const fala = bruto.trim();
    if (!fala) return;
    setAviso(null);
    setTexto("");
    if (!leitorRef.current.tocando) leitorRef.current.play(falas.length);
    if (modo === "demo") {
      adicionarLocal("rafael", fala);
      setPensando(true);
      setTimeout(() => {
        respostasDemo(fala, sel).forEach((r) => adicionarLocal(r.agente, r.texto));
        setPensando(false);
      }, 1200);
      return;
    }
    setPensando(true);
    try {
      let rid = id;
      if (rid === null) {
        const res = await fetch("/api/reunioes", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ titulo: TITULO_CONVERSA, participantes: sel, pauta: [fala.slice(0, 200)] }),
        });
        const j = (await res.json().catch(() => ({}))) as { id?: number; erro?: string };
        if (!res.ok || !j.id) {
          setAviso(j.erro ?? `Não foi possível abrir a conversa (${res.status}).`);
          setTexto(fala);
          return;
        }
        rid = j.id;
        setId(rid);
      }
      const res = await fetch(`/api/reunioes/${rid}/falar`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ texto: fala }),
      });
      const j = (await res.json().catch(() => ({}))) as { falas?: Fala[]; aviso?: string | null; erro?: string; semChave?: boolean };
      if (j.falas?.length) setLocais((l) => [...l, ...j.falas!]);
      if (j.semChave) setSemChave(true);
      if (!res.ok) setAviso(j.erro ?? `Não foi possível enviar (${res.status}).`);
      else if (j.aviso && !j.semChave) setAviso(j.aviso);
    } catch (e) {
      setAviso(`Sem conexão: ${(e as Error).message}`);
    } finally {
      setPensando(false);
    }
  }, [adicionarLocal, falas.length, id, modo, sel]);

  const falandoAgora = leitor.tocando && !leitor.esperando && leitor.falaAtual?.agente !== "rafael";
  const mic = useMicrofone({ pausado: pensando || falandoAgora, onEnviar: enviar });

  const encerrar = async () => {
    leitor.pause();
    if (modo === "real" && id) {
      setPensando(true);
      const res = await fetch(`/api/reunioes/${id}/fechar`, { method: "POST" }).catch(() => null);
      setPensando(false);
      if (!res?.ok) { setAviso("Não foi possível encerrar a conversa. Tente de novo."); return; }
    }
    setId(null);
    setLocais([]);
    setAviso(null);
  };

  const conversaAberta = id !== null || (modo === "demo" && locais.length > 0);
  const nome = (a: string) => (a === "rafael" ? "Você" : agentes.find((x) => x.id === a)?.nome ?? a);

  return (
    <TelaSuspensa titulo="Falar com a equipe" subtitulo="Por voz ou texto. Quem você chamar vai para a sala de reunião e responde aqui."
      icone={<Bot size={18} />} onFechar={onFechar}
      rodape={
        <div className="space-y-2">
          {mic.ouvindo && <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent" aria-live="polite">{mic.rascunho || "Ouvindo…"}</p>}
          {mic.erro && <p className="text-xs text-bad">{mic.erro}</p>}
          {aviso && <p className="text-xs text-bad">{aviso}</p>}
          {semChave && <p className="text-xs text-warn">Sua fala foi registrada, mas as respostas automáticas estão desligadas: falta a chave ANTHROPIC_API_KEY na Vercel.</p>}
          <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); enviar(texto); }}>
            {mic.suportado && (
              <button type="button" aria-label="Segure para falar" title="Segure para falar"
                onPointerDown={(e) => { e.preventDefault(); mic.apertar(); }} onPointerUp={() => mic.soltar()} onPointerLeave={() => mic.ouvindo && mic.soltar()}
                onKeyDown={(e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); mic.apertar(); } }}
                onKeyUp={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); mic.soltar(); } }}
                style={{ touchAction: "none" }}
                className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full ${mic.ouvindo ? "animate-pulse bg-bad text-white" : "bg-fill text-text"}`}>
                <Mic size={19} />
              </button>
            )}
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={1} aria-label="Mensagem para a equipe"
              placeholder={sel.length ? `Fale com ${sel.map(nome).join(", ")}` : "Escolha quem vai participar"}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(texto); } }}
              className="ios-campo max-h-28 min-w-0 flex-1 resize-none" />
            <button type="submit" disabled={!texto.trim() || pensando || sel.length === 0} aria-label="Enviar"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-fill text-white disabled:opacity-40">
              {pensando ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </form>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => leitor.setVolume(leitor.volume === 0 ? 1 : 0)} aria-pressed={leitor.volume !== 0}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-xs text-muted hover:bg-fill">
              {leitor.volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />} {leitor.volume === 0 ? "Voz desligada" : "Voz ligada"}
            </button>
            {conversaAberta && (
              <button type="button" onClick={encerrar} className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold text-bad hover:bg-fill">
                <Square size={13} /> Encerrar conversa
              </button>
            )}
          </div>
        </div>
      }>
      {!conversaAberta && (
        <div className="border-b border-line p-3">
          <p className="mb-2 text-xs font-semibold text-muted">Quem participa</p>
          <div className="flex flex-wrap gap-1.5">
            {agentes.map((a) => {
              const ativo = sel.includes(a.id);
              return (
                <button key={a.id} type="button" onClick={() => setSel((s) => (ativo ? s.filter((x) => x !== a.id) : [...s, a.id]))} aria-pressed={ativo}
                  className={`inline-flex min-h-9 items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-xs font-medium ${ativo ? "bg-accent-fill text-white" : "bg-fill"}`}>
                  <Avatar id={a.id} nome={a.nome} setor={a.setor} tamanho={24} selo={false} /> {a.nome}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="space-y-3 p-3">
        {falas.length === 0 && !pensando && (
          <p className="py-6 text-center text-sm text-muted">Escreva ou segure o microfone para falar. As respostas usam só o que está nas demandas, atas e relatórios.</p>
        )}
        {falas.map((f) => {
          const eu = f.agente === "rafael";
          const ag = agentes.find((a) => a.id === f.agente);
          return (
            <div key={f.id} className={`flex items-start gap-2 ${eu ? "flex-row-reverse" : ""}`}>
              {!eu && <Avatar id={f.agente} nome={ag?.nome ?? f.agente} setor={ag?.setor} tamanho={32} selo={false} falando={leitor.falaAtual?.id === f.id && leitor.tocando} />}
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-snug ${eu ? "rounded-tr-md bg-accent-fill text-white" : "rounded-tl-md bg-fill"}`}>
                {!eu && <div className="mb-0.5 text-[11px] font-semibold text-accent">{ag?.nome ?? f.agente}</div>}
                {f.texto}
              </div>
            </div>
          );
        })}
        {pensando && <p className="flex items-center gap-2 text-xs text-muted"><Loader2 size={14} className="animate-spin" /> A equipe está respondendo…</p>}
        <div ref={fim} />
      </div>
    </TelaSuspensa>
  );
}

// ---------- resultados ----------
function Barra({ titulo, detalhe, f, cor }: { titulo: string; detalhe: string; f: Fracao | null; cor: string }) {
  const pct = f?.pct ?? null;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-sm font-semibold">{titulo}</h4>
        <span className="text-xl font-semibold tabular-nums" style={{ color: cor }}>{pct === null ? "—" : `${pct}%`}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-fill" role="img" aria-label={pct === null ? "sem dado" : `${pct} por cento`}>
        <div className="h-full rounded-full" style={{ width: `${pct ?? 0}%`, background: cor }} />
      </div>
      <p className="mt-1 text-xs text-muted">{detalhe}</p>
    </div>
  );
}

export function TelaResultados({ ind, agentes, onFechar }: { ind: Indicadores; agentes: AgenteInfo[]; onFechar: () => void }) {
  const cards: [string, number, string, string][] = [
    ["Atualizadas hoje", ind.atualizadasHoje, "#22d3ee", "demandas que mudaram hoje"],
    ["Entregues", ind.entregues, "#a78bfa", `relatórios no Arquivo · ${ind.entreguesHoje} hoje`],
    ["Feitas", ind.feitas, "#34d399", "demandas concluídas"],
    ["A fazer", ind.aFazer, "#fbbf24", `${ind.aguardandoVoce} aguardando você`],
    ["Rotinas criadas", ind.rotinasCriadas, "#60a5fa", `tipos diferentes rodados em 30 dias · ${ind.rotinasConcluidas} execuções`],
  ];
  const s = ind.sincronizacoes;
  const ranking = agentes
    .map((a) => ({ a, r: ind.porAgente[a.id] }))
    .filter((x) => x.r)
    .sort((x, y) => y.r.concluidas - x.r.concluidas)
    .slice(0, 8);
  return (
    <TelaSuspensa titulo="Resultados e independência" subtitulo="Contagens reais do banco. Nada aqui é estimativa." icone={<Bot size={18} />} onFechar={onFechar}>
      <div className="grid grid-cols-2 gap-2 p-3">
        {cards.map(([t, n, c, d], i) => (
          <div key={t} className={`rounded-xl border border-line bg-card p-3 ${i === cards.length - 1 ? "col-span-2" : ""}`}>
            <div className="text-2xl font-semibold tabular-nums" style={{ color: c }}>{n.toLocaleString("pt-BR")}</div>
            <div className="text-sm font-medium">{t}</div>
            <div className="mt-0.5 text-[11px] leading-tight text-muted">{d}</div>
          </div>
        ))}
      </div>
      <section className="space-y-4 border-t border-line p-4">
        <h3 className="text-sm font-semibold text-muted">Quanto anda sem depender de você</h3>
        <Barra titulo="Agentes resolvem sem você" f={ind.agentesSemVoce} cor="#22d3ee"
          detalhe={`${ind.agentesSemVoce.feitos} de ${ind.agentesSemVoce.total} demandas feitas não precisaram da sua decisão na Mesa.`} />
        <Barra titulo="Rotinas terminam sem erro" f={ind.rotinasSemErro} cor="#34d399"
          detalhe={`${ind.rotinasSemErro.feitos} de ${ind.rotinasSemErro.total} execuções nos últimos 30 dias.`} />
        <Barra titulo="Sistemas sincronizam sozinhos" f={s} cor="#60a5fa"
          detalhe={s ? `${s.feitos} de ${s.total} sincronizações automáticas FPAV Financeiro → PaviMax sem erro em 30 dias.` : "Sem acesso ao registro de integração nesta sessão."} />
      </section>
      {ranking.length > 0 && (
        <section className="border-t border-line p-4">
          <h3 className="mb-2 text-sm font-semibold text-muted">Mais execuções em 30 dias</h3>
          <ul className="space-y-1.5">
            {ranking.map(({ a, r }) => (
              <li key={a.id} className="flex items-center gap-2 text-sm">
                <Avatar id={a.id} nome={a.nome} setor={a.setor} tamanho={26} selo={false} />
                <span className="min-w-0 flex-1 truncate">{a.nome}</span>
                {r.comErro > 0 && <span className="text-xs text-bad">{r.comErro} com erro</span>}
                <span className="font-semibold tabular-nums">{r.concluidas}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </TelaSuspensa>
  );
}
