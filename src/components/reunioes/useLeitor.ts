"use client";

// Toca uma conversa em sequência: cada fala com a voz do agente (speechSynthesis), legenda, pausa, pular,
// velocidade e volume. Sem voz no navegador (ou se ela falhar), passa só a legenda no tempo de leitura.
// Ao vivo: quando chega ao fim, espera as próximas falas e fala assim que elas chegam.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { frases, tempoLeitura, type Fala } from "@/lib/falas";
import { carregarVozes, perfisDeVoz, temVoz, type PerfilVoz } from "@/lib/voz";

export type ModoLeitor = "carregando" | "voz" | "legenda";

export type Leitor = {
  indice: number; // fala atual (pode ser = falas.length quando está esperando a próxima, ao vivo)
  falaAtual: Fala | null;
  parte: number; // frase da fala atual que está sendo dita
  tocando: boolean;
  esperando: boolean; // ao vivo, no fim, aguardando fala nova
  terminou: boolean;
  modo: ModoLeitor;
  aviso: string | null;
  velocidade: number;
  volume: number;
  aoVivo: boolean;
  perfis: Record<string, PerfilVoz>;
  play: (de?: number) => void;
  pause: () => void;
  alternar: () => void;
  proxima: () => void;
  anterior: () => void;
  irPara: (i: number) => void;
  setVelocidade: (v: number) => void;
  setVolume: (v: number) => void;
  setAoVivo: (v: boolean) => void;
  irParaAoVivo: () => void;
};

