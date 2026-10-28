"use client";

// Sala de reunião ao vivo com o Rafael, "como um meeting": grade com os participantes (quem fala acende),
// legenda, microfone (segurar para falar ou contínuo), campo de texto e a voz de cada agente.
// Real: a fala do Rafael vai para /api/reunioes/<id>/falar, que grava e pede as respostas ao Claude;
// as falas chegam pela resposta e pelo polling de 1,5 s. Demonstração: respostas fixas, sem banco.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, Info, Keyboard, Loader2, MessagesSquare, Mic, MicOff, PhoneOff, Send, Volume2, VolumeX, X,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { respostasDemo } from "@/lib/escritorio/demo";
import type { Fala } from "@/lib/falas";
import { soHoraCliente } from "@/lib/horario";
import type { EstadoReuniao } from "@/lib/reunioes";
import { Legenda, type Pessoa } from "./Controles";
import { useFalas } from "./useFalas";
import { useLeitor } from "./useLeitor";
import { useMicrofone } from "./useMicrofone";

export type ReuniaoSala = {
  id: number;
  titulo: string;
  estado: EstadoReuniao;
  convocada_por: string;
  participantes: string[];
  pauta: string[];
  iniciada_em: string | null;
};

function cronometro(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const dd = (n: number) => String(n).padStart(2, "0");
  const h = Math.floor(s / 3600);
  return h ? `${h}:${dd(Math.floor((s % 3600) / 60))}:${dd(s % 60)}` : `${dd(Math.floor(s / 60))}:${dd(s % 60)}`;
}

