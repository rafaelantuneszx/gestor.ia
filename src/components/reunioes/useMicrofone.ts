"use client";

// Microfone da sala de reunião (Web Speech API, SpeechRecognition, pt-BR).
// Dois modos: "segurar" (fala enquanto segura o botão) e "continuo" (fica ouvindo até desligar).
// O texto reconhecido aparece antes de ir; depois de ~1,5 s de silêncio ele é enviado sozinho, a não ser que o
// Rafael comece a corrigir. Enquanto os agentes falam (`pausado`), o microfone fica desligado para não captar o eco.
import { useCallback, useEffect, useRef, useState } from "react";

type Reconhecimento = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};
type Construtor = new () => Reconhecimento;

function construtor(): Construtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: Construtor; webkitSpeechRecognition?: Construtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type ModoMic = "segurar" | "continuo";
export const SILENCIO_MS = 1500;

export function useMicrofone({
  pausado, onEnviar,
}: {
  pausado: boolean;
  onEnviar: (texto: string) => void;
}) {
  const [suportado, setSuportado] = useState<boolean | null>(null);
  const [modo, setModo] = useState<ModoMic>("segurar");
  const [ativo, setAtivo] = useState(false); // o Rafael quer o microfone ligado (contínuo) ou está segurando o botão
  const [ouvindo, setOuvindo] = useState(false); // o reconhecimento está de fato rodando
  const [rascunho, setRascunhoState] = useState("");
  const [editando, setEditando] = useState(false);
  const [contagem, setContagem] = useState<number | null>(null); // ms até o envio automático
  const [erro, setErro] = useState<string | null>(null);

  const rec = useRef<Reconhecimento | null>(null);
  const finais = useRef("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const estado = useRef({ ativo, pausado, editando, modo });
  estado.current = { ativo, pausado, editando, modo };
  const enviarRef = useRef(onEnviar);
  enviarRef.current = onEnviar;
  const rascunhoRef = useRef("");

  useEffect(() => setSuportado(!!construtor()), []);

  const setRascunho = useCallback((t: string) => {
    rascunhoRef.current = t;
    setRascunhoState(t);
  }, []);

  const cancelarEnvio = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (tick.current) clearInterval(tick.current);
    timer.current = null;
    tick.current = null;
    setContagem(null);
  }, []);

  const enviarAgora = useCallback(() => {
    cancelarEnvio();
    const t = rascunhoRef.current.trim();
    if (!t) return;
    finais.current = "";
    setRascunho("");
    setEditando(false);
    enviarRef.current(t);
  }, [cancelarEnvio, setRascunho]);

  // Silêncio: depois do último pedaço reconhecido, conta 1,5 s e envia.
  const agendarEnvio = useCallback(() => {
    cancelarEnvio();
    if (estado.current.editando || !rascunhoRef.current.trim()) return;
    const fim = Date.now() + SILENCIO_MS;
    setContagem(SILENCIO_MS);
    tick.current = setInterval(() => setContagem(Math.max(0, fim - Date.now())), 100);
    timer.current = setTimeout(enviarAgora, SILENCIO_MS);
  }, [cancelarEnvio, enviarAgora]);

  const ligar = useCallback(() => {
    const C = construtor();
    if (!C || rec.current) return;
    const r = new C();
    r.lang = "pt-BR";
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;
    finais.current = rascunhoRef.current ? `${rascunhoRef.current.trim()} ` : "";
    r.onstart = () => setOuvindo(true);
    r.onresult = (e) => {
      let interino = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finais.current += `${res[0].transcript.trim()} `;
        else interino += res[0].transcript;
      }
      setRascunho(`${finais.current}${interino}`.replace(/\s+/g, " ").trimStart());
      setErro(null);
      agendarEnvio();
    };
    r.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setErro("O navegador não deu acesso ao microfone. Libere o microfone para este site ou use o campo de texto.");
        setAtivo(false);
      } else if (e.error === "network") {
        setErro("O reconhecimento de voz precisa de internet (o navegador manda o áudio para o serviço dele).");
      } else {
        setErro(`Microfone: ${e.error}`);
      }
    };
    r.onend = () => {
      rec.current = null;
      setOuvindo(false);
      // contínuo: o Chrome encerra sozinho de tempos em tempos; religa enquanto estiver ativo e sem agente falando
      const s = estado.current;
      if (s.modo === "continuo" && s.ativo && !s.pausado) setTimeout(() => estado.current.ativo && !estado.current.pausado && ligar(), 250);
    };
    rec.current = r;
    try {
      r.start();
    } catch {
      rec.current = null;
    }
  }, [agendarEnvio, setRascunho]);

  const desligar = useCallback((abortar = false) => {
    const r = rec.current;
    if (!r) return;
    if (abortar) r.abort();
    else r.stop();
  }, []);

  // Pausa enquanto os agentes falam; volta sozinho no modo contínuo.
  useEffect(() => {
    if (pausado) desligar(true);
    else if (ativo && modo === "continuo") ligar();
  }, [pausado, ativo, modo, ligar, desligar]);

  useEffect(() => () => { cancelarEnvio(); rec.current?.abort(); }, [cancelarEnvio]);

  return {
    suportado,
    modo,
    setModo: (m: ModoMic) => { setAtivo(false); desligar(true); setModo(m); },
    ativo,
    ouvindo,
    rascunho,
    contagem,
    erro,
    // segurar para falar
    apertar: () => { if (pausado) return; setAtivo(true); cancelarEnvio(); ligar(); },
    soltar: () => { setAtivo(false); desligar(); },
    // contínuo
    alternar: () => {
      if (ativo) { setAtivo(false); desligar(); } else { setAtivo(true); if (!pausado) ligar(); }
    },
    editar: (t: string) => { setEditando(true); cancelarEnvio(); setRascunho(t); finais.current = t ? `${t} ` : ""; },
    focarEdicao: () => { setEditando(true); cancelarEnvio(); },
    enviarAgora,
    descartar: () => { cancelarEnvio(); finais.current = ""; setRascunho(""); setEditando(false); },
  };
}
