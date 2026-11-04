"use client";

// Planta baixa ao vivo: as salas, as mesas e cada agente com o status, no mesmo modelo do escritório 3D.
// Quem está em viagem anda pelas mesmas rotas; quem está em reunião aparece na cadeira da sala de reunião.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CORREDORES, ESPINHA, MESAS, MESA_RAFAEL, MESA_REUNIAO, PAREDE_RESULTADOS, PREDIO, RACKS, SALAS, TV, cadeira,
  type AgenteInfo, type EstadoAgente, type LugarReuniao, type Vec2, type Viagem,
} from "@/lib/escritorio/modelo";
import { COR_STATUS, situacaoDe } from "./status";

const VELOCIDADE = 2.0;
const MARGEM = 1.4;
const ESCALA_TEXTO = 0.02; // o navegador deforma letras com fonte muito pequena: desenha grande e reduz

// Texto em metros da planta, sem a deformação de fonte minúscula.
function Texto({ x = 0, y = 0, tam, cor, peso = 600, meio = false, contorno, children }: {
  x?: number; y?: number; tam: number; cor: string; peso?: number; meio?: boolean; contorno?: boolean; children: React.ReactNode;
}) {
  return (
    <text transform={`translate(${x} ${y}) scale(${ESCALA_TEXTO})`} fontSize={tam / ESCALA_TEXTO} fontWeight={peso} fill={cor}
      textAnchor={meio ? "middle" : "start"} letterSpacing={0}
      {...(contorno ? { paintOrder: "stroke" as const, stroke: "#0b111c", strokeWidth: tam / ESCALA_TEXTO / 4 } : {})}>
      {children}
    </text>
  );
}

function medir(c: Vec2[]) {
  const a = [0];
  for (let i = 1; i < c.length; i++) a.push(a[i - 1] + Math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1]));
  return a;
}
function ponto(c: Vec2[], a: number[], d: number): Vec2 {
  const dd = Math.max(0, Math.min(a[a.length - 1], d));
  let i = 1;
  while (i < a.length - 1 && a[i] < dd) i++;
  const s = a[i] - a[i - 1] || 1;
  const t = (dd - a[i - 1]) / s;
  return [c[i - 1][0] + (c[i][0] - c[i - 1][0]) * t, c[i - 1][1] + (c[i][1] - c[i - 1][1]) * t];
}

