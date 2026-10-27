"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Canvas } from "@react-three/fiber";
import { CameraControls, ContactShadows } from "@react-three/drei";
import { Eye, Pause, Play, Radio, X } from "lucide-react";
import {
  GRUPO_COR, MESAS, aplicarEvento, cadeira, conferirTravadas, estadoVazio, hora, viagemDoEvento,
  type AgenteInfo, type DemandaResumo, type EstadoAgente, type EventoCentral, type SetorInfo, type Viagem,
} from "@/lib/escritorio/modelo";
import { DEMO_AGENTES, DEMO_CONTAGEM, DEMO_DEMANDAS, DEMO_SETORES, demoEventos } from "@/lib/escritorio/demo";
import { supabaseNavegador } from "@/lib/supabase/browser";
import { Arquivo, MesaAgente, MesaRafael, Sala } from "./Cena";
import { Boneco } from "./Boneco";

const ATUALIZAR_MS = 8000;
const PASSO_REPRODUCAO_MS = 1100;
// Enquadramento geral: em telas estreitas (celular) a câmera sobe e se afasta para caber o escritório inteiro.
function visaoGeralPara(largura: number, altura: number): [number, number, number, number, number, number] {
  const aspecto = largura / Math.max(altura, 1);
  const k = aspecto >= 1.5 ? 1 : Math.min(2.4, 1.5 / Math.max(aspecto, 0.45));
  return [0.5, 17 * k, 20 * k * 0.92, 0.5, 0, 1];
}

type Dados = {
  agentes: AgenteInfo[];
  setores: SetorInfo[];
  eventos: EventoCentral[];
  demandas: DemandaResumo[];
  contagem: Record<string, number>;
};

function estadosDe(eventos: EventoCentral[], agentes: AgenteInfo[]) {
  const est: Record<string, EstadoAgente> = Object.fromEntries(agentes.map((a) => [a.id, estadoVazio()]));
  for (const ev of eventos) if (est[ev.agente]) est[ev.agente] = aplicarEvento(est[ev.agente], ev);
  return conferirTravadas(est);
}

