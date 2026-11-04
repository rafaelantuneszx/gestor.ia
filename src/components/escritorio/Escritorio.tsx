"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr, CameraControls, Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import {
  Archive, Building2, Cctv, ConciergeBell, Coffee, Compass, Crown, Eye, FileSpreadsheet, Grid2x2, Headphones, Landmark,
  LogIn, Package, Pause, Play, Presentation, Radio, Server, Truck, X, type LucideIcon,
} from "lucide-react";
import {
  CAMERA, CAMERAS, MESAS, MOSAICO, PREDIO, aplicarEvento, casa, conferirTravadas, estadoVazio, hora, lugaresReuniao,
  viagemDoEvento, GRUPO_COR,
  type AgenteInfo, type DemandaResumo, type EstadoAgente, type EventoCentral, type SetorInfo, type Viagem, type Vista,
} from "@/lib/escritorio/modelo";
import { DEMO_AGENTES, DEMO_CONTAGEM, DEMO_DEMANDAS, DEMO_SETORES, demoEventos, demoReunioes } from "@/lib/escritorio/demo";
import { CAMPOS_RESUMO, eventoDeReuniao, itensPauta, proximaAgendada, type ReuniaoResumo } from "@/lib/reunioes";
import { falaDoEvento, tempoLeitura, type Fala } from "@/lib/falas";
import { horaComSegundos } from "@/lib/horario";
import { supabaseNavegador } from "@/lib/supabase/browser";
import { Avatar } from "@/components/Avatar";
import { Controles, Legenda } from "@/components/reunioes/Controles";
import { useLeitor } from "@/components/reunioes/useLeitor";
import { Arquivo, Copa, DetalhesSalas, MesaAgente, Mobilia, Recepcao, SalaRafael, SalaReuniao } from "./Cena";
import { Predio } from "./Predio";
import { Boneco, Rafael } from "./Boneco";
import { Efeitos } from "./Efeitos";
import { Mosaico, layoutMosaico } from "./Mosaico";
import { PainelProdutividade, ResumoProdutividade, useProdutividade } from "./Produtividade";
import { diaDe } from "@/lib/produtividade";
import type { PainelTV } from "./tv";

const ATUALIZAR_MS = 8000;
const ATUALIZAR_REUNIAO_MS = 3000;
const PASSO_REPRODUCAO_MS = 1100;
const ALTURA_TOPO = 57;

const ICONE_CAMERA: Record<string, LucideIcon> = {
  geral: Eye, direcao: Compass, sistemas: Server, financeiro: Landmark, custos: FileSpreadsheet, "frota-rh": Truck,
  suprimentos: Package, reuniao: Presentation, rafael: Crown, arquivo: Archive, recepcao: ConciergeBell, cima: Grid2x2,
  copa: Coffee,
};

// Ritmo do desenho: 30 quadros por segundo bastam para o escritório ao vivo (metade do trabalho da placa de vídeo);
// 60 enquanto o Rafael gira ou aproxima a câmera. Com a aba escondida o navegador já para tudo.
function Ritmo({ rapido }: { rapido: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const t = setInterval(() => invalidate(), rapido ? 1000 / 60 : 1000 / 30);
    return () => clearInterval(t);
  }, [invalidate, rapido]);
  return null;
}

// Sombras recalculadas a cada 3 quadros (os bonecos andam devagar; refazer o mapa de sombra todo quadro era caro).
function SombrasEspacadas({ ativo }: { ativo: boolean }) {
  const gl = useThree((s) => s.gl);
  const n = useRef(0);
  useEffect(() => {
    if (!ativo) return;
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    return () => { gl.shadowMap.autoUpdate = true; };
  }, [gl, ativo]);
  useFrame(() => {
    if (ativo && n.current++ % 3 === 0) gl.shadowMap.needsUpdate = true;
  });
  return null;
}

// Avisa quando o primeiro quadro foi desenhado (a compilação dos shaders pode levar alguns segundos).
function PrimeiroQuadro({ onPronto }: { onPronto: () => void }) {
  const quadros = useRef(0);
  useFrame(() => {
    quadros.current += 1;
    if (quadros.current === 2) onPronto();
  });
  return null;
}

// Enquadramento geral: em telas estreitas (celular) a câmera sobe e se afasta para caber o prédio inteiro.
function visaoGeralPara(largura: number, altura: number): Vista {
  const aspecto = largura / Math.max(altura, 1);
  const k = aspecto >= 1.5 ? 1 : Math.min(2.6, 1.5 / Math.max(aspecto, 0.45));
  const [x, y, z, tx, ty, tz] = CAMERA.geral.vista;
  return [x, y * k, z * (0.75 + k * 0.25), tx, ty, tz - (k - 1) * 2];
}
function vistaDe(id: string, largura: number, altura: number): Vista {
  if (id === "geral") return visaoGeralPara(largura, altura);
  if (id === "cima") {
    // no celular (tela em pé), gira a planta para o lado comprido ficar na vertical
    const emPe = largura < altura;
    const k = emPe ? 1.25 : largura / altura < 1.45 ? 1.15 : 0.9;
    const cx = (PREDIO.x0 + PREDIO.x1) / 2;
    const cz = (PREDIO.z0 + PREDIO.z1) / 2;
    return emPe ? [cx + 0.01, 64 * k, cz, cx, 0, cz] : [cx, 64 * k, cz + 0.01, cx, 0, cz];
  }
  return CAMERA[id]?.vista ?? CAMERA.geral.vista;
}

type Dados = {
  agentes: AgenteInfo[];
  setores: SetorInfo[];
  eventos: EventoCentral[];
  demandas: DemandaResumo[];
  contagem: Record<string, number>;
  reunioes: ReuniaoResumo[];
};

