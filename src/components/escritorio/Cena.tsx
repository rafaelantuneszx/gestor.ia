"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import {
  ARQUIVO_PASSO, ARQUIVO_X0, ARQUIVO_Z, MESA_RAFAEL, SETOR_COR, ZONAS,
  type EstadoAgente, type SetorInfo,
} from "@/lib/escritorio/modelo";
import { desenharTerminal, TELA_H, TELA_W } from "./terminal";

const MADEIRA = "#c8a27a";
const MADEIRA_ESCURA = "#8a6a4b";
const METAL = "#3b3f46";

// ---------- sala ----------

export function Sala() {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow position={[0.5, 0, 1]}>
        <planeGeometry args={[30, 21]} />
        <meshStandardMaterial color="#e9e4dc" />
      </mesh>
      {ZONAS.map((z) => (
        <group key={z.nome}>
          <mesh rotation-x={-Math.PI / 2} position={[z.centro[0], 0.005, z.centro[1]]} receiveShadow>
            <planeGeometry args={z.tamanho} />
            <meshStandardMaterial color={z.cor} transparent opacity={0.13} />
          </mesh>
          <Html position={[z.centro[0] - z.tamanho[0] / 2 + 0.3, 0.02, z.centro[1] - z.tamanho[1] / 2 + 0.35]}
            transform rotation-x={-Math.PI / 2} scale={0.55} pointerEvents="none">
            <div style={{ fontFamily: "system-ui", fontWeight: 700, fontSize: 22, color: z.cor, whiteSpace: "nowrap", opacity: 0.85 }}>
              {z.nome.toUpperCase()}
            </div>
          </Html>
        </group>
      ))}
      {/* paredes do fundo e da esquerda, baixas para não esconder nada */}
      <mesh position={[0.5, 1.4, -8.6]} receiveShadow>
        <boxGeometry args={[30, 2.8, 0.2]} />
        <meshStandardMaterial color="#f4f1ec" />
      </mesh>
      <mesh position={[-14.6, 1.4, 1]} receiveShadow>
        <boxGeometry args={[0.2, 2.8, 19.4]} />
        <meshStandardMaterial color="#f4f1ec" />
      </mesh>
      {/* janelas */}
      {[-9, -3, 3, 9].map((x) => (
        <mesh key={x} position={[x, 1.7, -8.48]}>
          <planeGeometry args={[3.2, 1.3]} />
          <meshStandardMaterial color="#bcd7ee" emissive="#9ec4e6" emissiveIntensity={0.35} />
        </mesh>
      ))}
      <Planta posicao={[-13.6, -7.6]} />
      <Planta posicao={[13.4, -7.6]} />
      <Planta posicao={[-1.2, -7.6]} />
      <Planta posicao={[-13.6, 4.2]} />
      <MesaReuniao />
    </group>
  );
}

function Planta({ posicao }: { posicao: [number, number] }) {
  return (
    <group position={[posicao[0], 0, posicao[1]]}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.22, 0.5, 16]} />
        <meshStandardMaterial color="#7a5c43" />
      </mesh>
      <mesh position={[0, 0.85, 0]} castShadow>
        <sphereGeometry args={[0.45, 16, 12]} />
        <meshStandardMaterial color="#4f8a4b" />
      </mesh>
      <mesh position={[0.15, 1.2, 0.1]} castShadow>
        <sphereGeometry args={[0.3, 16, 12]} />
        <meshStandardMaterial color="#5c9a57" />
      </mesh>
    </group>
  );
}

function MesaReuniao() {
  return (
    <group position={[7, 0, 1.1]}>
      <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.3, 1.3, 0.06, 32]} />
        <meshStandardMaterial color={MADEIRA} />
      </mesh>
      <mesh position={[0, 0.37, 0]}>
        <cylinderGeometry args={[0.12, 0.2, 0.74, 12]} />
        <meshStandardMaterial color={METAL} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2;
        return <Cadeira key={i} posicao={[Math.cos(a) * 1.75, Math.sin(a) * 1.75]} rotacao={-a - Math.PI / 2} />;
      })}
      <Html position={[0, 1.2, 0]} center pointerEvents="none">
        <div style={{ fontFamily: "system-ui", fontSize: 11, color: "#6b7078", whiteSpace: "nowrap" }}>sala de reunião</div>
      </Html>
    </group>
  );
}

export function Cadeira({ posicao, rotacao = 0 }: { posicao: [number, number]; rotacao?: number }) {
  return (
    <group position={[posicao[0], 0, posicao[1]]} rotation-y={rotacao}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[0.5, 0.08, 0.5]} />
        <meshStandardMaterial color="#2f3640" />
      </mesh>
      <mesh position={[0, 0.8, 0.23]} castShadow>
        <boxGeometry args={[0.5, 0.6, 0.06]} />
        <meshStandardMaterial color="#2f3640" />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.44, 8]} />
        <meshStandardMaterial color={METAL} />
      </mesh>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.04, 12]} />
        <meshStandardMaterial color={METAL} />
      </mesh>
    </group>
  );
}