export function SalaMeeting({
  reuniao, pessoas, falasIniciais, modo, demoBase, voltar, onSair,
}: {
  reuniao: ReuniaoSala;
  pessoas: Pessoa[];
  falasIniciais: Fala[];
  modo: "real" | "demo";
  demoBase?: number;
  voltar: string; // para onde o "Sair" leva (página da reunião)
  onSair?: () => void; // dentro do escritório: fecha a sala em vez de navegar
}) {
  const router = useRouter();
  const mapa = useMemo(() => new Map(pessoas.map((p) => [p.id, p])), [pessoas]);
  const ids = useMemo(() => [...new Set([reuniao.convocada_por, ...reuniao.participantes])].filter((x) => x !== "rafael"), [reuniao]);
  const { falas, estado, setEstado, erro, juntar, adicionarLocal } = useFalas({
    reuniaoId: reuniao.id, inicial: falasIniciais, estadoInicial: reuniao.estado, modo, demoBase, intervalo: 1500,
  });
  const leitor = useLeitor({ falas, ids, pularFala: (f) => f.agente === "rafael" });
  const [entrou, setEntrou] = useState(false);
  const [pensando, setPensando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [semChave, setSemChave] = useState(false);
  const [texto, setTexto] = useState("");
  const [chat, setChat] = useState(false);
  const [agora, setAgora] = useState<number | null>(null); // só no navegador (evita diferença com o HTML do servidor)
  useEffect(() => {
    setAgora(Date.now());
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const falandoAgora = leitor.tocando && !leitor.esperando ? leitor.falaAtual?.agente ?? null : null;
  const agentesFalando = !!falandoAgora && falandoAgora !== "rafael";

  const enviar = useCallback(async (t: string) => {
    const fala = t.trim();
    setAviso(null);
    if (modo === "demo") {
      if (fala) adicionarLocal({ agente: "rafael", texto: fala });
      setPensando(true);
      setTimeout(() => {
        respostasDemo(fala, ids).forEach((r, k) => setTimeout(() => adicionarLocal(r), k * 400));
        setPensando(false);
      }, 1400);
      return;
    }
    setPensando(true);
    try {
      const res = await fetch(`/api/reunioes/${reuniao.id}/falar`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ texto: fala }),
      });
      const j = (await res.json().catch(() => ({}))) as { falas?: Fala[]; aviso?: string | null; erro?: string; semChave?: boolean };
      if (j.falas?.length) juntar(j.falas);
      if (j.semChave) setSemChave(true);
      if (!res.ok) setAviso(j.erro ?? `Não foi possível enviar (${res.status}).`);
      else if (j.aviso && !j.semChave) setAviso(j.aviso);
    } catch (e) {
      setAviso(`Sem conexão: ${(e as Error).message}`);
    } finally {
      setPensando(false);
    }
  }, [modo, adicionarLocal, ids, juntar, reuniao.id]);

  const mic = useMicrofone({ pausado: !entrou || agentesFalando || pensando, onEnviar: enviar });

  const entrar = () => {
    setEntrou(true);
    leitor.setAoVivo(true);
    leitor.play(falas.length); // a partir daqui: só as falas novas
    // reunião acabou de abrir (ninguém falou): quem conduz cumprimenta
    if (falas.length === 0 && estado === "em_andamento") enviar("");
  };

  // Atalho: barra de espaço segura o microfone (fora de campos de texto).
  const micRef = useRef(mic);
  micRef.current = mic;
  useEffect(() => {
    if (!entrou) return;
    const campo = (e: KeyboardEvent) => (e.target as HTMLElement)?.closest?.("input, textarea, select, button");
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat || campo(e) || micRef.current.modo !== "segurar") return;
      e.preventDefault();
      micRef.current.apertar();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space" || campo(e) || micRef.current.modo !== "segurar") return;
      micRef.current.soltar();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [entrou]);

  const encerrar = async () => {
    if (!confirm("Encerrar a reunião? A conversa vira a ata.")) return;
    leitor.pause();
    if (modo === "demo") { setEstado("encerrada"); return; }
    const res = await fetch(`/api/reunioes/${reuniao.id}/fechar`, { method: "POST" });
    const j = (await res.json().catch(() => ({}))) as { erro?: string };
    if (!res.ok) { setAviso(j.erro ?? "Não foi possível encerrar."); return; }
    router.push(`${voltar}?aba=resumo`);
  };

  const sair = () => {
    leitor.pause();
    if (onSair) onSair();
    else router.push(voltar);
  };

  const ultimaDe = (id: string) => [...falas].reverse().find((f) => f.agente === id) ?? null;
  const encerrada = estado === "encerrada" || estado === "cancelada";
  const desde = reuniao.iniciada_em ? new Date(reuniao.iniciada_em).getTime() : null;
  const cols = ids.length + 1 <= 2 ? "grid-cols-2" : ids.length + 1 <= 4 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0b1018] text-white">
      {/* topo */}
      <header className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5 sm:px-5">
        <button type="button" onClick={sair} className="inline-flex size-10 items-center justify-center rounded-full hover:bg-white/10" aria-label="Sair da sala">
          <ChevronLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-white/60">
            {encerrada ? <span>Encerrada</span> : (
              <span className="inline-flex items-center gap-1.5 text-emerald-400"><span className="size-2 animate-pulse rounded-full bg-emerald-400" /> Ao vivo</span>
            )}
            {desde && agora && !encerrada && <span className="tabular-nums">{cronometro(agora - desde)}</span>}
            <span>#{reuniao.id}</span>
          </div>
          <h1 className="truncate text-[15px] font-semibold sm:text-base">{reuniao.titulo}</h1>
        </div>
        <button type="button" onClick={() => setChat((c) => !c)} aria-pressed={chat}
          className={`inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm ${chat ? "bg-white text-[#0b1018]" : "hover:bg-white/10"}`}>
          <MessagesSquare size={17} /> <span className="hidden sm:inline">Conversa</span>
          <span className="rounded-full bg-white/15 px-1.5 text-xs tabular-nums">{falas.length}</span>
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* grade de participantes */}
        <main className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-3 sm:p-5">
          <div className={`grid flex-1 content-center gap-2.5 sm:gap-3 ${cols}`}>
            {ids.map((id) => {
              const p = mapa.get(id);
              const fala = falandoAgora === id;
              const ult = ultimaDe(id);
              return (
                <div key={id} className={`relative flex min-h-[112px] flex-col items-center justify-center gap-1.5 rounded-2xl border p-2.5 transition sm:min-h-[180px] sm:gap-2 sm:p-3 ${
                  fala ? "border-emerald-400 bg-emerald-400/10 shadow-[0_0_0_3px_rgba(52,211,153,0.25)]" : "border-white/10 bg-white/[0.04]"}`}>
                  <Avatar id={id} nome={p?.nome ?? id} setor={p?.setor} tamanho={64} falando={fala} />
                  <div className="text-center">
                    <div className="text-sm font-semibold">{p?.nome ?? id}</div>
                    <div className="line-clamp-1 text-[11px] text-white/60">{p?.cargo}</div>
                  </div>
                  {fala && <Ondas />}
                  {!fala && ult && <div className="line-clamp-1 max-w-full px-2 text-[11px] text-white/45">“{ult.texto}”</div>}
                  {id === reuniao.convocada_por && <span className="absolute left-2 top-2 rounded-full bg-white/10 px-1.5 text-[10px] text-white/70">convocou</span>}
                </div>
              );
            })}
            {/* você */}
            <div className={`relative flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-2xl border p-3 sm:min-h-[180px] ${
              mic.ouvindo ? "border-sky-400 bg-sky-400/10" : "border-white/10 bg-white/[0.04]"}`}>
              <Avatar id="rafael" nome="Rafael" tamanho={64} falando={mic.ouvindo} />
              <div className="text-center">
                <div className="text-sm font-semibold">Você</div>
                <div className="text-[11px] text-white/60">{mic.ouvindo ? "ouvindo…" : mic.ativo ? "microfone ligado" : "microfone desligado"}</div>
              </div>
              {mic.ouvindo && <Ondas cor="#38bdf8" />}
            </div>
          </div>

          {/* legenda */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
            {pensando && !agentesFalando ? (
              <div className="flex items-center gap-2 text-sm text-white/75"><Loader2 size={16} className="animate-spin" /> Os participantes estão pensando na resposta…</div>
            ) : (
              <Legenda leitor={leitor} pessoas={mapa} escura compacta />
            )}
          </section>

          {(semChave || aviso || leitor.aviso || mic.erro || erro || mic.suportado === false) && (
            <div className="space-y-1 text-xs">
              {semChave && <Aviso>Respostas automáticas desligadas: falta a chave (ANTHROPIC_API_KEY). Sua fala foi registrada.</Aviso>}
              {aviso && <Aviso>{aviso}</Aviso>}
              {leitor.aviso && <Aviso>{leitor.aviso}</Aviso>}
              {mic.erro && <Aviso>{mic.erro}</Aviso>}
              {mic.suportado === false && <Aviso>Este navegador não reconhece voz (ex.: Firefox). Use o campo de texto; as respostas continuam com voz.</Aviso>}
              {erro && <Aviso>Sem conexão para buscar as falas novas ({erro}).</Aviso>}
            </div>
          )}
        </main>

        {/* conversa */}
        {chat && (
          <aside className="absolute inset-x-0 bottom-0 top-[61px] z-10 flex flex-col border-l border-white/10 bg-[#0e1520] sm:static sm:w-[380px]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 text-sm font-semibold">
              Conversa
              <button type="button" onClick={() => setChat(false)} className="inline-flex size-9 items-center justify-center rounded-full hover:bg-white/10" aria-label="Fechar a conversa"><X size={17} /></button>
            </div>
            <ol className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {falas.map((f) => {
                const p = mapa.get(f.agente);
                return (
                  <li key={f.id} className="flex gap-2.5">
                    <Avatar id={f.agente} nome={p?.nome ?? f.agente} setor={p?.setor} tamanho={30} selo={false} />
                    <div className="min-w-0">
                      <div className="text-[11px] text-white/55"><span className="font-semibold text-white/85">{f.agente === "rafael" ? "Você" : p?.nome ?? f.agente}</span> · {soHoraCliente(f.ts)}</div>
                      <p className="text-sm leading-snug text-white/90">{f.texto}</p>
                    </div>
                  </li>
                );
              })}
              {falas.length === 0 && <li className="text-sm text-white/55">Ninguém falou ainda.</li>}
            </ol>
          </aside>
        )}
      </div>

      {/* controles */}
      {!encerrada && entrou && (
        <footer className="border-t border-white/10 bg-[#0b1018] px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:px-5">
          {mic.rascunho && (
            <div className="mx-auto mb-3 max-w-3xl rounded-2xl border border-sky-400/40 bg-sky-400/10 p-3">
              <div className="mb-1 flex items-center justify-between text-[11px] text-sky-200">
                <span>{mic.contagem !== null ? `Enviando em ${(mic.contagem / 1000).toFixed(1).replace(".", ",")} s · toque no texto para corrigir` : "Confira e envie"}</span>
                {mic.contagem !== null && <span className="h-1 w-24 overflow-hidden rounded-full bg-white/15"><span className="block h-full bg-sky-300" style={{ width: `${(mic.contagem / 1500) * 100}%` }} /></span>}
              </div>
              <textarea value={mic.rascunho} onChange={(e) => mic.editar(e.target.value)} onFocus={mic.focarEdicao} rows={2}
                aria-label="Texto reconhecido" className="w-full resize-none bg-transparent text-[15px] text-white outline-none" />
              <div className="mt-1 flex justify-end gap-2">
                <button type="button" onClick={mic.descartar} className="h-9 rounded-full px-3 text-sm text-white/75 hover:bg-white/10">Descartar</button>
                <button type="button" onClick={mic.enviarAgora} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-sky-400 px-4 text-sm font-semibold text-[#0b1018]"><Send size={15} /> Enviar</button>
              </div>
            </div>
          )}
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-2 sm:flex-nowrap">
            {mic.suportado !== false && (
              <>
                {mic.modo === "segurar" ? (
                  <button type="button"
                    onPointerDown={(e) => { e.preventDefault(); (e.target as HTMLElement).setPointerCapture?.(e.pointerId); mic.apertar(); }}
                    onPointerUp={mic.soltar} onPointerCancel={mic.soltar}
                    disabled={agentesFalando || pensando}
                    className={`inline-flex h-14 select-none items-center gap-2 rounded-full px-5 text-sm font-semibold transition disabled:opacity-50 ${
                      mic.ouvindo ? "scale-105 bg-sky-400 text-[#0b1018]" : "bg-white text-[#0b1018]"}`}
                    style={{ touchAction: "none" }} aria-label="Segure para falar">
                    <Mic size={20} /> {mic.ouvindo ? "Ouvindo… solte para parar" : agentesFalando ? "Aguarde a vez" : "Segure para falar"}
                  </button>
                ) : (
                  <button type="button" onClick={mic.alternar} aria-pressed={mic.ativo}
                    className={`inline-flex h-14 items-center gap-2 rounded-full px-5 text-sm font-semibold ${mic.ativo ? "bg-sky-400 text-[#0b1018]" : "bg-white text-[#0b1018]"}`}>
                    {mic.ativo ? <Mic size={20} /> : <MicOff size={20} />}
                    {mic.ativo ? (agentesFalando || pensando ? "Microfone em pausa" : "Microfone ligado") : "Ligar microfone"}
                  </button>
                )}
                <div className="flex rounded-full bg-white/10 p-0.5 text-xs font-semibold" role="group" aria-label="Modo do microfone">
                  {(["segurar", "continuo"] as const).map((m) => (
                    <button key={m} type="button" onClick={() => mic.setModo(m)} aria-pressed={mic.modo === m}
                      className={`h-9 rounded-full px-3 ${mic.modo === m ? "bg-white text-[#0b1018]" : "text-white/75"}`}>
                      {m === "segurar" ? "Segurar" : "Contínuo"}
                    </button>
                  ))}
                </div>
              </>
            )}
            <form className="flex min-w-[220px] flex-1 items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] py-1 pl-4 pr-1"
              onSubmit={(e) => { e.preventDefault(); if (texto.trim() && !pensando) { enviar(texto); setTexto(""); } }}>
              <Keyboard size={16} className="shrink-0 text-white/50" />
              <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreva para a reunião…" aria-label="Escrever para a reunião"
                className="h-10 min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-white/40" />
              <button type="submit" disabled={!texto.trim() || pensando} aria-label="Enviar"
                className="inline-flex size-10 items-center justify-center rounded-full bg-white text-[#0b1018] disabled:opacity-40"><Send size={17} /></button>
            </form>
            <button type="button" onClick={() => leitor.setVolume(leitor.volume === 0 ? 1 : 0)} aria-label={leitor.volume === 0 ? "Ligar o som" : "Tirar o som"}
              className="inline-flex size-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/15">
              {leitor.volume === 0 ? <VolumeX size={19} /> : <Volume2 size={19} />}
            </button>
            {reuniao.convocada_por === "rafael" && (
              <button type="button" onClick={encerrar} className="inline-flex h-12 items-center gap-1.5 rounded-full bg-red-500 px-4 text-sm font-semibold hover:bg-red-600">
                <PhoneOff size={18} /> <span className="hidden sm:inline">Encerrar</span>
              </button>
            )}
          </div>
          {mic.suportado && <p className="mt-2 hidden text-center sm:block text-[11px] text-white/40">Espaço segura o microfone · ele pausa enquanto os participantes falam · envio automático após 1,5 s de silêncio</p>}
        </footer>
      )}

      {/* antes de entrar: um toque libera o som e o microfone no navegador */}
      {!entrou && !encerrada && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0b1018]/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111a27] p-6 text-center shadow-2xl">
            <div className="mb-4 flex justify-center">
              <div className="flex -space-x-3">
                {ids.slice(0, 5).map((id) => <span key={id} className="rounded-full ring-4 ring-[#111a27]"><Avatar id={id} nome={mapa.get(id)?.nome ?? id} setor={mapa.get(id)?.setor} tamanho={52} selo={false} /></span>)}
              </div>
            </div>
            <h2 className="text-lg font-semibold">{reuniao.titulo}</h2>
            <p className="mt-1 text-sm text-white/65">{ids.map((id) => mapa.get(id)?.nome ?? id).join(", ")}</p>
            {reuniao.pauta.length > 0 && (
              <ol className="mx-auto mt-3 max-w-xs list-decimal space-y-0.5 pl-5 text-left text-sm text-white/75">
                {reuniao.pauta.slice(0, 4).map((p, i) => <li key={i}>{p}</li>)}
              </ol>
            )}
            <button type="button" onClick={entrar} className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-emerald-500 text-[15px] font-semibold hover:bg-emerald-400">
              <Mic size={18} /> Entrar na reunião
            </button>
            <p className="mt-3 flex items-start gap-1.5 text-left text-[11px] text-white/50">
              <Info size={13} className="mt-px shrink-0" />
              O navegador pode pedir acesso ao microfone. A voz e o reconhecimento dependem do navegador (Chrome, Edge e Safari reconhecem voz; no Firefox, só texto).
            </p>
            <button type="button" onClick={sair} className="mt-3 text-sm text-white/60 hover:text-white">Voltar</button>
          </div>
        </div>
      )}
      {encerrada && (
        <div className="absolute inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#111a27] p-4 text-center text-sm">
          Reunião encerrada. <Link href={`${voltar}?aba=resumo`} className="font-semibold text-sky-300 underline">Ver a ata</Link>
        </div>
      )}
    </div>
  );
}

function Aviso({ children }: { children: React.ReactNode }) {
  return <p className="flex items-start gap-1.5 rounded-lg bg-amber-400/10 px-3 py-2 text-amber-200"><Info size={14} className="mt-px shrink-0" /> {children}</p>;
}

function Ondas({ cor = "#34d399" }: { cor?: string }) {
  return (
    <span className="flex h-4 items-end gap-0.5" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className="w-1 rounded-full motion-safe:animate-[onda_0.9s_ease-in-out_infinite]"
          style={{ background: cor, height: "100%", animationDelay: `${i * 0.12}s` }} />
      ))}
    </span>
  );
}
