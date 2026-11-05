"use client";

// Planta baixa ao vivo: a central, as mesas e cada robô com o status, no mesmo modelo do 3D.
// Quem está em viagem anda pelas mesmas rotas; quem está em reunião aparece na cadeira da mesa de reunião.
import { useEffect, useRef, useState } from "react";
import {
  ANEL_1, ANEL_2, FOCO, MESA_GESTOR, MESA_REUNIAO, MESAS, PLATAFORMA_GESTOR, PONTOS_RECARGA, POSTOS, PREDIO, RACKS, SETOR_COR, ZONAS, cadeira,
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

// Arco do corredor em coordenadas do SVG.
function caminhoDoArco(r: number, abertura: number) {
  const ax = FOCO[0] + r * Math.sin(-abertura);
  const az = FOCO[1] + r * Math.cos(abertura);
  const bx = FOCO[0] + r * Math.sin(abertura);
  return `M ${ax} ${az} A ${r} ${r} 0 0 0 ${bx} ${az}`;
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
  const w = PREDIO.x1 - PREDIO.x0 + MARGEM * 2;
  const d = PREDIO.z1 - PREDIO.z0 + MARGEM * 2;
  const comMesa = agentes.filter((a) => MESAS[a.id] || lugares[a.id] || andando[a.id]);

  return (
    <div className="absolute inset-0 overflow-auto bg-[#060a12] pb-3 pt-[150px] lg:pt-[120px]">
      <svg viewBox={`${PREDIO.x0 - MARGEM} ${PREDIO.z0 - MARGEM} ${w} ${d}`} role="img" aria-label="Planta baixa da central com o status de cada robô"
        className="mx-auto block h-full w-full min-w-[900px]" style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
        <defs>
          <pattern id="grade-planta" width="1" height="1" patternUnits="userSpaceOnUse">
            <path d="M1 0H0V1" fill="none" stroke="#3dd6f5" strokeOpacity="0.07" strokeWidth="0.02" />
          </pattern>
        </defs>
        <rect x={PREDIO.x0} y={PREDIO.z0} width={PREDIO.x1 - PREDIO.x0} height={PREDIO.z1 - PREDIO.z0} fill="#0b111c" />
        <rect x={PREDIO.x0} y={PREDIO.z0} width={PREDIO.x1 - PREDIO.x0} height={PREDIO.z1 - PREDIO.z0} fill="url(#grade-planta)" />

        {/* parede de telas */}
        <rect x={-13} y={PREDIO.z0 + 0.1} width={26} height={0.28} fill="#3dd6f5" />
        <Texto x={0} y={PREDIO.z0 + 1.3} tam={0.72} cor="#7dd3fc" meio contorno>Parede de telas</Texto>

        {/* corredores */}
        {([[ANEL_1, 1.05], [ANEL_2, 0.76]] as const).map(([r, ab]) => (
          <path key={r} d={caminhoDoArco(r, ab)} fill="none" stroke="#3dd6f5" strokeOpacity="0.4" strokeWidth="0.05" strokeDasharray="0.5 0.4" />
        ))}

        {/* zonas de apoio */}
        {ZONAS.map((z) => (
          <g key={z.id}>
            <rect x={z.x0} y={z.z0} width={z.x1 - z.x0} height={z.z1 - z.z0} rx="0.5" fill={z.cor} fillOpacity="0.07" stroke={z.cor} strokeOpacity="0.6" strokeWidth="0.07" />
            <Texto x={z.x0 + 0.5} y={z.z0 + 1.05} tam={0.8} cor="#e2e8f0" contorno>{z.nome}</Texto>
          </g>
        ))}

        {/* mesas */}
        {Object.entries(POSTOS).map(([id, p]) => {
          const [x, z] = MESAS[id];
          const largura = p.telas === 3 ? 2.75 : p.telas === 2 ? 2.2 : 1.8;
          return (
            <g key={id} transform={`translate(${x} ${z}) rotate(${(-p.angulo * 180) / Math.PI})`}>
              <rect x={-largura / 2} y={-0.43} width={largura} height={0.86} rx="0.06" fill="#1e293b" stroke={SETOR_COR[p.setor] ?? "#475569"} strokeOpacity="0.7" strokeWidth="0.04" />
              <rect x={-largura / 2 + 0.2} y={-0.3} width={largura - 0.4} height={0.07} fill="#38bdf8" />
            </g>
          );
        })}
        {/* mesa de reunião, servidores e docas */}
        <rect x={MESA_REUNIAO[0] - 3.2} y={MESA_REUNIAO[1] - 0.8} width="6.4" height="1.6" rx="0.3" fill="#1e293b" stroke="#475569" strokeWidth="0.03" />
        {RACKS.map(([x, z], i) => (
          <rect key={`${x}|${z}`} x={x - 0.42} y={z - 0.5} width="0.84" height="1" fill="#0f172a" stroke="#3dd6f5" strokeOpacity={i % 3 === 0 ? 0.95 : 0.45} strokeWidth="0.04" />
        ))}
        {PONTOS_RECARGA.map(([x, z]) => <circle key={x} cx={x} cy={z} r="0.5" fill="#0f172a" stroke="#34d399" strokeWidth="0.06" />)}

        {/* sua mesa */}
        <circle cx={MESA_GESTOR[0]} cy={MESA_GESTOR[1] + 0.2} r={PLATAFORMA_GESTOR} fill="#b8875a" fillOpacity="0.1" stroke="#f5b57a" strokeOpacity="0.7" strokeWidth="0.06" />
        <rect x={MESA_GESTOR[0] - 1.55} y={MESA_GESTOR[1] - 0.52} width="3.1" height="1.05" rx="0.08" fill="#4a3324" stroke="#f5b57a" strokeOpacity="0.6" strokeWidth="0.03" />
        <g transform={`translate(${MESA_GESTOR[0]} ${MESA_GESTOR[1] + 1.1})`}>
          <circle r="0.6" fill="#0f172a" stroke={pendentes > 0 ? "#fbbf24" : "#34d399"} strokeWidth="0.13" />
          <Texto y={0.23} tam={0.62} peso={700} cor="#f8fafc" meio>V</Texto>
          <Texto y={1.3} tam={0.58} cor={pendentes > 0 ? "#fbbf24" : "#e2e8f0"} meio contorno>
            Você{pendentes > 0 ? ` · ${pendentes}` : ""}
          </Texto>
        </g>

        {/* robôs */}
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