// ---------- mesa com monitor ----------

export function MesaAgente({
  posicao, nome, estado, cor, selecionado, onClick,
}: {
  posicao: [number, number];
  nome: string;
  estado: EstadoAgente;
  cor: string;
  selecionado: boolean;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <group position={[posicao[0], 0, posicao[1]]}>
      {/* tampo e pés */}
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.06, 0.9]} />
        <meshStandardMaterial color={MADEIRA} />
      </mesh>
      {[[-0.85, -0.4], [0.85, -0.4], [-0.85, 0.4], [0.85, 0.4]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.37, z]}>
          <boxGeometry args={[0.05, 0.74, 0.05]} />
          <meshStandardMaterial color={MADEIRA_ESCURA} />
        </mesh>
      ))}
      {/* teclado e caneca */}
      <mesh position={[0, 0.79, 0.15]}>
        <boxGeometry args={[0.55, 0.02, 0.18]} />
        <meshStandardMaterial color="#d8d8d8" />
      </mesh>
      <mesh position={[0.65, 0.83, 0.1]}>
        <cylinderGeometry args={[0.05, 0.05, 0.1, 12]} />
        <meshStandardMaterial color={cor} />
      </mesh>
      <Monitor nome={nome} estado={estado} selecionado={selecionado || hover} onClick={onClick}
        onHover={setHover} />
      <Cadeira posicao={[0, 0.85]} />
    </group>
  );
}

function Monitor({
  nome, estado, selecionado, onClick, onHover,
}: {
  nome: string;
  estado: EstadoAgente;
  selecionado: boolean;
  onClick: () => void;
  onHover: (v: boolean) => void;
}) {
  const canvas = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = TELA_W;
    c.height = TELA_H;
    return c;
  }, []);
  const textura = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [canvas]);
  const cursor = useRef(true);
  const acumulado = useRef(0);

  const redesenhar = () => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    desenharTerminal(ctx, nome, estado, cursor.current);
    textura.needsUpdate = true;
  };

  useEffect(redesenhar, [estado, nome]); // eslint-disable-line react-hooks/exhaustive-deps

  // cursor piscando (só redesenha 2x por segundo)
  useFrame((_, dt) => {
    acumulado.current += dt;
    if (acumulado.current > 0.5) {
      acumulado.current = 0;
      cursor.current = !cursor.current;
      redesenhar();
    }
  });

  const brilho = estado.status === "trabalhando" ? 0.95 : 0.55;
  return (
    <group position={[0, 0.78, -0.3]}>
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[0.28, 0.02, 0.2]} />
        <meshStandardMaterial color={METAL} />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[0.05, 0.32, 0.05]} />
        <meshStandardMaterial color={METAL} />
      </mesh>
      <group position={[0, 0.62, 0]}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={(e) => { e.stopPropagation(); onHover(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { onHover(false); document.body.style.cursor = ""; }}>
        <mesh castShadow>
          <boxGeometry args={[1.08, 0.7, 0.05]} />
          <meshStandardMaterial color={selecionado ? "#2563eb" : "#1d2026"} />
        </mesh>
        <mesh position={[0, 0, 0.027]}>
          <planeGeometry args={[1.0, 0.625]} />
          <meshStandardMaterial map={textura} emissive="#ffffff" emissiveMap={textura} emissiveIntensity={brilho} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

// ---------- arquivo ----------

export function Arquivo({
  setores, contagem, onAbrir,
}: {
  setores: SetorInfo[];
  contagem: Record<string, number>;
  onAbrir: (setor: string) => void;
}) {
  return (
    <group>
      {setores.map((s, i) => (
        <Estante key={s.id} x={ARQUIVO_X0 + i * ARQUIVO_PASSO} setor={s} quantidade={contagem[s.id] ?? 0}
          onClick={() => onAbrir(s.id)} />
      ))}
    </group>
  );
}

function Estante({ x, setor, quantidade, onClick }: { x: number; setor: SetorInfo; quantidade: number; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  const cor = SETOR_COR[setor.id] ?? "#888780";
  const PRAT = 4;
  const POR_PRAT = 12;
  const pastas = Math.min(quantidade, PRAT * POR_PRAT);
  return (
    <group position={[x, 0, ARQUIVO_Z]}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = ""; }}>
      {/* laterais, fundo e prateleiras */}
      {[-0.68, 0.68].map((lx) => (
        <mesh key={lx} position={[lx, 1.05, 0]} castShadow>
          <boxGeometry args={[0.05, 2.1, 0.45]} />
          <meshStandardMaterial color={hover ? cor : MADEIRA_ESCURA} />
        </mesh>
      ))}
      <mesh position={[0, 1.05, -0.21]}>
        <boxGeometry args={[1.4, 2.1, 0.03]} />
        <meshStandardMaterial color="#d9cbb8" />
      </mesh>
      {Array.from({ length: PRAT + 1 }).map((_, i) => (
        <mesh key={i} position={[0, 0.08 + i * 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.36, 0.04, 0.45]} />
          <meshStandardMaterial color={MADEIRA} />
        </mesh>
      ))}
      {/* pastas: uma por documento do setor */}
      {Array.from({ length: pastas }).map((_, i) => {
        const prat = Math.floor(i / POR_PRAT);
        const col = i % POR_PRAT;
        return (
          <mesh key={i} position={[-0.6 + col * 0.105, 0.1 + prat * 0.5 + 0.17, 0.02]} castShadow>
            <boxGeometry args={[0.08, 0.32 + ((i * 7) % 5) * 0.012, 0.3]} />
            <meshStandardMaterial color={i % 3 === 0 ? cor : i % 3 === 1 ? shade(cor, 0.82) : shade(cor, 1.12)} />
          </mesh>
        );
      })}
      <Html position={[0, 2.45, 0]} center pointerEvents="none" distanceFactor={13}>
        <div style={{
          fontFamily: "system-ui", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", padding: "2px 8px",
          borderRadius: 999, background: "rgba(255,255,255,0.92)", color: "#1b1f24", borderBottom: `3px solid ${cor}`,
        }}>
          {setor.nome} · {quantidade}
        </div>
      </Html>
    </group>
  );
}

function shade(hex: string, f: number) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(f);
  return `#${c.getHexString()}`;
}

