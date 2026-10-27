"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { CADEIRA_RAFAEL, type EstadoAgente, type Vec2, type Viagem } from "@/lib/escritorio/modelo";
import { aparenciaDe, Corpo, poseAndando, poseConversando, poseSentado, type Juntas } from "./Corpo";
import { mat } from "./materiais";

const VELOCIDADE = 2.0; // m/s
const PASSADA = 0.72; // m por meio ciclo de passo
const PAUSA_DESTINO = 1.6; // s parado no destino
const GIRO = 10; // quão rápido vira para a direção do passo

type Fase = "sentado" | "indo" | "pausa" | "voltando";

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
  id, nome, cor, cadeira, estado, viagem, selecionado, onClick, onViagemFim,
}: {
  id: string;
  nome: string;
  cor: string;
  cadeira: Vec2;
  estado: EstadoAgente;
  viagem: Viagem | null;
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
  const acum = useRef<number[]>([0]);
  const viagemAtual = useRef<Viagem | null>(null);
  const [andando, setAndando] = useState(false);

  // Nova viagem: levanta e começa a andar a partir da cadeira.
  useEffect(() => {
    if (viagem && viagemAtual.current?.id !== viagem.id) {
      viagemAtual.current = viagem;
      acum.current = medir(viagem.caminho);
      dist.current = 0;
      fase.current = "indo";
      setAndando(true);
    }
  }, [viagem]);

  useFrame(({ clock }, dtBruto) => {
    const g = raiz.current;
    const j = juntas.current;
    if (!g) return;
    const dt = Math.min(dtBruto, 0.1); // aba em segundo plano: não teleporta ao voltar
    const t = clock.elapsedTime + (s % 100) * 0.13;
    const v = viagemAtual.current;
    const trabalhando = estado.status === "trabalhando";

    if (fase.current === "sentado" || !v) {
      g.position.set(cadeira[0], 0, cadeira[1]);
      g.rotation.y = Math.PI; // de frente para o monitor
      poseSentado(j, trabalhando ? "digitando" : "relaxado", t);
      if (papel.current) papel.current.visible = false;
      if (rotulo.current) rotulo.current.position.y = 1.95;
      return;
    }

    const total = acum.current[acum.current.length - 1];
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
        fase.current = "sentado";
        viagemAtual.current = null;
        setAndando(false);
        onViagemFim(v.id);
        return;
      }
    }

    const { p, dir } = pontoEm(v.caminho, acum.current, dist.current);
    g.position.set(p[0], 0, p[1]);
    const sentido = fase.current === "voltando" ? -1 : 1;
    if (fase.current !== "pausa" && (dir[0] !== 0 || dir[1] !== 0)) {
      const alvo = Math.atan2(dir[0] * sentido, dir[1] * sentido);
      g.rotation.y = girarPara(g.rotation.y, alvo, 1 - Math.exp(-GIRO * dt));
    }
    // leva o papel na ida (documento/demanda) ou na volta (buscar decisão)
    const levando = (v.tipo !== "buscar" && fase.current === "indo") || (v.tipo === "buscar" && fase.current === "voltando");
    if (papel.current) papel.current.visible = levando;
    if (fase.current === "pausa") poseConversando(j, t);
    else poseAndando(j, (dist.current / PASSADA) * Math.PI, levando);
    if (rotulo.current) rotulo.current.position.y = 2.12;
  });

  useFrame(({ clock }) => {
    if (anel.current) anel.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 4) * 0.06);
  });

  const corStatus = estado.status === "trabalhando" ? "#2563eb" : estado.status === "erro" ? "#c0362c" : "#12805c";
  const legenda = andando && viagemAtual.current
    ? viagemAtual.current.rotulo
    : estado.status === "trabalhando" ? estado.passo ?? estado.rotina ?? "trabalhando" : null;

  return (
    <group ref={raiz}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { document.body.style.cursor = ""; }}>
      <Corpo ap={ap} juntas={juntas}
        noTronco={
          <mesh ref={papel} geometry={PAPEL} material={mat("#fbfaf7", 0.9)} position={[0, 0.22, 0.36]} rotation-x={-1.1}
            visible={false} castShadow />
        } />
      {selecionado && (
        <mesh ref={anel} position={[0, 0.012, 0]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.45, 0.54, 40]} />
          <meshBasicMaterial color="#2563eb" transparent opacity={0.85} />
        </mesh>
      )}
      <group ref={rotulo} position={[0, 1.95, 0]}>
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