export function useLeitor({
  falas, pularFala, aoVivoInicial = false, ids = [],
}: {
  falas: Fala[];
  pularFala?: (f: Fala) => boolean; // não fala em voz alta (ex.: as falas do próprio Rafael na sala), só mostra
  aoVivoInicial?: boolean;
  ids?: string[]; // participantes que podem falar (para distribuir as vozes antes das falas chegarem)
}): Leitor {
  const [indice, setIndice] = useState(0);
  const [parte, setParte] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [terminou, setTerminou] = useState(false);
  const [ciclo, setCiclo] = useState(0); // muda a cada play/pulo explícito, para recomeçar a fala atual
  const [vozes, setVozes] = useState<SpeechSynthesisVoice[] | null>(null);
  const [modo, setModo] = useState<ModoLeitor>("carregando");
  const [aviso, setAviso] = useState<string | null>(null);
  const [velocidade, setVelocidade] = useState(1);
  const [volume, setVolume] = useState(1);
  const [aoVivo, setAoVivo] = useState(aoVivoInicial);

  const falasRef = useRef(falas);
  falasRef.current = falas;
  const pularRef = useRef(pularFala);
  pularRef.current = pularFala;
  const cfg = useRef({ velocidade, volume, aoVivo });
  cfg.current = { velocidade, volume, aoVivo };

  useEffect(() => {
    let vivo = true;
    if (!temVoz()) {
      setModo("legenda");
      setAviso("Este navegador não tem voz sintetizada: a conversa passa só com legenda.");
      setVozes([]);
      return;
    }
    carregarVozes().then((v) => {
      if (!vivo) return;
      setVozes(v);
      setModo("voz");
      if (v.length === 0) setAviso("Nenhuma voz em português instalada no aparelho: usando a voz padrão do navegador.");
    });
    return () => {
      vivo = false;
      window.speechSynthesis?.cancel();
    };
  }, []);

  const todosIds = useMemo(
    () => [...new Set([...ids, ...falas.map((f) => f.agente)])].sort().join("|"),
    [ids, falas],
  );
  const perfis = useMemo(() => perfisDeVoz(todosIds ? todosIds.split("|") : [], vozes ?? []), [todosIds, vozes]);
  const perfisRef = useRef(perfis);
  perfisRef.current = perfis;

  const avancar = useCallback((de: number) => {
    const n = falasRef.current.length;
    if (de + 1 < n) {
      setIndice(de + 1);
    } else if (cfg.current.aoVivo) {
      setIndice(n); // espera a próxima fala
    } else {
      setTocando(false);
      setTerminou(true);
      setIndice(Math.max(0, n - 1));
    }
  }, []);

  const fala = indice < falas.length ? falas[indice] : null;
  const chave = tocando && fala && modo !== "carregando" ? `${indice}:${fala.id}:${ciclo}:${modo}` : null;

  // Fala a fala atual quando a chave muda (nova fala, pulo, play).
  useEffect(() => {
    if (!chave || !fala) return;
    const i = indice;
    let acabou = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const fim = () => {
      if (acabou) return;
      acabou = true;
      timers.forEach(clearTimeout);
      avancar(i);
    };
    setParte(0);
    const partes = frases(fala.texto);
    const { velocidade: vel, volume: vol } = cfg.current;

    // só legenda: sem voz, sem som ou fala que não deve ser dita em voz alta
    if (modo === "legenda" || vol === 0 || pularRef.current?.(fala)) {
      const total = pularRef.current?.(fala) ? 900 : tempoLeitura(fala.texto, vel);
      const porParte = total / partes.length;
      partes.forEach((_, k) => k > 0 && timers.push(setTimeout(() => setParte(k), porParte * k)));
      timers.push(setTimeout(fim, total));
      return () => { acabou = true; timers.forEach(clearTimeout); };
    }

    const synth = window.speechSynthesis;
    synth.cancel();
    const perfil = perfisRef.current[fala.agente];
    let comecou = false;
    partes.forEach((p, k) => {
      const u = new SpeechSynthesisUtterance(p);
      u.lang = perfil?.voz?.lang ?? "pt-BR";
      if (perfil?.voz) u.voice = perfil.voz;
      u.pitch = perfil?.pitch ?? 1;
      u.rate = Math.min(3, Math.max(0.5, (perfil?.rate ?? 1) * vel));
      u.volume = vol;
      u.onstart = () => { comecou = true; setParte(k); };
      if (k === partes.length - 1) u.onend = fim;
      u.onerror = (e) => {
        if (acabou || e.error === "interrupted" || e.error === "canceled") return;
        if (e.error === "not-allowed") {
          setAviso("O navegador bloqueou a voz até você tocar na tela: toque em Assistir de novo.");
          acabou = true;
          setTocando(false);
          return;
        }
        fim();
      };
      synth.speak(u);
    });
    // vigias: a voz não começou em 4 s (aparelho sem síntese) → passa a só legenda; ou não terminou nunca
    timers.push(setTimeout(() => {
      if (comecou || acabou) return;
      acabou = true;
      synth.cancel();
      setModo("legenda");
      setAviso("A voz do navegador não respondeu: seguindo só com legenda.");
    }, 4000));
    timers.push(setTimeout(fim, tempoLeitura(fala.texto, vel) * 2.5 + 4000));
    return () => {
      acabou = true;
      timers.forEach(clearTimeout);
      synth.cancel();
    };
  }, [chave]); // eslint-disable-line react-hooks/exhaustive-deps

  const play = useCallback((de?: number) => {
    const n = falasRef.current.length;
    setTerminou(false);
    setIndice((atual) => {
      if (de !== undefined) return Math.max(0, Math.min(de, n));
      if (atual >= n && !cfg.current.aoVivo) return 0;
      return terminouRef.current ? 0 : atual;
    });
    setTocando(true);
    setCiclo((c) => c + 1);
  }, []);
  const terminouRef = useRef(terminou);
  terminouRef.current = terminou;

  const pause = useCallback(() => {
    setTocando(false);
    if (temVoz()) window.speechSynthesis.cancel();
  }, []);

  const irPara = useCallback((i: number) => {
    setTerminou(false);
    setIndice(Math.max(0, Math.min(i, falasRef.current.length - 1)));
    setCiclo((c) => c + 1);
  }, []);

  return {
    indice,
    falaAtual: fala ?? (tocando ? null : falas[Math.min(indice, falas.length - 1)] ?? null),
    parte,
    tocando,
    esperando: tocando && indice >= falas.length,
    terminou,
    modo,
    aviso,
    velocidade,
    volume,
    aoVivo,
    perfis,
    play,
    pause,
    alternar: () => (tocando ? pause() : play()),
    proxima: () => irPara(Math.min(indice + 1, falas.length - 1)),
    anterior: () => irPara(Math.max(0, indice - 1)),
    irPara,
    setVelocidade,
    setVolume,
    setAoVivo,
    irParaAoVivo: () => {
      setAoVivo(true);
      play(Math.max(0, falasRef.current.length - 1));
    },
  };
}