// ---------- sua mesa ----------

export function MesaRafael({ pendentes, onClick }: { pendentes: number; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  const pilha = Math.min(pendentes, 20);
  const luz = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (luz.current) {
      const m = luz.current.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = pendentes > 0 ? 0.6 + Math.sin(clock.elapsedTime * 3) * 0.4 : 0.1;
    }
  });
  return (
    <group position={[MESA_RAFAEL[0], 0, MESA_RAFAEL[1]]}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = ""; }}>
      <mesh position={[0, 0.76, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, 0.08, 1.2]} />
        <meshStandardMaterial color={hover ? "#d8b48b" : "#b8875a"} />
      </mesh>
      <mesh position={[0, 0.38, -0.5]}>
        <boxGeometry args={[2.9, 0.74, 0.06]} />
        <meshStandardMaterial color="#9a6f49" />
      </mesh>
      {[-1.4, 1.4].map((x) => (
        <mesh key={x} position={[x, 0.38, 0]}>
          <boxGeometry args={[0.08, 0.74, 1.1]} />
          <meshStandardMaterial color="#9a6f49" />
        </mesh>
      ))}
      {/* pilha de demandas aguardando você */}
      {Array.from({ length: pilha }).map((_, i) => (
        <mesh key={i} position={[-0.9 + (i % 2) * 0.03, 0.82 + i * 0.022, -0.1 + (i % 3) * 0.02]}
          rotation-y={(i % 4) * 0.08} castShadow>
          <boxGeometry args={[0.42, 0.018, 0.3]} />
          <meshStandardMaterial color={i % 2 ? "#fbfaf7" : "#f2efe6"} />
        </mesh>
      ))}
      <mesh ref={luz} position={[-0.9, 0.86 + pilha * 0.022, -0.1]}>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshStandardMaterial color="#f0a43a" emissive="#f0a43a" />
      </mesh>
      {/* notebook */}
      <mesh position={[0.6, 0.81, 0.1]}>
        <boxGeometry args={[0.6, 0.02, 0.4]} />
        <meshStandardMaterial color="#c7cbd1" />
      </mesh>
      <mesh position={[0.6, 0.98, -0.1]} rotation-x={-0.25}>
        <boxGeometry args={[0.6, 0.38, 0.02]} />
        <meshStandardMaterial color="#c7cbd1" />
      </mesh>
      <Cadeira posicao={[0, 1.0]} />
      <Html position={[0, 1.7, 0]} center pointerEvents="none">
        <div style={{
          fontFamily: "system-ui", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", padding: "4px 10px",
          borderRadius: 999, background: pendentes > 0 ? "#fdf2e1" : "rgba(255,255,255,0.92)",
          color: pendentes > 0 ? "#9a5b0a" : "#1b1f24", border: "1px solid rgba(0,0,0,0.08)",
        }}>
          Sua mesa · {pendentes} aguardando você
        </div>
      </Html>
    </group>
  );
}