function estadosDe(eventos: EventoCentral[], agentes: AgenteInfo[]) {
  const est: Record<string, EstadoAgente> = Object.fromEntries(agentes.map((a) => [a.id, estadoVazio()]));
  for (const ev of eventos) if (est[ev.agente]) est[ev.agente] = aplicarEvento(est[ev.agente], ev);
  return conferirTravadas(est);
}

async function carregar(desdeId: number | null, completo = true): Promise<Partial<Dados> & { eventos: EventoCentral[] }> {
  const sb = supabaseNavegador();
  const desde = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const evQuery = desdeId === null
    ? sb.from("central_eventos").select("*").gte("ts", desde).order("id").limit(2000)
    : sb.from("central_eventos").select("*").gt("id", desdeId).order("id").limit(500);
  const [ev, dem, docs, reu, ag, st] = await Promise.all([
    evQuery,
    completo ? sb.from("central_demandas").select("id, de, para, estado, titulo, prioridade") : Promise.resolve({ data: null }),
    completo ? sb.from("central_documentos").select("setor") : Promise.resolve({ data: null }),
    // abertas (agendada, em andamento) e as que mudaram nas últimas 24 h, para a reprodução do dia
    sb.from("central_reunioes").select(CAMPOS_RESUMO)
      .or(`estado.in.(agendada,em_andamento),atualizado_em.gte.${desde}`).order("id"),
    desdeId === null ? sb.from("central_agentes").select("*") : Promise.resolve({ data: null }),
    desdeId === null ? sb.from("central_setores").select("id, nome").order("ordem") : Promise.resolve({ data: null }),
  ]);
  const contagem: Record<string, number> = {};
  for (const d of (docs.data ?? []) as { setor: string }[]) contagem[d.setor] = (contagem[d.setor] ?? 0) + 1;
  return {
    eventos: (ev.data ?? []) as EventoCentral[],
    ...(dem.data ? { demandas: dem.data as DemandaResumo[], contagem } : {}),
    reunioes: (reu.data ?? []) as ReuniaoResumo[],
    ...(ag.data ? { agentes: ag.data as AgenteInfo[] } : {}),
    ...(st.data ? { setores: st.data as SetorInfo[] } : {}),
  };
}

// Relógio do mosaico (só este pedaço re-renderiza a cada segundo).
function RotulosMosaico({ visoes, largura, altura, topo, onEscolher }: {
  visoes: string[]; largura: number; altura: number; topo: number; onEscolher: (id: string) => void;
}) {
  const [agora, setAgora] = useState(() => horaComSegundos());
  useEffect(() => {
    const t = setInterval(() => setAgora(horaComSegundos()), 1000);
    return () => clearInterval(t);
  }, []);
  const rets = layoutMosaico(largura, altura, visoes.length, topo);
  return (
    <>
      {visoes.map((id, i) => {
        const r = rets[i];
        const Icone = ICONE_CAMERA[id] ?? Cctv;
        return (
          <button key={id} type="button" onClick={() => onEscolher(id)} aria-label={`Abrir a câmera ${CAMERA[id]?.nome ?? id}`}
            className="group absolute overflow-hidden rounded-lg text-left ring-1 ring-white/15 transition hover:ring-2 hover:ring-sky-400 focus-visible:ring-2 focus-visible:ring-sky-400"
            style={{ left: r.x, top: r.y + ALTURA_TOPO * 0, width: r.w, height: r.h }}>
            <span className="absolute left-2 top-2 flex items-center gap-1.5 rounded bg-black/55 px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide text-white">
              <span className="size-1.5 animate-pulse rounded-full bg-red-500" /> CAM {String(i + 1).padStart(2, "0")}
              <Icone size={12} className="ml-0.5 opacity-80" /> {CAMERA[id]?.nome ?? id}
            </span>
            <span className="absolute bottom-2 right-2 rounded bg-black/55 px-2 py-0.5 font-mono text-[11px] tabular-nums text-white/90">{agora}</span>
            <span className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.025)_0px,rgba(255,255,255,0.025)_1px,transparent_1px,transparent_3px)]" />
          </button>
        );
      })}
    </>
  );
}

