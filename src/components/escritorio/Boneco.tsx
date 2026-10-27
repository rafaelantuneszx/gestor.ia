"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { CADEIRA_RAFAEL, type EstadoAgente, type LugarReuniao, type Vec2, type Viagem } from "@/lib/escritorio/modelo";
import { aparenciaDe, Corpo, poseAndando, poseConversando, poseSentado, type Juntas } from "./Corpo";
import { mat } from "./materiais";

const VELOCIDADE = 2.0; // m/s
const PASSADA = 0.72; // m por meio ciclo de passo
const PAUSA_DESTINO = 1.6; // s parado no destino
const GIRO = 10; // quão rápido vira para a direção do passo

// sentado na própria mesa · viagem (ida, pausa, volta) · reunião (ida, sentado na sala, volta)
type Fase = "sentado" | "indo" | "pausa" | "voltando" | "indoReuniao" | "naReuniao" | "voltandoReuniao";

function semente(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

// Comprimento acumulado de um caminho, para andar a velocidade constante.
function medir(caminho: Vec2[]) {
  const acum = [0];
  for (let i = 1; i < caminho.length; i++) {
    const [x1, z1] = caminho[i - 1];
    const [x2, z2] = caminho[i];
    acum.push(acum[i - 1] + Math.hypot(x2 - x1, z2 - z1));
  }
  return acum;
}

function pontoEm(caminho: Vec2[], acum: number[], d: number): { p: Vec2; dir: Vec2 } {
  const total = acum[acum.length - 1];
  const dd = Math.max(0, Math.min(total, d));
  let i = 1;
  while (i < acum.length - 1 && acum[i] < dd) i++;
  const [x1, z1] = caminho[i - 1];
  const [x2, z2] = caminho[i];
  const seg = acum[i] - acum[i - 1] || 1;
  const t = (dd - acum[i - 1]) / seg;
  return { p: [x1 + (x2 - x1) * t, z1 + (z2 - z1) * t], dir: [x2 - x1, z2 - z1] };
}

function girarPara(atual: number, alvo: number, k: number) {
  const d = Math.atan2(Math.sin(alvo - atual), Math.cos(alvo - atual));
  return atual + d * k;
}

const PAPEL = new THREE.BoxGeometry(0.24, 0.32, 0.012);

export function Boneco({
  id, nome, cor, cadeira, temMesa = true, estado, viagem, reuniao, selecionado, onClick, onViagemFim,
}: {
  id: string;
  nome: string;
  cor: string;
  cadeira: Vec2; // onde o boneco fica quando não está andando (a cadeira da mesa, ou a entrada para quem não tem mesa)
  temMesa?: boolean; // sem mesa: só aparece enquanto vai, fica ou volta da reunião ou de uma viagem
  estado: EstadoAgente;
  viagem: Viagem | null;
  reuniao: LugarReuniao | null;
  selecionado: boolean;
  onClick: () => void;
  onViagemFim: (viagemId: string) => void;
}) {
  const s = semente(id);
  const ap = useMemo(() => aparenciaDe(id, cor), [id, cor]);

  const raiz = useRef<THREE.Group>(null);
  const rotulo = useRef<THREE.Group>(null);
  const anel = useRef<THREE.Mesh>(null);
  const juntas = useRef<Juntas>({});
  const papel = useRef<THREE.Mesh>(null);

  const fase = useRef<Fase>("sentado");
  const dist = useRef(0);
  const pausa = useRef(0);
  const caminho = useRef<Vec2[]>([]);
  const acum = useRef<number[]>([0]);
  const viagemAtual = useRef<Viagem | null>(null);
  const viagemFeita = useRef<string | null>(null);
  const reuniaoAtual = useRef<LugarReuniao | null>(null);
  // as props mais recentes, lidas dentro do useFrame
  const viagemProp = useRef(viagem);
  const reuniaoProp = useRef(reuniao);
  useEffect(() => { viagemProp.current = viagem; }, [viagem]);
  useEffect(() => { reuniaoProp.current = reuniao; }, [reuniao]);
  // legenda e visibilidade só mudam nas trocas de fase (não a cada quadro)
  const [legendaFora, setLegendaFora] = useState<string | null>(null);
  const [fora, setFora] = useState(false);

  const comecar = (novaFase: Fase, rota: Vec2[], legenda: string) => {
    fase.current = novaFase;
    caminho.current = rota;
    acum.current = medir(rota);
    dist.current = 0;
    setLegendaFora(legenda);
    setFora(true);
  };
  const sentarEmCasa = () => {
    fase.current = "sentado";
    viagemAtual.current = null;
    reuniaoAtual.current = null;
    setLegendaFora(null);
    setFora(false);
  };

  useFrame(({ clock }, dtBruto) => {
    const g = raiz.current;
    const j = juntas.current;
    if (!g) return;
    const dt = Math.min(dtBruto, 0.1); // aba em segundo plano: não teleporta ao voltar
    const t = clock.elapsedTime + (s % 100) * 0.13;
    const trabalhando = estado.status === "trabalhando";

    // Na mesa: a reunião tem prioridade; depois, a próxima viagem da fila.
    if (fase.current === "sentado") {
      const r = reuniaoProp.current;
      const v = viagemProp.current;
      if (r && r.caminho.length > 1) {
        reuniaoAtual.current = r;
        comecar("indoReuniao", r.caminho, `em reunião: ${r.titulo}`);
      } else if (v && v.id !== viagemFeita.current && v.caminho.length > 1) {
        viagemAtual.current = v;
        comecar("indo", v.caminho, v.rotulo);
      } else {
        g.visible = temMesa;
        g.position.set(cadeira[0], 0, cadeira[1]);
        g.rotation.y = Math.PI; // de frente para o monitor
        poseSentado(j, trabalhando ? "digitando" : "relaxado", t);
        if (papel.current) papel.current.visible = false;
        if (rotulo.current) rotulo.current.position.y = 1.95;
        return;
      }
    }
    g.visible = true;
    const total = acum.current[acum.current.length - 1];

    // ---- reunião ----
    if (fase.current === "indoReuniao" || fase.current === "naReuniao" || fase.current === "voltandoReuniao") {
      const alvo = reuniaoProp.current;
      const atual = reuniaoAtual.current;
      const mesma = !!alvo && !!atual && alvo.chave === atual.chave;
      if (fase.current !== "voltandoReuniao" && !mesma) {
        // a reunião acabou (ou mudou de cadeira): volta para a mesa pelo mesmo caminho
        if (fase.current === "naReuniao") dist.current = total;
        fase.current = "voltandoReuniao";
        setLegendaFora("voltando da reunião");
      } else if (fase.current === "voltandoReuniao" && mesma) {
        fase.current = "indoReuniao"; // recomeçou antes de chegar à mesa
        setLegendaFora(`em reunião: ${atual!.titulo}`);
      }

      if (fase.current === "naReuniao") {
        g.position.set(atual!.assento[0], 0, atual!.assento[1]);
        g.rotation.y = girarPara(g.rotation.y, atual!.rotacao, 1 - Math.exp(-GIRO * dt));
        poseSentado(j, (s + Math.floor(t / 9)) % 3 === 0 ? "lendo" : "relaxado", t);
        if (papel.current) papel.current.visible = false;
        if (rotulo.current) rotulo.current.position.y = 1.95;
        return;
      }
      if (fase.current === "indoReuniao") {
        dist.current += VELOCIDADE * dt;
        if (dist.current >= total) {
          dist.current = total;
          fase.current = "naReuniao";
        }
      } else {
        dist.current -= VELOCIDADE * dt;
        if (dist.current <= 0) {
          sentarEmCasa();
          return;
        }
      }
      andar(g, j, fase.current === "voltandoReuniao" ? -1 : 1, false, dt);
      if (papel.current) papel.current.visible = false;
      return;
    }

    // ---- viagem (documento, demanda, buscar decisão) ----
    const v = viagemAtual.current;
    if (!v) {
      sentarEmCasa();
      return;
    }
    if (fase.current === "indo") {
      dist.current += VELOCIDADE * dt;
      if (dist.current >= total) {
        dist.current = total;
        fase.current = "pausa";
        pausa.current = 0;
      }
    } else if (fase.current === "pausa") {
      pausa.current += dt;
      if (pausa.current >= PAUSA_DESTINO) fase.current = "voltando";
    } else if (fase.current === "voltando") {
      dist.current -= VELOCIDADE * dt;
      if (dist.current <= 0) {
        viagemFeita.current = v.id;
        sentarEmCasa();
        onViagemFim(v.id);
        return;
      }
    }
    // leva o papel na ida (documento/demanda) ou na volta (buscar decisão)
    const levando = (v.tipo !== "buscar" && fase.current === "indo") || (v.tipo === "buscar" && fase.current === "voltando");
    if (papel.current) papel.current.visible = levando;
    if (fase.current === "pausa") {
      const { p } = pontoEm(caminho.current, acum.current, dist.current);
      g.position.set(p[0], 0, p[1]);
      poseConversando(j, t);
    } else {
      andar(g, j, fase.current === "voltando" ? -1 : 1, levando, dt);
    }
    if (rotulo.current) rotulo.current.position.y = 2.12;
  });

  // Um passo no caminho atual: posição, giro para a direção do passo e pose de caminhada.
  function andar(g: THREE.Group, j: Juntas, sentido: 1 | -1, levando: boolean, dt: number) {
    const { p, dir } = pontoEm(caminho.current, acum.current, dist.current);
    g.position.set(p[0], 0, p[1]);
    if (dir[0] !== 0 || dir[1] !== 0) {
      const alvo = Math.atan2(dir[0] * sentido, dir[1] * sentido);
      g.rotation.y = girarPara(g.rotation.y, alvo, 1 - Math.exp(-GIRO * dt));
    }
    poseAndando(j, (dist.current / PASSADA) * Math.PI, levando);
    if (rotulo.current) rotulo.current.position.y = 2.12;
  }

  useFrame(({ clock }) => {
    if (anel.current) anel.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 4) * 0.06);
  });

  const corStatus = estado.status === "trabalhando" ? "#2563eb" : estado.status === "erro" ? "#c0362c" : "#12805c";
  const legenda = legendaFora ?? (estado.status === "trabalhando" ? estado.passo ?? estado.rotina ?? "trabalhando" : null);
  const mostrar = temMesa || fora;

  return (
    <group ref={raiz} visible={temMesa}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { document.body.style.cursor = ""; }}>
      <Corpo ap={ap} juntas={juntas}
        noTronco={
          <mesh ref={papel} geometry={PAPEL} material={mat("#fbfaf7", 0.9)} position={[0, 0.22, 0.36]} rotation-x={-1.1}
            visible={false} castShadow />
        } />
      {selecionado && mostrar && (
        <mesh ref={anel} position={[0, 0.012, 0]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.45, 0.54, 40]} />
          <meshBasicMaterial color="#2563eb" transparent opacity={0.85} />
        </mesh>
      )}
      <group ref={rotulo} position={[0, 1.95, 0]}>
        {mostrar && (
          <Html center zIndexRange={[20, 0]}>
            <div onClick={onClick}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, fontFamily: "system-ui", cursor: "pointer" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 5, padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap",
                background: selecionado ? "#2563eb" : "rgba(255,255,255,0.95)", color: selecionado ? "#fff" : "#1b1f24",
                fontSize: 12, fontWeight: 600, boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
              }}>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: corStatus }} />
                {nome}
              </div>
              {legenda && (
                <div style={{
                  maxWidth: 190, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 10.5,
                  padding: "1px 7px", borderRadius: 6, background: "rgba(13,17,23,0.85)", color: "#e3b341",
                }}>
                  {legenda}
                </div>
              )}
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}

