"use client";

// Os nomes sobre os robôs, em HTML de verdade (letra nítida, botão com foco) numa camada só sobre o 3D.
// Só a posição muda a cada quadro, direto no estilo, sem passar pelo React.
import { memo, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ARQUIVO_X, CADEIRA_GESTOR, estanteZ, type AgenteInfo, type EstadoAgente, type LugarReuniao, type SetorInfo } from "@/lib/escritorio/modelo";
import { COR_STATUS, situacaoDe } from "./status";
import type { Registro } from "./Robos";

export type Elementos = Map<string, { el: HTMLElement; maximo?: number; y: number; x?: number; z?: number }>;

// Dentro do Canvas: projeta cada nome na tela. Só escreve no DOM quando a posição muda.
export function Projetor({ elementos, registro }: { elementos: Elementos; registro: Registro }) {
  const v = useMemo(() => new THREE.Vector3(), []);
  const ultimo = useRef(new Map<string, string>());
  useFrame(({ camera, size }) => {
    for (const [id, item] of elementos) {
      const p = registro.pos.get(id);
      const x = item.x ?? p?.x;
      const z = item.z ?? p?.z;
      let chave = "off";
      let compacto = false;
      if (x !== undefined && z !== undefined && (item.x !== undefined || p?.visivel)) {
        v.set(x, item.y, z);
        const distancia = camera.position.distanceTo(v);
        // em câmeras baixas, esconde os nomes de quem está longe, para não poluir a imagem
        const longe = (item.maximo !== undefined && distancia > item.maximo) || (item.maximo === undefined && camera.position.y < 4.5 && distancia > 13);
        v.project(camera);
        if (!longe && v.z < 1) {
          compacto = distancia > 22;
          chave = `${Math.round((v.x * 0.5 + 0.5) * size.width)},${Math.round((-v.y * 0.5 + 0.5) * size.height)}`;
        }
      }
      const antes = ultimo.current.get(id);
      const novo = `${chave}|${compacto ? 1 : 0}`;
      if (antes === novo) continue;
      ultimo.current.set(id, novo);
      if (chave === "off") {
        item.el.style.visibility = "hidden";
      } else {
        const [px, py] = chave.split(",");
        item.el.style.visibility = "visible";
        item.el.style.transform = `translate(${px}px, ${py}px) translate(-50%, -100%)`;
        item.el.dataset.compacto = compacto ? "1" : "0";
      }
    }
  });
  return null;
}

const ALTURA_NOME = 2.28;

function NomeRobo({ agente, estado, lugar, selecionado, falando, demandas, legenda, elementos, onClick }: {
  agente: AgenteInfo;
  estado: EstadoAgente | undefined;
  lugar: LugarReuniao | undefined;
  selecionado: boolean;
  falando: string | null;
  demandas: number;
  legenda: string | undefined;
  elementos: Elementos;
  onClick: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    elementos.set(agente.id, { el: ref.current, y: ALTURA_NOME });
    return () => { elementos.delete(agente.id); };
  }, [agente.id, elementos]);

  const [concluiu, setConcluiu] = useState(false);
  const antes = useRef(estado?.status);
  useEffect(() => {
    const anterior = antes.current;
    antes.current = estado?.status;
    if (anterior !== "trabalhando" || estado?.status !== "disponivel") return;
    setConcluiu(true);
    const t = setTimeout(() => setConcluiu(false), 9000);
    return () => clearTimeout(t);
  }, [estado?.status]);

  const emPausa = legenda === "recarregando";
  const sit = situacaoDe(estado, !!lugar, !!legenda && !lugar && !emPausa, emPausa);
  const cor = concluiu && sit.tipo === "livre" ? "#34d399" : COR_STATUS[sit.tipo];
  const texto = concluiu && sit.tipo === "livre" ? "concluiu" : sit.texto;
  const detalhe = emPausa ? null : legenda ?? (estado?.status === "trabalhando" ? estado.passo ?? estado.rotina : null);

  return (
    <button ref={ref} type="button" onClick={onClick} aria-label={`${agente.nome}, ${agente.cargo}, ${texto}${demandas ? `, ${demandas} demandas abertas` : ""}`}
      className="rotulo-robo pointer-events-auto absolute left-0 top-0 flex w-max flex-col items-center gap-[3px] outline-none" style={{ visibility: "hidden" }}>
      {falando && <span className="rotulo-fala">{falando}</span>}
      {detalhe && !falando && <span className="boneco-extra rotulo-detalhe">{detalhe}</span>}
      <span className="rotulo-chip" data-selecionado={selecionado} style={{ borderColor: cor }}>
        <span className="size-[7px] rounded-full" style={{ background: cor }} />
        {agente.nome}
        <span className="boneco-extra font-medium" style={{ color: cor }}>{texto}</span>
        {demandas > 0 && <span className="rotulo-numero">{demandas}</span>}
      </span>
    </button>
  );
}

