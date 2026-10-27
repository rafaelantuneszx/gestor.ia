"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { EstadoAgente, Vec2, Viagem } from "@/lib/escritorio/modelo";

const PELES = ["#f1c7a5", "#e0ac84", "#c68a62", "#8d5a3b", "#f5d3b8", "#b97a56"];
const CABELOS = ["#2b1d14", "#4a3020", "#151515", "#7a4b28", "#b07a3c", "#3a3a3a"];
const VELOCIDADE = 2.4; // m/s
const PAUSA_DESTINO = 1.1; // s parado no destino

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
  const pele = PELES[s % PELES.length];
  const cabelo = CABELOS[(s >> 3) % CABELOS.length];

  const raiz = useRef<THREE.Group>(null);
  const corpo = useRef<THREE.Group>(null);
  const pernaE = useRef<THREE.Group>(null);
  const pernaD = useRef<THREE.Group>(null);
  const bracoE = useRef<THREE.Group>(null);
  const bracoD = useRef<THREE.Group>(null);
  const papel = useRef<THREE.Mesh>(null);

  const fase = useRef<Fase>("sentado");
  const dist = useRef(0);
  const pausa = useRef(0);
  const acum = useRef<number[]>([0]);
  const viagemAtual = useRef<Viagem | null>(null);
  const [andando, setAndando] = useState(false);

  // Nova viagem: começa a andar a partir da cadeira.
  useEffect(() => {
    if (viagem && viagemAtual.current?.id !== viagem.id) {
      viagemAtual.current = viagem;
      acum.current = medir(viagem.caminho);
      dist.current = 0;
      fase.current = "indo";
      setAndando(true);
    }
  }, [viagem]);

  useFrame(({ clock }, dt) => {
    const g = raiz.current;
    if (!g) return;
    const t = clock.elapsedTime + (s % 100) * 0.13;
    const v = viagemAtual.current;
    const trabalhando = estado.status === "trabalhando";

    if (fase.current === "sentado" || !v) {
      g.position.set(cadeira[0], 0, cadeira[1]);
      g.rotation.y = Math.PI; // de frente para o monitor
      if (corpo.current) corpo.current.position.y = 0.5 + Math.sin(t * 1.6) * 0.006;
      pernaE.current?.rotation.set(-Math.PI / 2, 0, 0.05);
      pernaD.current?.rotation.set(-Math.PI / 2, 0, -0.05);
      const digita = trabalhando ? Math.sin(t * 18) * 0.12 : 0;
      bracoE.current?.rotation.set(trabalhando ? -1.15 + digita : -0.35, 0, 0.12);
      bracoD.current?.rotation.set(trabalhando ? -1.15 - digita : -0.35, 0, -0.12);
      if (papel.current) papel.current.visible = false;
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
      g.rotation.y = Math.atan2(dir[0] * sentido, dir[1] * sentido);
    }
    const passo = fase.current === "pausa" ? 0 : Math.sin(t * 9);
    if (corpo.current) corpo.current.position.y = 0.9 + Math.abs(passo) * 0.04;
    pernaE.current?.rotation.set(passo * 0.55, 0, 0);
    pernaD.current?.rotation.set(-passo * 0.55, 0, 0);
    // leva o papel na ida (documento/demanda) ou na volta (buscar decisão)
    const levando = (v.tipo !== "buscar" && fase.current === "indo") || (v.tipo === "buscar" && fase.current === "voltando");
    if (papel.current) papel.current.visible = levando;
    if (levando) {
      bracoE.current?.rotation.set(-1.0, 0, 0.15);
      bracoD.current?.rotation.set(-1.0, 0, -0.15);
    } else if (fase.current === "pausa") {
      bracoE.current?.rotation.set(-0.9 + Math.sin(t * 6) * 0.2, 0, 0.15);
      bracoD.current?.rotation.set(-0.2, 0, -0.1);
    } else {
      bracoE.current?.rotation.set(-passo * 0.5, 0, 0.08);
      bracoD.current?.rotation.set(passo * 0.5, 0, -0.08);
    }
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
      <group ref={corpo} position={[0, 0.5, 0]}>
        {/* quadril e tronco */}
        <mesh position={[0, 0.05, 0]} castShadow>
          <boxGeometry args={[0.34, 0.14, 0.2]} />
          <meshStandardMaterial color="#2f3640" />
        </mesh>
        <mesh position={[0, 0.34, 0]} castShadow>
          <capsuleGeometry args={[0.17, 0.3, 6, 12]} />
          <meshStandardMaterial color={cor} />
        </mesh>
        {/* cabeça, cabelo e olhos (rosto para +z) */}
        <mesh position={[0, 0.8, 0]} castShadow>
          <sphereGeometry args={[0.14, 20, 16]} />
          <meshStandardMaterial color={pele} />
        </mesh>
        <mesh position={[0, 0.85, -0.02]} castShadow>
          <sphereGeometry args={[0.145, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={cabelo} />
        </mesh>
        {[-0.05, 0.05].map((x) => (
          <mesh key={x} position={[x, 0.81, 0.128]}>
            <sphereGeometry args={[0.018, 8, 8]} />
            <meshStandardMaterial color="#1b1f24" />
          </mesh>
        ))}
        {/* braços: pivô no ombro */}
        <group ref={bracoE} position={[-0.23, 0.55, 0]}>
          <mesh position={[0, -0.26, 0]} castShadow>
            <capsuleGeometry args={[0.055, 0.4, 4, 8]} />
            <meshStandardMaterial color={cor} />
          </mesh>
          <mesh position={[0, -0.52, 0]}>
            <sphereGeometry args={[0.055, 10, 8]} />
            <meshStandardMaterial color={pele} />
          </mesh>
        </group>
        <group ref={bracoD} position={[0.23, 0.55, 0]}>
          <mesh position={[0, -0.26, 0]} castShadow>
            <capsuleGeometry args={[0.055, 0.4, 4, 8]} />
            <meshStandardMaterial color={cor} />
          </mesh>
          <mesh position={[0, -0.52, 0]}>
            <sphereGeometry args={[0.055, 10, 8]} />
            <meshStandardMaterial color={pele} />
          </mesh>
        </group>
        {/* pernas: pivô no quadril */}
        <group ref={pernaE} position={[-0.09, 0, 0]}>
          <mesh position={[0, -0.42, 0]} castShadow>
            <capsuleGeometry args={[0.07, 0.7, 4, 8]} />
            <meshStandardMaterial color="#323a4a" />
          </mesh>
        </group>
        <group ref={pernaD} position={[0.09, 0, 0]}>
          <mesh position={[0, -0.42, 0]} castShadow>
            <capsuleGeometry args={[0.07, 0.7, 4, 8]} />
            <meshStandardMaterial color="#323a4a" />
          </mesh>
        </group>
        {/* papel carregado à frente do peito */}
        <mesh ref={papel} position={[0, 0.3, 0.32]} rotation-x={-0.5} visible={false} castShadow>
          <boxGeometry args={[0.3, 0.02, 0.4]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        {/* anel de seleção no chão */}
        {selecionado && (
          <mesh position={[0, -0.48, 0]} rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.42, 0.5, 32]} />
            <meshBasicMaterial color="#2563eb" />
          </mesh>
        )}
        <Html position={[0, 1.18, 0]} center zIndexRange={[20, 0]}>
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