async function carregar(desdeId: number | null): Promise<Partial<Dados> & { eventos: EventoCentral[] }> {
  const sb = supabaseNavegador();
  const desde = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const evQuery = desdeId === null
    ? sb.from("central_eventos").select("*").gte("ts", desde).order("id").limit(1000)
    : sb.from("central_eventos").select("*").gt("id", desdeId).order("id").limit(500);
  const [ev, dem, docs, ag, st] = await Promise.all([
    evQuery,
    sb.from("central_demandas").select("id, de, para, estado, titulo, prioridade"),
    sb.from("central_documentos").select("setor"),
    desdeId === null ? sb.from("central_agentes").select("*") : Promise.resolve({ data: null }),
    desdeId === null ? sb.from("central_setores").select("id, nome").order("ordem") : Promise.resolve({ data: null }),
  ]);
  const contagem: Record<string, number> = {};
  for (const d of (docs.data ?? []) as { setor: string }[]) contagem[d.setor] = (contagem[d.setor] ?? 0) + 1;
  return {
    eventos: (ev.data ?? []) as EventoCentral[],
    demandas: (dem.data ?? []) as DemandaResumo[],
    contagem,
    ...(ag.data ? { agentes: ag.data as AgenteInfo[] } : {}),
    ...(st.data ? { setores: st.data as SetorInfo[] } : {}),
  };
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
  const ultimoId = useRef<number | null>(null);
  const camera = useRef<CameraControls>(null);

  const agentesMap = useMemo(() => new Map((dados?.agentes ?? []).map((a) => [a.id, a])), [dados?.agentes]);

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
          const eventos = demoEventos();
          const d: Dados = { agentes: DEMO_AGENTES, setores: DEMO_SETORES, eventos, demandas: DEMO_DEMANDAS, contagem: DEMO_CONTAGEM };
          if (!vivo) return;
          setDados(d);
          setEstados(estadosDe(eventos, d.agentes));
          ultimoId.current = eventos.length;
        } else {
          const r = await carregar(null);
          if (!vivo) return;
          const d: Dados = {
            agentes: r.agentes ?? [], setores: r.setores ?? [], eventos: r.eventos,
            demandas: r.demandas ?? [], contagem: r.contagem ?? {},
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

  // ---- ao vivo: busca eventos novos a cada 8 s ----
  useEffect(() => {
    if (modo !== "real" || !carregado || reproduzindo) return;
    const t = setInterval(async () => {
      try {
        const r = await carregar(ultimoId.current ?? 0);
        const d = dadosRef.current;
        if (!d) return;
        const base = { ...d, demandas: r.demandas ?? d.demandas, contagem: r.contagem ?? d.contagem, eventos: [...d.eventos, ...r.eventos] };
        setDados(base);
        if (r.eventos.length) enfileirar(r.eventos, base);
        if (r.eventos.length) {
          ultimoId.current = r.eventos[r.eventos.length - 1].id;
          setEstados((est) => {
            const out = { ...est };
            for (const ev of r.eventos) if (out[ev.agente]) out[ev.agente] = aplicarEvento(out[ev.agente], ev);
            return conferirTravadas(out);
          });
        }
        setAtualizado(hora(new Date().toISOString()));
        setErro(null);
      } catch (e) {
        setErro((e as Error).message);
      }
    }, ATUALIZAR_MS);
    return () => clearInterval(t);
  }, [modo, carregado, reproduzindo, enfileirar]);

  // ---- reprodução do dia: reaplica os eventos das últimas 24 h, um por vez ----
  const iniciarReproducao = () => {
    if (!dados || dados.eventos.length === 0) return;
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
    const t = setTimeout(() => {
      const ev = dados.eventos[reproduzindo.i];
      setEstados((est) => (est[ev.agente] ? { ...est, [ev.agente]: aplicarEvento(est[ev.agente], ev) } : est));
      enfileirar([ev], dados);
      setReproduzindo({ i: reproduzindo.i + 1, hora: hora(ev.ts) });
    }, PASSO_REPRODUCAO_MS);
    return () => clearTimeout(t);
  }, [reproduzindo, dados, enfileirar, pararReproducao]);

  // A demonstração reproduz sozinha ao abrir, para mostrar os bonecos andando.
  useEffect(() => {
    if (modo === "demo" && dados && !reproduzindo) {
      const t = setTimeout(iniciarReproducao, 1500);
      return () => clearTimeout(t);
    }
  }, [modo, dados]); // eslint-disable-line react-hooks/exhaustive-deps

  const fimViagem = useCallback((agente: string, viagemId: string) => {
    setFilas((f) => ({ ...f, [agente]: (f[agente] ?? []).filter((v) => v.id !== viagemId) }));
  }, []);

  // ---- câmera ----
  const focar = (id: string) => {
    setSelecionado(id);
    const m = MESAS[id];
    if (!m || !camera.current) return;
    // Tela larga: o painel fica à direita, então o monitor vai para a esquerda do centro.
    // Tela estreita: o painel fica embaixo, então o monitor sobe no quadro.
    const largo = window.innerWidth >= 900;
    const dx = largo ? 1.1 : 0;
    const dy = largo ? 0 : -0.55;
    camera.current.setLookAt(m[0] + dx + 0.1, 2.9, m[1] + 3.9, m[0] + dx, 1.35 + dy, m[1] - 0.3, true);
  };
  const visaoGeral = (animar = true) => {
    setSelecionado(null);
    camera.current?.setLookAt(...visaoGeralPara(window.innerWidth, window.innerHeight - 57), animar);
  };

  // enquadra quando a janela muda de tamanho (a posição inicial já sai certa em `inicial`)
  useEffect(() => {
    const ajustar = () => { if (!selecionadoRef.current) visaoGeral(false); };
    window.addEventListener("resize", ajustar);
    return () => window.removeEventListener("resize", ajustar);
  }, []);  
  const [inicial] = useState(() => visaoGeralPara(window.innerWidth, window.innerHeight - 57));

  const pendentes = (dados?.demandas ?? []).filter((d) => d.estado === "aguardando-rafael").length;
  const trabalhando = Object.values(estados).filter((e) => e.status === "trabalhando").length;
  const agSel = selecionado ? agentesMap.get(selecionado) : null;
  const estSel = selecionado ? estados[selecionado] : null;

  return (
    <div className="relative h-[calc(100vh-57px)] w-full overflow-hidden bg-[#dfe3e8]">
      <Canvas shadows dpr={[1, 2]} camera={{ position: [inicial[0], inicial[1], inicial[2]], fov: 42 }}
        onPointerMissed={() => setSelecionado(null)}>
        <color attach="background" args={["#dfe3e8"]} />
        <hemisphereLight args={["#ffffff", "#b9aa98", 0.85]} />
        <directionalLight position={[8, 16, 10]} intensity={1.6} castShadow
          shadow-mapSize={[2048, 2048]} shadow-camera-left={-18} shadow-camera-right={18}
          shadow-camera-top={14} shadow-camera-bottom={-14} />
        <CameraControls ref={camera} minDistance={3} maxDistance={60} maxPolarAngle={Math.PI / 2.15} />
        <Sala />
        <ContactShadows position={[0.5, 0.01, 1]} scale={32} blur={2.2} opacity={0.25} far={6} />
        {dados && (
          <>
            {dados.agentes.filter((a) => MESAS[a.id]).map((a) => (
              <MesaAgente key={`mesa-${a.id}`} posicao={MESAS[a.id]} nome={a.nome}
                estado={estados[a.id] ?? estadoVazio()} cor={GRUPO_COR[a.grupo] ?? "#888780"}
                selecionado={selecionado === a.id} onClick={() => focar(a.id)} />
            ))}
            {dados.agentes.filter((a) => MESAS[a.id]).map((a) => (
              <Boneco key={a.id} id={a.id} nome={a.nome} cor={GRUPO_COR[a.grupo] ?? "#888780"}
                cadeira={cadeira(a.id)} estado={estados[a.id] ?? estadoVazio()}
                viagem={filas[a.id]?.[0] ?? null} selecionado={selecionado === a.id}
                onClick={() => focar(a.id)} onViagemFim={(vid) => fimViagem(a.id, vid)} />
            ))}
            <Arquivo setores={dados.setores} contagem={dados.contagem}
              onAbrir={(s) => modo === "real" && router.push(`/arquivo/${s}`)} />
            <MesaRafael pendentes={pendentes} onClick={() => modo === "real" && router.push("/")} />
          </>
        )}
      </Canvas>

      {/* painel de cima */}
      <div className="pointer-events-none absolute left-3 top-3 right-3 flex flex-wrap items-start gap-2">
        <div className="pointer-events-auto rounded-xl border border-line bg-card/95 px-4 py-2.5 shadow-sm backdrop-blur">
          <div className="flex items-center gap-2 text-sm font-semibold">
            {reproduzindo ? (
              <><Play size={14} className="text-warn" /> Reproduzindo o dia · {reproduzindo.hora}</>
            ) : (
              <><span className="relative flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-ok opacity-60" /><span className="relative inline-flex size-2.5 rounded-full bg-ok" /></span>
                {modo === "demo" ? "Demonstração" : "Ao vivo"} {atualizado && <span className="font-normal text-muted">· {atualizado}</span>}</>
            )}
          </div>
          <div className="mt-0.5 text-xs text-muted">
            {trabalhando} trabalhando agora · {pendentes} aguardando você
            {erro && <span className="ml-1 text-bad">· sem conexão ({erro.slice(0, 60)})</span>}
          </div>
        </div>
        <div className="pointer-events-auto flex gap-2">
          {reproduzindo ? (
            <button onClick={pararReproducao} className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-card/95 px-3 py-2 text-sm shadow-sm">
              <Pause size={15} /> Voltar ao vivo
            </button>
          ) : (
            <button onClick={iniciarReproducao} className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-card/95 px-3 py-2 text-sm shadow-sm">
              <Radio size={15} /> Reproduzir as últimas 24 h
            </button>
          )}
          <button onClick={() => visaoGeral()} className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-card/95 px-3 py-2 text-sm shadow-sm">
            <Eye size={15} /> Visão geral
          </button>
        </div>
      </div>

      {/* equipe: um toque foca o agente e abre o terminal */}
      {dados && (
        <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-1.5 sm:right-auto sm:max-w-[calc(100vw-480px)]">
          <div className="flex gap-1.5 overflow-x-auto rounded-xl border border-line bg-card/95 p-1.5 shadow-sm">
            {dados.agentes.filter((a) => MESAS[a.id]).map((a) => {
              const e = estados[a.id];
              const cor = e?.status === "trabalhando" ? "bg-accent" : e?.status === "erro" ? "bg-bad" : "bg-ok";
              return (
                <button key={a.id} onClick={() => focar(a.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                    selecionado === a.id ? "bg-accent-soft text-accent" : "hover:bg-bg"}`}>
                  <span className={`size-2 rounded-full ${cor} ${e?.status === "trabalhando" ? "animate-pulse" : ""}`} />
                  {a.nome}
                </button>
              );
            })}
          </div>
          <div className="hidden px-1 text-[11px] text-muted sm:block">
            Toque num agente para ver o terminal · estante abre o arquivo · sua mesa abre a Mesa · arraste para girar, role para aproximar
          </div>
        </div>
      )}

      {/* painel do agente */}
      {agSel && estSel && (
        <aside className="absolute inset-x-2 bottom-2 z-10 flex h-[46%] flex-col overflow-hidden rounded-xl border border-line bg-card shadow-lg min-[900px]:inset-x-auto min-[900px]:bottom-3 min-[900px]:right-3 min-[900px]:top-20 min-[900px]:h-auto min-[900px]:w-[440px]">
          <div className="flex items-start gap-3 border-b border-line px-4 py-3">
            <span className="mt-1 size-3 rounded-full" style={{ background: GRUPO_COR[agSel.grupo] }} />
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{agSel.nome}</div>
              <div className="text-xs text-muted">{agSel.cargo} · {agSel.grupo}</div>
              <div className="mt-1 text-xs">
                {estSel.status === "trabalhando"
                  ? <span className="text-accent">Trabalhando em {estSel.rotina}{estSel.desde ? ` desde ${hora(estSel.desde)}` : ""}</span>
                  : estSel.status === "erro" ? <span className="text-bad">Atenção: {estSel.passo ?? "última rotina com erro"}</span>
                  : <span className="text-ok">Disponível</span>}
              </div>
            </div>
            <button onClick={() => visaoGeral()} className="rounded-lg p-1 text-muted hover:bg-bg" aria-label="Fechar"><X size={18} /></button>
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

      {!dados && !erro && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted">Montando o escritório…</div>
      )}
    </div>
  );
}