export default function Escritorio({ modo }: { modo: "real" | "demo" }) {
  const router = useRouter();
  const [dados, setDados] = useState<Dados | null>(null);
  const [estados, setEstados] = useState<Record<string, EstadoAgente>>({});
  const [filas, setFilas] = useState<Record<string, Viagem[]>>({});
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const selecionadoRef = useRef<string | null>(null);
  useEffect(() => { selecionadoRef.current = selecionado; }, [selecionado]);
  const [reproduzindo, setReproduzindo] = useState<{ i: number; hora: string } | null>(null);
  const [atualizado, setAtualizado] = useState<string>("");
  const [erro, setErro] = useState<string | null>(null);
  const [cameraAtual, setCameraAtual] = useState("geral");
  const [mosaico, setMosaico] = useState(false);
  const [interagindo, setInteragindo] = useState(false);
  const [assistindo, setAssistindo] = useState<number | null>(null);
  const ultimoId = useRef<number | null>(null);
  const camera = useRef<CameraControls>(null);
  const demoBase = useRef(Date.now());
  const [tela, setTela] = useState(() => ({ w: window.innerWidth, h: window.innerHeight - ALTURA_TOPO }));
  // painel de produtividade: aberto de saída em tela larga, recolhido no celular
  const [diaProd, setDiaProd] = useState(() => diaDe());
  const [agenteProd, setAgenteProd] = useState<string | null>(null);
  const [prodAberto, setProdAberto] = useState(() => window.innerWidth >= 900);
  const produtividade = useProdutividade(modo, diaProd, modo === "demo" ? dados?.eventos : undefined);

  const agentesMap = useMemo(() => new Map((dados?.agentes ?? []).map((a) => [a.id, a])), [dados?.agentes]);
  const pessoas = useMemo(() => new Map([
    ["rafael", { id: "rafael", nome: "Rafael", cargo: "Dono", setor: null as string | null }],
    ...(dados?.agentes ?? []).map((a) => [a.id, { id: a.id, nome: a.nome, cargo: a.cargo, setor: a.setor }] as const),
  ]), [dados?.agentes]);

  const enfileirar = useCallback((novos: EventoCentral[], base: Dados) => {
    const mapa = new Map(base.agentes.map((a) => [a.id, a]));
    const viagens = novos
      .map((ev) => viagemDoEvento(ev, base.setores, mapa, base.demandas))
      .filter((v): v is Viagem => v !== null);
    if (viagens.length === 0) return;
    setFilas((f) => {
      const out = { ...f };
      for (const v of viagens) out[v.agente] = [...(out[v.agente] ?? []), v].slice(-4);
      return out;
    });
  }, []);

  // ---- carga inicial ----
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        if (modo === "demo") {
          const agora = demoBase.current;
          const eventos = demoEventos(agora);
          const d: Dados = {
            agentes: DEMO_AGENTES, setores: DEMO_SETORES, eventos, demandas: DEMO_DEMANDAS, contagem: DEMO_CONTAGEM,
            reunioes: demoReunioes(agora),
          };
          if (!vivo) return;
          setDados(d);
          setEstados(estadosDe(eventos, d.agentes));
          ultimoId.current = eventos.reduce((m, e) => Math.max(m, e.id), 0);
        } else {
          const r = await carregar(null);
          if (!vivo) return;
          const d: Dados = {
            agentes: r.agentes ?? [], setores: r.setores ?? [], eventos: r.eventos,
            demandas: r.demandas ?? [], contagem: r.contagem ?? {}, reunioes: r.reunioes ?? [],
          };
          setDados(d);
          setEstados(estadosDe(d.eventos, d.agentes));
          ultimoId.current = d.eventos.reduce((m, e) => Math.max(m, e.id), 0);
        }
        setAtualizado(hora(new Date().toISOString()));
      } catch (e) {
        setErro((e as Error).message);
      }
    })();
    return () => { vivo = false; };
  }, [modo]);

  const dadosRef = useRef<Dados | null>(null);
  useEffect(() => { dadosRef.current = dados; }, [dados]);
  const carregado = dados !== null;
  const temReuniaoAberta = (dados?.reunioes ?? []).some((r) => r.estado === "em_andamento");

  // ---- ao vivo: eventos novos a cada 8 s (3 s com reunião em andamento, para as falas) ----
  useEffect(() => {
    if (!carregado || reproduzindo) return;
    let voltas = 0;
    const t = setInterval(async () => {
      try {
        const d = dadosRef.current;
        if (!d) return;
        let novos: EventoCentral[];
        let extra: Partial<Dados> = {};
        if (modo === "demo") {
          novos = demoEventos(demoBase.current, Date.now()).filter((e) => e.id > (ultimoId.current ?? 0));
        } else {
          // demandas e documentos mudam devagar: a cada ~30 s; eventos e reuniões a cada volta
          const completo = voltas++ % Math.round(30000 / (temReuniaoAberta || assistindo ? ATUALIZAR_REUNIAO_MS : ATUALIZAR_MS)) === 0;
          const r = await carregar(ultimoId.current ?? 0, completo);
          novos = r.eventos;
          extra = { demandas: r.demandas ?? d.demandas, contagem: r.contagem ?? d.contagem, reunioes: r.reunioes ?? d.reunioes };
        }
        // sem nada novo, não troca o estado: trocar re-renderiza o escritório inteiro (era a cada 3 s com reunião aberta)
        const mudou = novos.length > 0 || JSON.stringify(extra.demandas) !== JSON.stringify(d.demandas)
          || JSON.stringify(extra.contagem) !== JSON.stringify(d.contagem) || JSON.stringify(extra.reunioes) !== JSON.stringify(d.reunioes);
        const base = mudou ? { ...d, ...extra, eventos: [...d.eventos, ...novos] } : d;
        if (mudou) setDados(base);
        if (novos.length) {
          enfileirar(novos, base);
          ultimoId.current = novos[novos.length - 1].id;
          setEstados((est) => {
            const out = { ...est };
            for (const ev of novos) if (out[ev.agente]) out[ev.agente] = aplicarEvento(out[ev.agente], ev);
            return conferirTravadas(out);
          });
        }
        setAtualizado(hora(new Date().toISOString()));
        setErro(null);
      } catch (e) {
        setErro((e as Error).message);
      }
    }, temReuniaoAberta || assistindo ? ATUALIZAR_REUNIAO_MS : ATUALIZAR_MS);
    return () => clearInterval(t);
  }, [modo, carregado, reproduzindo, enfileirar, temReuniaoAberta, assistindo]);

  // ---- reprodução do dia: reaplica os eventos das últimas 24 h, um por vez (as falas ficam mais tempo) ----
  const iniciarReproducao = () => {
    if (!dados || dados.eventos.length === 0) return;
    setAssistindo(null);
    setFilas({});
    setEstados(Object.fromEntries(dados.agentes.map((a) => [a.id, estadoVazio()])));
    setReproduzindo({ i: 0, hora: hora(dados.eventos[0].ts) });
  };
  const pararReproducao = useCallback(() => {
    setReproduzindo(null);
    setFilas({});
    if (dados) setEstados(estadosDe(dados.eventos, dados.agentes));
  }, [dados]);

  useEffect(() => {
    if (!reproduzindo || !dados) return;
    if (reproduzindo.i >= dados.eventos.length) {
      const t = setTimeout(pararReproducao, 4000);
      return () => clearTimeout(t);
    }
    const anterior = reproduzindo.i > 0 ? falaDoEvento(dados.eventos[reproduzindo.i - 1]) : null;
    const espera = anterior ? Math.min(5000, tempoLeitura(anterior.texto) * 0.6) : PASSO_REPRODUCAO_MS;
    const t = setTimeout(() => {
      const ev = dados.eventos[reproduzindo.i];
      setEstados((est) => (est[ev.agente] ? { ...est, [ev.agente]: aplicarEvento(est[ev.agente], ev) } : est));
      enfileirar([ev], dados);
      setReproduzindo({ i: reproduzindo.i + 1, hora: hora(ev.ts) });
    }, espera);
    return () => clearTimeout(t);
  }, [reproduzindo, dados, enfileirar, pararReproducao]);

  const fimViagem = useCallback((agente: string, viagemId: string) => {
    setFilas((f) => ({ ...f, [agente]: (f[agente] ?? []).filter((v) => v.id !== viagemId) }));
  }, []);

  // ---- câmeras ----
  const irPara = useCallback((id: string, animar = true) => {
    setSelecionado(null);
    setMosaico(false);
    setCameraAtual(id);
    camera.current?.setLookAt(...vistaDe(id, window.innerWidth, window.innerHeight - ALTURA_TOPO), animar);
  }, []);
  const focar = (id: string) => {
    setSelecionado(id);
    setMosaico(false);
    setCameraAtual("");
    const m = MESAS[id];
    if (!m || !camera.current) return;
    // Tela larga: o painel fica à direita, então o monitor vai para a esquerda do centro.
    // Tela estreita: o painel fica embaixo, então o monitor sobe no quadro.
    const largo = window.innerWidth >= 900;
    const dx = largo ? 1.1 : 0;
    const dy = largo ? 0 : -0.55;
    camera.current.setLookAt(m[0] + dx + 0.1, 2.75, m[1] + 3.7, m[0] + dx, 1.3 + dy, m[1] - 0.3, true);
  };

  // enquadra quando a janela muda de tamanho
  const cameraRef = useRef(cameraAtual);
  cameraRef.current = cameraAtual;
  useEffect(() => {
    const ajustar = () => {
      setTela({ w: window.innerWidth, h: window.innerHeight - ALTURA_TOPO });
      if (!selecionadoRef.current && (cameraRef.current === "geral" || cameraRef.current === "cima")) {
        camera.current?.setLookAt(...vistaDe(cameraRef.current, window.innerWidth, window.innerHeight - ALTURA_TOPO), false);
      }
    };
    window.addEventListener("resize", ajustar);
    return () => window.removeEventListener("resize", ajustar);
  }, []);
  const [inicial] = useState(() => visaoGeralPara(window.innerWidth, window.innerHeight - ALTURA_TOPO));

  // atalhos: 1–9 e 0 trocam de câmera, A arquivo, R recepção, M mosaico, Esc volta à visão geral
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement)?.closest?.("input, textarea, select, [contenteditable]")) return;
      const k = e.key.toUpperCase();
      const cam = CAMERAS.find((c) => c.atalho === k);
      if (cam) { e.preventDefault(); irPara(cam.id); return; }
      if (k === "M") { e.preventDefault(); setMosaico((m) => !m); setSelecionado(null); return; }
      if (e.key === "Escape") { if (mosaicoRef.current) setMosaico(false); else irPara("geral"); }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [irPara]);
  const mosaicoRef = useRef(mosaico);
  mosaicoRef.current = mosaico;

  const abrirProdutividade = (id: string) => {
    setSelecionado(null);
    setAgenteProd(id);
    setProdAberto(true);
  };

  const pendentes = (dados?.demandas ?? []).filter((d) => d.estado === "aguardando-rafael").length;
  const trabalhando = Object.values(estados).filter((e) => e.status === "trabalhando").length;

  // ---- falas ----
  const falasTodas = useMemo(
    () => (dados?.eventos ?? []).map(falaDoEvento).filter((f): f is Fala => f !== null),
    [dados?.eventos],
  );

  // Reuniões em andamento: ao vivo, pelo estado da tabela; na reprodução, pelos eventos "reuniao#<id>" já reproduzidos.
  // Ao assistir uma reunião que já acabou, os participantes voltam à sala de reunião enquanto a conversa toca.
  const reunioesAtivas = useMemo(() => {
    const lista = dados?.reunioes ?? [];
    let ativas: { r: ReuniaoResumo; desde: string | null }[];
    if (!reproduzindo || !dados) {
      ativas = lista.filter((r) => r.estado === "em_andamento").map((r) => ({ r, desde: r.iniciada_em ?? r.agendada_para }));
    } else {
      const vistos = new Map<number, { estado: string; ts: string }>();
      for (const ev of dados.eventos.slice(0, reproduzindo.i)) {
        const m = eventoDeReuniao(ev);
        if (m) vistos.set(m.id, { estado: m.estado, ts: ev.ts });
      }
      ativas = lista
        .filter((r) => vistos.get(r.id)?.estado === "em_andamento")
        .map((r) => ({ r, desde: vistos.get(r.id)!.ts as string | null }));
    }
    if (assistindo && !ativas.some((a) => a.r.id === assistindo)) {
      const r = lista.find((x) => x.id === assistindo);
      if (r) ativas = [{ r, desde: r.iniciada_em }, ...ativas];
    }
    if (assistindo) ativas.sort((a, b) => Number(b.r.id === assistindo) - Number(a.r.id === assistindo));
    return ativas;
  }, [dados, reproduzindo, assistindo]);
  const lugares = useMemo(
    () => lugaresReuniao(reunioesAtivas.map((x) => x.r), (id) => agentesMap.has(id)),
    [reunioesAtivas, agentesMap],
  );
  const emReuniao = Object.keys(lugares).length;

  // Qual reunião o botão "Assistir" toca: a que está em andamento ou, sem nenhuma, a última com falas.
  const reuniaoParaAssistir = useMemo(() => {
    const comFalas = new Set(falasTodas.map((f) => f.reuniaoId));
    const lista = dados?.reunioes ?? [];
    const aberta = lista.find((r) => r.estado === "em_andamento");
    if (aberta) return aberta;
    const ultima = [...falasTodas].reverse().find((f) => lista.some((r) => r.id === f.reuniaoId));
    return ultima ? lista.find((r) => r.id === ultima.reuniaoId) ?? null : lista.find((r) => comFalas.has(r.id)) ?? null;
  }, [dados?.reunioes, falasTodas]);

  const reuniaoAssistida = assistindo ? (dados?.reunioes ?? []).find((r) => r.id === assistindo) ?? null : null;
  const falasAssistidas = useMemo(
    () => (assistindo ? falasTodas.filter((f) => f.reuniaoId === assistindo) : []),
    [assistindo, falasTodas],
  );
  const leitor = useLeitor({
    falas: falasAssistidas,
    ids: reuniaoAssistida ? [reuniaoAssistida.convocada_por, ...reuniaoAssistida.participantes] : [],
  });

  const assistir = (id: number) => {
    setReproduzindo(null);
    setAssistindo(id);
    irPara("reuniao");
    const aoVivo = (dados?.reunioes ?? []).find((r) => r.id === id)?.estado === "em_andamento";
    leitor.setAoVivo(aoVivo);
    leitor.play(0);
  };
  const pararDeAssistir = () => {
    leitor.pause();
    setAssistindo(null);
  };

  // Quem está falando agora (balão sobre a cabeça e legenda na TV).
  const falaAgora = useMemo<Fala | null>(() => {
    if (assistindo) return leitor.falaAtual && !leitor.esperando ? leitor.falaAtual : null;
    if (reproduzindo && dados) {
      const ev = dados.eventos[reproduzindo.i - 1];
      const f = ev ? falaDoEvento(ev) : null;
      return f && reunioesAtivas.some((a) => a.r.id === f.reuniaoId) ? f : null;
    }
    const ativa = reunioesAtivas[0];
    if (!ativa) return null;
    return [...falasTodas].reverse().find((f) => f.reuniaoId === ativa.r.id) ?? null;
  }, [assistindo, leitor.falaAtual, leitor.esperando, reproduzindo, dados, reunioesAtivas, falasTodas]);

  // TV da sala de reunião: o que está acontecendo agora (na reprodução, até o ponto reproduzido).
  const painel = useMemo<PainelTV>(() => {
    const nomes = new Map((dados?.agentes ?? []).map((a) => [a.id, a.nome]));
    const visiveis = (dados?.eventos ?? []).slice(0, reproduzindo ? reproduzindo.i : undefined);
    const ativa = reunioesAtivas[0];
    return {
      trabalhando: Object.entries(estados)
        .filter(([, e]) => e.status === "trabalhando")
        .map(([id, e]) => ({ nome: nomes.get(id) ?? id, texto: e.passo ?? e.rotina ?? "trabalhando" })),
      pendentes,
      abertas: (dados?.demandas ?? []).filter((d) => !["feita", "cancelada"].includes(d.estado)).length,
      documentos: Object.values(dados?.contagem ?? {}).reduce((a, b) => a + b, 0),
      reuniao: ativa
        ? {
          titulo: ativa.r.titulo,
          pauta: itensPauta(ativa.r),
          participantes: [ativa.r.convocada_por, ...ativa.r.participantes]
            .filter((id, i, a) => a.indexOf(id) === i)
            .map((id) => (id === "rafael" ? "Rafael" : nomes.get(id) ?? id)),
          desde: ativa.desde,
          outras: reunioesAtivas.length - 1,
          fala: falaAgora && falaAgora.reuniaoId === ativa.r.id
            ? { nome: falaAgora.agente === "rafael" ? "Rafael" : nomes.get(falaAgora.agente) ?? falaAgora.agente, texto: falaAgora.texto }
            : null,
        }
        : null,
      proxima: (() => {
        const p = proximaAgendada(dados?.reunioes ?? []);
        return p ? { hora: hora(p.agendada_para!), titulo: p.titulo } : null;
      })(),
      relogio: reproduzindo && reproduzindo.i > 0 ? dados?.eventos[reproduzindo.i - 1]?.ts ?? null : null,
      eventos: visiveis
        .filter((e) => e.tipo !== "passo" && !falaDoEvento(e))
        .slice(-6)
        .map((e) => ({
          hora: hora(e.ts),
          nome: nomes.get(e.agente) ?? e.agente,
          tipo: e.tipo,
          texto: e.tipo === "inicio" ? `começou ${e.rotina}` : e.tipo === "fim" ? (e.resumo || `terminou ${e.rotina}`) : e.tipo === "demanda" ? e.rotina : e.resumo || e.rotina,
        })),
    };
  }, [dados, estados, pendentes, reproduzindo, reunioesAtivas, falaAgora]);

  // Qualidade: começa alta em tela grande e baixa sozinha se o aparelho não der conta.
  const [qualidade, setQualidade] = useState<"alta" | "baixa">(() => (window.innerWidth >= 900 ? "alta" : "baixa"));
  // teto de resolução: numa tela Retina grande, 1,75 desenhava ~7 milhões de pixels por quadro com AO e bloom
  const [dpr, setDpr] = useState(() => Math.min(window.devicePixelRatio || 1, window.innerWidth >= 900 ? 1.25 : 1.2));
  const [pronto, setPronto] = useState(false);
  const marcarPronto = useCallback(() => setPronto(true), []);
  const agSel = selecionado ? agentesMap.get(selecionado) : null;
  const estSel = selecionado ? estados[selecionado] : null;
  const largo = tela.w >= 900;
  const visoesMosaico = largo ? MOSAICO : MOSAICO.slice(0, 4);
  const topoMosaico = largo ? 64 : 108;
  const base = modo === "demo" ? "/reunioes/demo" : "/reunioes";

  const botao = "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-line bg-card/95 px-3 text-sm shadow-sm backdrop-blur transition hover:border-accent";

  return (
    <div className="relative h-[calc(100dvh-57px)] w-full overflow-hidden bg-[#dfe5ea]">
      <Canvas shadows="soft" dpr={dpr} frameloop="demand"
        camera={{ position: [inicial[0], inicial[1], inicial[2]], fov: 40, near: 0.1, far: 400 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0, powerPreference: "high-performance" }}
        onPointerMissed={() => setSelecionado(null)}>
        <Ritmo rapido={interagindo} />
        <SombrasEspacadas ativo={!mosaico} />
        <PerformanceMonitor bounds={() => [22, 30]} flipflops={3}
          onIncline={() => setDpr((d) => Math.min(d + 0.25, largo ? 1.25 : 1.2))}
          onDecline={() => { setQualidade("baixa"); setDpr((d) => Math.max(0.75, d - 0.25)); }} />
        <AdaptiveDpr pixelated={false} />
        <PrimeiroQuadro onPronto={marcarPronto} />
        <color attach="background" args={["#dfe6ec"]} />
        <fog attach="fog" args={["#dfe6ec", 95, 230]} />
        <hemisphereLight args={["#f6f8fb", "#b5a892", 0.5]} />
        {/* sol entrando pela frente, com sombras suaves e justas no prédio */}
        <directionalLight position={[-16, 30, 22]} intensity={2.3} color="#fff1dd" castShadow
          shadow-mapSize={qualidade === "alta" ? [2048, 2048] : [1024, 1024]} shadow-bias={-0.0003} shadow-normalBias={0.03}
          shadow-radius={4}
          shadow-camera-left={-34} shadow-camera-right={34} shadow-camera-top={26} shadow-camera-bottom={-26}
          shadow-camera-near={5} shadow-camera-far={90} />
        <directionalLight position={[14, 10, -26]} intensity={0.4} color="#cfe3ff" />
        {/* reflexos: painéis de luz como num teto de escritório e as janelas */}
        <Environment resolution={256} frames={1} environmentIntensity={0.65}>
          <Lightformer form="rect" intensity={2.4} position={[0, 9, 0]} rotation-x={Math.PI / 2} scale={[52, 36, 1]} />
          <Lightformer form="rect" intensity={1.4} color="#dbeaff" position={[0, 3, PREDIO.z0 - 6]} scale={[52, 5, 1]} />
          <Lightformer form="rect" intensity={0.9} color="#fff1dc" position={[0, 3, PREDIO.z1 + 8]} rotation-y={Math.PI} scale={[52, 5, 1]} />
          <Lightformer form="rect" intensity={0.6} color="#e9f1ff" position={[PREDIO.x1 + 6, 3, 0]} rotation-y={-Math.PI / 2} scale={[36, 5, 1]} />
        </Environment>
        <CameraControls ref={camera} minDistance={1.5} maxDistance={110} maxPolarAngle={Math.PI / 2.05} smoothTime={0.55}
          onStart={() => { setInteragindo(true); setCameraAtual((c) => (c === "geral" || c === "cima" ? c : "")); }}
          onRest={() => setInteragindo(false)} />
        <Predio />
        <Mobilia />
        <DetalhesSalas />
        <Copa />
        <Recepcao />
        {dados && (
          <>
            {dados.agentes.filter((a) => MESAS[a.id]).map((a) => (
              <MesaAgente key={`mesa-${a.id}`} posicao={MESAS[a.id]} nome={a.nome}
                estado={estados[a.id] ?? estadoVazio()} selecionado={selecionado === a.id} onClick={() => focar(a.id)} />
            ))}
            {dados.agentes.map((a) => (
              <Boneco key={a.id} id={a.id} nome={a.nome} cor={GRUPO_COR[a.grupo] ?? "#888780"}
                cadeira={casa(a.id)} temMesa={!!MESAS[a.id]} estado={estados[a.id] ?? estadoVazio()}
                viagem={filas[a.id]?.[0] ?? null} reuniao={lugares[a.id] ?? null} selecionado={selecionado === a.id}
                falando={falaAgora?.agente === a.id ? falaAgora.texto : null} rotulos={!mosaico}
                onClick={() => focar(a.id)} onViagemFim={(vid) => fimViagem(a.id, vid)} />
            ))}
            <Arquivo setores={dados.setores} contagem={dados.contagem} rotulos={!mosaico}
              onAbrir={(s) => modo === "real" && router.push(`/arquivo/${s}`)} />
            <SalaRafael pendentes={pendentes} onClick={() => modo === "real" && router.push("/")} />
            <Rafael pendentes={pendentes} onClick={() => modo === "real" && router.push("/")} rotulos={!mosaico} />
            <SalaReuniao painel={painel} />
          </>
        )}
        {mosaico ? <Mosaico visoes={visoesMosaico} topo={topoMosaico} porQuadro={largo ? 2 : 1} /> : qualidade === "alta" && <Efeitos />}
      </Canvas>

      {mosaico && (
        <RotulosMosaico visoes={visoesMosaico} largura={tela.w} altura={tela.h} topo={topoMosaico}
          onEscolher={(id) => irPara(id)} />
      )}

      {/* topo: estado, ações e câmeras */}
      <div className="pointer-events-none absolute inset-x-2 top-2 flex flex-col gap-2 sm:inset-x-3 sm:top-3">
        <div className="flex flex-wrap items-start gap-2">
          <div className="pointer-events-auto rounded-xl border border-line bg-card/95 px-3.5 py-2 shadow-sm backdrop-blur">
            <div className="flex items-center gap-2 text-sm font-semibold">
              {reproduzindo ? (
                <><Play size={14} className="text-warn" /> Reproduzindo o dia · {reproduzindo.hora}</>
              ) : (
                <><span className="relative flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-ok opacity-60" /><span className="relative inline-flex size-2.5 rounded-full bg-ok" /></span>
                  {modo === "demo" ? "Demonstração" : "Ao vivo"} {atualizado && <span className="font-normal text-muted">· {atualizado}</span>}</>
              )}
            </div>
            <div className="mt-0.5 text-xs text-muted">
              {trabalhando} trabalhando{emReuniao > 0 ? ` · ${emReuniao} em reunião` : ""} · {pendentes} aguardando você
              {erro && <span className="ml-1 text-bad">· sem conexão ({erro.slice(0, 60)})</span>}
            </div>
          </div>
          <div className="pointer-events-auto flex flex-wrap gap-2">
            {reuniaoParaAssistir && !assistindo && (
              <button type="button" onClick={() => assistir(reuniaoParaAssistir.id)}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-accent px-3.5 text-sm font-semibold text-white shadow-sm hover:brightness-110">
                <Headphones size={16} /> {reuniaoParaAssistir.estado === "em_andamento" ? "Assistir reunião ao vivo" : "Assistir reunião"}
              </button>
            )}
            {reproduzindo ? (
              <button type="button" onClick={pararReproducao} className={botao}><Pause size={15} /> Voltar ao vivo</button>
            ) : (
              <button type="button" onClick={iniciarReproducao} className={botao}><Radio size={15} /> <span className="hidden sm:inline">Reproduzir as últimas</span> 24 h</button>
            )}
            <button type="button" onClick={() => { setMosaico((m) => !m); setSelecionado(null); }} aria-pressed={mosaico}
              className={`${botao} ${mosaico ? "border-text bg-text text-card" : ""}`}>
              <Cctv size={16} /> Mosaico <kbd className="hidden rounded border border-current/30 px-1 text-[10px] opacity-60 sm:inline">M</kbd>
            </button>
          </div>
        </div>
        {/* câmeras */}
        <nav aria-label="Câmeras" className="pointer-events-auto -mx-2 flex gap-1.5 overflow-x-auto px-2 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none]">
          {CAMERAS.map((c) => {
            const Icone = ICONE_CAMERA[c.id] ?? Building2;
            const ativo = cameraAtual === c.id && !mosaico;
            return (
              <button key={c.id} type="button" onClick={() => irPara(c.id)} aria-pressed={ativo}
                title={c.atalho ? `${c.nome} (tecla ${c.atalho})` : c.nome}
                className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[13px] shadow-sm backdrop-blur transition ${
                  ativo ? "border-accent bg-accent text-white" : "border-line bg-card/90 hover:border-accent"}`}>
                <Icone size={14} /> {c.nome}
                {c.atalho && <kbd className={`hidden rounded px-1 text-[10px] lg:inline ${ativo ? "bg-white/20" : "bg-bg text-muted"}`}>{c.atalho}</kbd>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* equipe: um toque foca o agente e abre o terminal */}
      {dados && !mosaico && !assistindo && (
        <div className="absolute bottom-2 left-2 right-2 flex flex-col gap-1.5 sm:bottom-3 sm:left-3 sm:right-auto sm:max-w-[calc(100vw-480px)]">
          <div className="flex gap-1 overflow-x-auto rounded-2xl border border-line bg-card/95 p-1.5 shadow-sm backdrop-blur [scrollbar-width:none]">
            {dados.agentes.filter((a) => MESAS[a.id]).map((a) => {
              const e = estados[a.id];
              const cor = e?.status === "trabalhando" ? "bg-accent" : e?.status === "erro" ? "bg-bad" : "bg-ok";
              return (
                <button key={a.id} type="button" onClick={() => focar(a.id)} title={`${a.nome} · ${a.cargo}`}
                  className={`relative flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-1.5 py-1 text-[11px] font-medium transition ${
                    selecionado === a.id ? "bg-accent-soft text-accent" : "hover:bg-bg"}`}>
                  <span className="relative">
                    <Avatar id={a.id} nome={a.nome} setor={a.setor} tamanho={34} selo={false} falando={falaAgora?.agente === a.id} />
                    <span className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-card ${cor} ${e?.status === "trabalhando" ? "animate-pulse" : ""}`} />
                  </span>
                  {a.nome}
                </button>
              );
            })}
          </div>
          <div className="hidden px-1 text-[11px] text-muted sm:block">
            Toque num agente para ver o terminal · teclas 1–9 e 0 trocam de câmera, M abre o mosaico · arraste para girar, role para aproximar
          </div>
        </div>
      )}

      {/* assistindo uma reunião: legenda grande e controles */}
      {assistindo && reuniaoAssistida && (
        <div className="absolute inset-x-2 bottom-2 z-10 mx-auto max-w-3xl rounded-2xl border border-white/10 bg-[#0b1220]/90 p-3.5 text-white shadow-2xl backdrop-blur sm:bottom-4 sm:p-4">
          <div className="mb-2 flex items-center gap-2 text-xs text-white/70">
            <Headphones size={14} />
            <span className="min-w-0 flex-1 truncate">
              <span className="font-semibold text-white">{reuniaoAssistida.titulo}</span> · {falasAssistidas.length} falas
              {leitor.modo === "legenda" ? " · só legenda" : ""}
            </span>
            {reuniaoAssistida.estado === "em_andamento" && (
              <Link href={`${base}/${reuniaoAssistida.id}/sala`} className="inline-flex h-8 items-center gap-1 rounded-full bg-emerald-500 px-3 font-semibold text-white">
                <LogIn size={14} /> Entrar
              </Link>
            )}
            <button type="button" onClick={pararDeAssistir} className="inline-flex size-8 items-center justify-center rounded-full hover:bg-white/10" aria-label="Parar de assistir">
              <X size={17} />
            </button>
          </div>
          <div className="min-h-[60px]"><Legenda leitor={leitor} pessoas={pessoas} escura compacta={!largo} /></div>
          <div className="mt-2 border-t border-white/10 pt-2">
            <Controles leitor={leitor} total={falasAssistidas.length} escura aoVivoDisponivel={reuniaoAssistida.estado === "em_andamento"} />
          </div>
          {leitor.aviso && <p className="mt-1 text-[11px] text-amber-200">{leitor.aviso}</p>}
        </div>
      )}

      {/* produtividade do dia, no canto superior direito (some quando o painel do agente abre) */}
      {dados && pronto && !mosaico && !assistindo && !agSel && (
        <PainelProdutividade {...produtividade} dia={diaProd} onDia={setDiaProd} agentes={agentesMap}
          agente={agenteProd} onAgente={setAgenteProd} real={modo === "real"} aberto={prodAberto} onAberto={setProdAberto}
          onVerNoEscritorio={(id) => { setAgenteProd(null); focar(id); }} />
      )}

      {/* painel do agente */}
      {agSel && estSel && !mosaico && (
        <aside className="absolute inset-x-2 bottom-2 z-10 flex h-[46%] flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-lg min-[900px]:inset-x-auto min-[900px]:bottom-3 min-[900px]:right-3 min-[900px]:top-28 min-[900px]:h-auto min-[900px]:w-[440px]">
          <div className="flex items-start gap-3 border-b border-line px-4 py-3">
            <Avatar id={agSel.id} nome={agSel.nome} setor={agSel.setor} tamanho={48} />
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{agSel.nome}</div>
              <div className="text-xs text-muted">{agSel.cargo} · {agSel.grupo}</div>
              {lugares[agSel.id] && (
                <div className="mt-1 text-xs font-medium text-warn">Em reunião: {lugares[agSel.id].titulo}</div>
              )}
              <ResumoProdutividade dia={diaProd} p={produtividade.prod?.agentes.find((x) => x.agente === agSel.id) ?? null}
                onAbrir={() => abrirProdutividade(agSel.id)} />
              <div className="mt-1 text-xs">
                {estSel.status === "trabalhando"
                  ? <span className="text-accent">Trabalhando em {estSel.rotina}{estSel.desde ? ` desde ${hora(estSel.desde)}` : ""}</span>
                  : estSel.status === "erro" ? <span className="text-bad">Atenção: {estSel.passo ?? "última rotina com erro"}</span>
                  : <span className="text-ok">Disponível</span>}
              </div>
            </div>
            <button type="button" onClick={() => irPara("geral")} className="inline-flex size-9 items-center justify-center rounded-lg text-muted hover:bg-bg" aria-label="Fechar"><X size={18} /></button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto bg-[#0d1117] px-3 py-2 font-mono text-[12.5px] leading-5">
            {estSel.linhas.length === 0 && <div className="text-[#8b949e]">aguardando a próxima rotina…</div>}
            {estSel.linhas.map((l, i) => (
              <div key={i} className="flex gap-2">
                <span className="shrink-0 text-[#6e7681]">{l.hora}</span>
                <span className={{
                  cmd: "text-[#58a6ff]", passo: "text-[#e3b341]", ok: "text-[#3fb950]", erro: "text-[#f85149]",
                  demanda: "text-[#d2a8ff]", nota: "text-[#8b949e]",
                }[l.tipo]}>{l.texto}</span>
              </div>
            ))}
          </div>
          <div className="max-h-44 overflow-y-auto border-t border-line px-4 py-2.5 text-sm">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Demandas</div>
            {(dados?.demandas ?? []).filter((d) => (d.para === agSel.id || d.de === agSel.id) && !["feita", "cancelada"].includes(d.estado)).length === 0 && (
              <div className="text-xs text-muted">Nenhuma demanda aberta com {agSel.nome}.</div>
            )}
            {(dados?.demandas ?? [])
              .filter((d) => (d.para === agSel.id || d.de === agSel.id) && !["feita", "cancelada"].includes(d.estado))
              .map((d) => (
                <div key={d.id} className="py-0.5 text-xs">
                  <span className="font-medium">#{d.id}</span> {d.titulo}{" "}
                  <span className="text-muted">
                    · {d.para === agSel.id ? `recebida de ${agentesMap.get(d.de)?.nome ?? d.de}` : `enviada para ${d.para === "rafael" ? "você" : agentesMap.get(d.para)?.nome ?? d.para}`}
                  </span>
                </div>
              ))}
          </div>
        </aside>
      )}

      {(!dados || !pronto) && !erro && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#dfe5ea] text-sm text-muted">
          <Building2 size={28} className="animate-pulse" />
          Montando o escritório…
        </div>
      )}
    </div>
  );
}