function NomeFixo({ id, x, y, z, maximo, elementos, onClick, children, destaque, rotulo }: {
  id: string; x: number; y: number; z: number; maximo?: number; elementos: Elementos; onClick: () => void; children: React.ReactNode; destaque?: string; rotulo: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    elementos.set(id, { el: ref.current, x, y, z, maximo });
    return () => { elementos.delete(id); };
  }, [id, x, y, z, maximo, elementos]);
  return (
    <button ref={ref} type="button" onClick={onClick} aria-label={rotulo}
      className="rotulo-robo pointer-events-auto absolute left-0 top-0 w-max outline-none" style={{ visibility: "hidden" }}>
      <span className="rotulo-chip" style={destaque ? { borderColor: destaque, color: destaque } : undefined}>{children}</span>
    </button>
  );
}

export const Rotulos = memo(function Rotulos({
  agentes, estados, lugares, selecionado, falandoId, falandoTexto, demandas, pendentes, setores, contagem, registro, elementos, visivel,
  onRobo, onGestor, onSetor,
}: {
  agentes: AgenteInfo[];
  estados: Record<string, EstadoAgente>;
  lugares: Record<string, LugarReuniao>;
  selecionado: string | null;
  falandoId: string | null;
  falandoTexto: string | null;
  demandas: Record<string, number>;
  pendentes: number;
  setores: SetorInfo[];
  contagem: Record<string, number>;
  registro: Registro;
  elementos: Elementos;
  visivel: boolean;
  onRobo: (id: string) => void;
  onGestor: () => void;
  onSetor: (id: string) => void;
}) {
  const versao = useSyncExternalStore(
    (f) => { registro.ouvintes.add(f); return () => { registro.ouvintes.delete(f); }; },
    () => registro.versao,
    () => 0,
  );
  void versao;
  return (
    <div aria-label="Equipe" className={`pointer-events-none absolute inset-0 z-20 overflow-hidden ${visivel ? "" : "hidden"}`}>
      {agentes.map((a) => (
        <NomeRobo key={a.id} agente={a} estado={estados[a.id]} lugar={lugares[a.id]} selecionado={selecionado === a.id}
          falando={falandoId === a.id ? falandoTexto : null} demandas={demandas[a.id] ?? 0} legenda={registro.legendas.get(a.id)}
          elementos={elementos} onClick={() => onRobo(a.id)} />
      ))}
      <NomeFixo id="__gestor" x={CADEIRA_GESTOR[0]} y={1.75} z={CADEIRA_GESTOR[1] - 0.7} elementos={elementos} onClick={onGestor} destaque={pendentes > 0 ? "#fbbf24" : undefined}
        rotulo={`Sua mesa, ${pendentes} decisões esperando você`}>
        Você{pendentes > 0 ? ` · ${pendentes} esperando` : ""}
      </NomeFixo>
      {setores.map((s, i) => (
        <NomeFixo key={s.id} id={`__estante-${s.id}`} x={ARQUIVO_X - 0.2} y={2.75} z={estanteZ(i, setores.length)} maximo={14} elementos={elementos}
          onClick={() => onSetor(s.id)} rotulo={`Arquivo de ${s.nome}, ${contagem[s.id] ?? 0} documentos`}>
          {s.nome} · {contagem[s.id] ?? 0}
        </NomeFixo>
      ))}
    </div>
  );
});