// ---------- o Rafael, na sala dele ----------

export function Rafael({ pendentes, onClick }: { pendentes: number; onClick: () => void }) {
  const ap = useMemo(() => aparenciaDe("rafael", "#1f2a44"), []);
  const juntas = useRef<Juntas>({});
  useFrame(({ clock }) => {
    poseSentado(juntas.current, "lendo", clock.elapsedTime);
  });
  return (
    <group position={[CADEIRA_RAFAEL[0], 0, CADEIRA_RAFAEL[1]]}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { document.body.style.cursor = ""; }}>
      <Corpo ap={ap} juntas={juntas}
        noTronco={
          <mesh geometry={PAPEL} material={mat("#fbfaf7", 0.9)} position={[0, 0.2, 0.42]} rotation-x={-1.15} castShadow />
        } />
      <group position={[0, 1.78, 0]}>
        <Html center zIndexRange={[20, 0]}>
          <div onClick={onClick} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap",
            fontFamily: "system-ui", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
            background: pendentes > 0 ? "#fdf2e1" : "rgba(255,255,255,0.95)", color: pendentes > 0 ? "#9a5b0a" : "#1b1f24",
            border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
          }}>
            Rafael · {pendentes > 0 ? `${pendentes} aguardando você` : "nada pendente"}
          </div>
        </Html>
      </group>
    </group>
  );
}
