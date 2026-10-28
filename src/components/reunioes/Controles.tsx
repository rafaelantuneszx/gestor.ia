"use client";

// Peças do "Assistir": legenda grande de quem está falando e os controles (play/pause, pular, velocidade, volume).
// Usadas na página da reunião, na sala de reunião e no escritório 3D.
import { Pause, Play, Radio, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { frases } from "@/lib/falas";
import { soHoraCliente } from "@/lib/horario";
import type { Leitor } from "./useLeitor";

export type Pessoa = { id: string; nome: string; cargo?: string; setor?: string | null };

export function Legenda({
  leitor, pessoas, compacta = false, escura = false,
}: {
  leitor: Leitor;
  pessoas: Map<string, Pessoa>;
  compacta?: boolean;
  escura?: boolean;
}) {
  const f = leitor.falaAtual;
  if (!f) {
    return (
      <div className={`text-sm ${escura ? "text-white/70" : "text-muted"}`}>
        {leitor.esperando ? "Aguardando a próxima fala…" : "Nenhuma fala ainda."}
      </div>
    );
  }
  const p = pessoas.get(f.agente);
  const partes = frases(f.texto);
  return (
    <div className="flex min-w-0 items-start gap-3" aria-live="polite">
      <Avatar id={f.agente} nome={p?.nome ?? f.agente} setor={p?.setor} tamanho={compacta ? 40 : 56}
        falando={leitor.tocando && !leitor.esperando} />
      <div className="min-w-0 flex-1">
        <div className={`flex flex-wrap items-baseline gap-x-2 text-sm ${escura ? "text-white/75" : "text-muted"}`}>
          <span className={`font-semibold ${escura ? "text-white" : "text-text"}`}>{p?.nome ?? f.agente}</span>
          {p?.cargo && <span className="truncate">{p.cargo}</span>}
          <span className="tabular-nums">{soHoraCliente(f.ts)}</span>
        </div>
        <p className={`mt-0.5 font-medium leading-snug ${compacta ? "text-base" : "text-lg sm:text-xl"} ${escura ? "text-white" : "text-text"}`}>
          {partes.map((t, k) => (
            <span key={k} className={leitor.tocando && k !== leitor.parte ? "opacity-55" : ""}>{t} </span>
          ))}
        </p>
      </div>
    </div>
  );
}

const VELOCIDADES = [1, 1.5, 2];

export function Controles({
  leitor, total, aoVivoDisponivel = false, escura = false, rotuloPlay = "Assistir",
}: {
  leitor: Leitor;
  total: number;
  aoVivoDisponivel?: boolean;
  escura?: boolean;
  rotuloPlay?: string;
}) {
  const btn = `inline-flex size-11 items-center justify-center rounded-full transition disabled:opacity-40 ${
    escura ? "text-white hover:bg-white/10" : "text-text hover:bg-bg"}`;
  const mudo = leitor.volume === 0;
  const pos = Math.min(leitor.indice + 1, total);
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
      <div className="flex items-center gap-1">
        <button type="button" className={btn} onClick={leitor.anterior} disabled={total === 0 || leitor.indice <= 0} aria-label="Fala anterior">
          <SkipBack size={18} />
        </button>
        <button type="button" onClick={leitor.alternar} disabled={total === 0 && !aoVivoDisponivel}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
          aria-label={leitor.tocando ? "Pausar" : rotuloPlay}>
          {leitor.tocando ? <Pause size={18} /> : <Play size={18} />}
          <span>{leitor.tocando ? "Pausar" : leitor.terminou ? "De novo" : rotuloPlay}</span>
        </button>
        <button type="button" className={btn} onClick={leitor.proxima} disabled={total === 0 || leitor.indice >= total - 1} aria-label="Próxima fala">
          <SkipForward size={18} />
        </button>
      </div>
      <span className={`min-w-14 text-xs tabular-nums ${escura ? "text-white/70" : "text-muted"}`}>
        {total > 0 ? `${pos} de ${total}` : "sem falas"}
      </span>
      <div className={`flex items-center rounded-full p-0.5 text-xs font-semibold ${escura ? "bg-white/10" : "bg-bg"}`} role="group" aria-label="Velocidade">
        {VELOCIDADES.map((v) => (
          <button key={v} type="button" onClick={() => leitor.setVelocidade(v)} aria-pressed={leitor.velocidade === v}
            className={`h-8 rounded-full px-2.5 tabular-nums ${leitor.velocidade === v
              ? escura ? "bg-white text-[#0b1220]" : "bg-card text-text shadow-sm"
              : escura ? "text-white/75" : "text-muted"}`}>
            {String(v).replace(".", ",")}x
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <button type="button" className={btn} onClick={() => leitor.setVolume(mudo ? 1 : 0)} aria-label={mudo ? "Ligar o som" : "Tirar o som"}>
          {mudo ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <input type="range" min={0} max={1} step={0.05} value={leitor.volume} aria-label="Volume"
          onChange={(e) => leitor.setVolume(Number(e.target.value))} className="w-20 accent-[var(--accent)] sm:w-24" />
      </div>
      {aoVivoDisponivel && (
        <button type="button" onClick={leitor.irParaAoVivo}
          className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ${
            leitor.aoVivo ? "bg-ok-soft text-ok" : escura ? "bg-white/10 text-white" : "bg-bg text-muted hover:text-text"}`}>
          <Radio size={14} className={leitor.aoVivo ? "animate-pulse" : ""} />
          {leitor.aoVivo ? "Ao vivo" : "Ir para o ao vivo"}
        </button>
      )}
    </div>
  );
}