// Posição de quem está em viagem: vai, espera e volta. Avisa quando a viagem termina.
function useViagens(filas: Record<string, Viagem[]>, onFim: (agente: string, id: string) => void) {
  const [pos, setPos] = useState<Record<string, Vec2>>({});
  const inicio = useRef(new Map<string, number>());
  const filasRef = useRef(filas);
  filasRef.current = filas;
  const fim = useRef(onFim);
  fim.current = onFim;
  useEffect(() => {
    let quadro = 0;
    let ultimo = 0;
    const passo = (agora: number) => {
      quadro = requestAnimationFrame(passo);
      if (agora - ultimo < 50) return;
      ultimo = agora;
      const novo: Record<string, Vec2> = {};
      for (const [agente, lista] of Object.entries(filasRef.current)) {
        const v = lista[0];
        if (!v || v.caminho.length < 2) continue;
        if (!inicio.current.has(v.id)) inicio.current.set(v.id, agora);
        const a = medir(v.caminho);
        const total = a[a.length - 1];
        const espera = (v.espera ?? 1.6) * 1000;
        const ida = (total / VELOCIDADE) * 1000;
        const t = agora - inicio.current.get(v.id)!;
        if (t >= ida + espera + ida) {
          fim.current(agente, v.id);
          continue;
        }
        const d = t < ida ? (t / 1000) * VELOCIDADE : t < ida + espera ? total : total - ((t - ida - espera) / 1000) * VELOCIDADE;
        novo[agente] = ponto(v.caminho, a, d);
      }
      setPos((p) => (Object.keys(p).length === 0 && Object.keys(novo).length === 0 ? p : novo));
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, []);
  return pos;
}

export function Planta2D({
  agentes, estados, filas, lugares, selecionado, pendentes, demandasPorAgente, onSelecionar, onViagemFim,
}: {
  agentes: AgenteInfo[];
  estados: Record<string, EstadoAgente>;
  filas: Record<string, Viagem[]>;
  lugares: Record<string, LugarReuniao>;
  selecionado: string | null;
  pendentes: number;
  demandasPorAgente: Record<string, number>;
  onSelecionar: (id: string) => void;
  onViagemFim: (agente: string, viagem: string) => void;
}) {
  const andando = useViagens(filas, onViagemFim);
  const salaDeTrabalho = useMemo(() => {
    const cont: Record<string, number> = {};
    for (const a of agentes) if (a.setor && estados[a.id]?.status === "trabalhando") cont[a.setor] = (cont[a.setor] ?? 0) + 1;
    return cont;
  }, [agentes, estados]);
  const w = PREDIO.x1 - PREDIO.x0 + MARGEM * 2;
  const d = PREDIO.z1 - PREDIO.z0 + MARGEM * 2;
  const comMesa = agentes.filter((a) => MESAS[a.id] || lugares[a.id] || andando[a.id]);

  return (
    <div className="absolute inset-0 overflow-auto bg-[#060a12] pb-3 pt-[104px] lg:pt-[120px]">
      <svg viewBox={`${PREDIO.x0 - MARGEM} ${PREDIO.z0 - MARGEM} ${w} ${d}`} role="img" aria-label="Planta baixa do escritório com o status de cada agente"
        className="mx-auto block h-full w-full min-w-[900px]" style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
        <defs>
          <pattern id="grade-planta" width="1" height="1" patternUnits="userSpaceOnUse">
            <path d="M1 0H0V1" fill="none" stroke="#3dd6f5" strokeOpacity="0.07" strokeWidth="0.02" />
          </pattern>
        </defs>
        <rect x={PREDIO.x0} y={PREDIO.z0} width={PREDIO.x1 - PREDIO.x0} height={PREDIO.z1 - PREDIO.z0} fill="#0b111c" />
        <rect x={PREDIO.x0} y={PREDIO.z0} width={PREDIO.x1 - PREDIO.x0} height={PREDIO.z1 - PREDIO.z0} fill="url(#grade-planta)" />

        {Object.values(CORREDORES).map((c) => (
          <g key={c.z0}>
            <rect x={PREDIO.x0} y={c.z0} width={PREDIO.x1 - PREDIO.x0} height={c.z1 - c.z0} fill="#0d1522" />
            <line x1={PREDIO.x0 + 0.5} x2={PREDIO.x1 - 0.5} y1={c.faixa} y2={c.faixa} stroke="#3dd6f5" strokeOpacity="0.4" strokeWidth="0.05" strokeDasharray="0.5 0.4" />
          </g>
        ))}
        <rect x={ESPINHA.x0} y={ESPINHA.z0} width={ESPINHA.x1 - ESPINHA.x0} height={ESPINHA.z1 - ESPINHA.z0} fill="#0d1522" />

        {SALAS.map((s) => {
          const ativos = salaDeTrabalho[s.id] ?? 0;
          const alturaRotulo = s.z0 + 1.05;
          return (
            <g key={s.id}>
              <rect x={s.x0} y={s.z0} width={s.x1 - s.x0} height={s.z1 - s.z0} fill={s.cor} fillOpacity={ativos > 0 ? 0.16 : 0.07}
                stroke={s.cor} strokeOpacity="0.75" strokeWidth="0.09" />
              <Texto x={s.x0 + 0.5} y={alturaRotulo} tam={0.9} cor="#e2e8f0" contorno>{s.nome}</Texto>
              {ativos > 0 && <Texto x={s.x0 + 0.5} y={s.z1 - 0.5} tam={0.62} cor="#3dd6f5" peso={600}>{ativos} trabalhando</Texto>}
              <rect x={s.porta - 0.5} y={(s.corredor === "c1" ? (s.fileira === "fundo" ? s.z1 : s.z0) : (s.fileira === "frente" ? s.z0 : s.z1)) - 0.08} width="1" height="0.16" fill="#3dd6f5" />
            </g>
          );
        })}

        {/* mesas */}
        {Object.values(MESAS).map(([x, z]) => (
          <g key={`${x}|${z}`}>
            <rect x={x - 0.9} y={z - 0.4} width="1.8" height="0.8" rx="0.06" fill="#1e293b" stroke="#475569" strokeWidth="0.03" />
            <rect x={x - 0.5} y={z - 0.28} width="1" height="0.06" fill="#38bdf8" />
          </g>
        ))}
        {/* sala de reunião, com a TV e as telas de resultados */}
        <rect x={MESA_REUNIAO[0] - 3.2} y={MESA_REUNIAO[1] - 0.8} width="6.4" height="1.6" rx="0.3" fill="#1e293b" stroke="#475569" strokeWidth="0.03" />
        <rect x={TV.x - TV.largura / 2} y={TV.z - 0.05} width={TV.largura} height="0.14" fill="#38bdf8" />
        {[PAREDE_RESULTADOS.xResultados, PAREDE_RESULTADOS.xIndependencia].map((x) => (
          <rect key={x} x={x - PAREDE_RESULTADOS.largura / 2} y={PAREDE_RESULTADOS.z - 0.05} width={PAREDE_RESULTADOS.largura} height="0.14" fill="#3dd6f5" />
        ))}
        {/* servidores */}
        {RACKS.map(([x, z], i) => (
          <rect key={`${x}|${z}`} x={x - 0.42} y={z - 0.5} width="0.84" height="1" fill="#0f172a" stroke="#3dd6f5" strokeOpacity={i % 3 === 0 ? 0.95 : 0.45} strokeWidth="0.04" />
        ))}
        {/* sua mesa */}
        <rect x={MESA_RAFAEL[0] - 1.4} y={MESA_RAFAEL[1] - 0.5} width="2.8" height="1" rx="0.08" fill="#1e293b" stroke="#475569" strokeWidth="0.03" />
        <g transform={`translate(${MESA_RAFAEL[0]} ${MESA_RAFAEL[1] - 0.95})`}>
          <circle r="0.6" fill="#0f172a" stroke={pendentes > 0 ? "#fbbf24" : "#34d399"} strokeWidth="0.13" />
          <Texto y={0.23} tam={0.62} peso={700} cor="#f8fafc" meio>R</Texto>
          <Texto y={-0.82} tam={0.58} cor={pendentes > 0 ? "#fbbf24" : "#e2e8f0"} meio contorno>
            Rafael{pendentes > 0 ? ` · ${pendentes}` : ""}
          </Texto>
        </g>

        {/* agentes */}
        {comMesa.map((a) => {
          const estado = estados[a.id];
          const lugar = lugares[a.id];
          const p: Vec2 = andando[a.id] ?? lugar?.assento ?? (MESAS[a.id] ? cadeira(a.id) : [0, 0]);
          const sit = situacaoDe(estado, !!lugar, !!andando[a.id]);
          const cor = COR_STATUS[sit.tipo];
          const sel = selecionado === a.id;
          const n = demandasPorAgente[a.id] ?? 0;
          return (
            <g key={a.id} transform={`translate(${p[0]} ${p[1]})`} onClick={() => onSelecionar(a.id)}
              tabIndex={0} role="button" aria-label={`${a.nome}, ${sit.texto}${n ? `, ${n} demandas abertas` : ""}`}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelecionar(a.id); } }}
              className="cursor-pointer outline-none">
              {sit.tipo === "trabalhando" && (
                <circle r="0.5" fill="none" stroke={cor} strokeWidth="0.06">
                  <animate attributeName="r" values="0.62;1.15" dur="1.8s" repeatCount="indefinite" />
                  <animate attributeName="stroke-opacity" values="0.8;0" dur="1.8s" repeatCount="indefinite" />
                </circle>
              )}
              {sel && <circle r="0.86" fill="none" stroke="#f8fafc" strokeWidth="0.07" />}
              <circle r="0.6" fill="#0f172a" stroke={cor} strokeWidth="0.13" />
              <Texto y={0.23} tam={0.62} peso={700} cor="#f8fafc" meio>{a.nome[0]}</Texto>
              <Texto y={1.3} tam={0.58} cor="#f1f5f9" meio contorno>{a.nome}</Texto>
              <Texto y={1.9} tam={0.48} peso={600} cor={cor} meio contorno>{sit.texto}</Texto>
              {n > 0 && (
                <g transform="translate(0.56 -0.56)">
                  <circle r="0.27" fill="#a78bfa" />
                  <Texto y={0.11} tam={0.3} peso={700} cor="#0b111c" meio>{n > 99 ? "99" : n}</Texto>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
