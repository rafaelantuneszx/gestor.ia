"use client";

// Móveis do escritório. As geometrias são criadas uma vez e compartilhadas por todas as peças.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { acoPreto, aluminio, emissivo, mat, texturaLivros } from "./materiais";

const G = {
  bracoEstrela: new THREE.BoxGeometry(0.045, 0.035, 0.3),
  rodinha: new THREE.SphereGeometry(0.028, 8, 6),
  coluna: new THREE.CylinderGeometry(0.025, 0.03, 0.34, 10),
  assento: new RoundedBoxGeometry(0.5, 0.08, 0.48, 3, 0.03),
  encosto: new RoundedBoxGeometry(0.46, 0.56, 0.06, 3, 0.025),
  hasteEncosto: new THREE.BoxGeometry(0.05, 0.3, 0.03),
  bracoCadeira: new THREE.BoxGeometry(0.03, 0.2, 0.03),
  apoioBraco: new RoundedBoxGeometry(0.06, 0.03, 0.26, 2, 0.012),
  vaso: new THREE.CylinderGeometry(0.26, 0.19, 0.5, 20),
  vasoBaixo: new THREE.CylinderGeometry(0.19, 0.15, 0.36, 16),
  terra: new THREE.CircleGeometry(0.24, 20),
  tronco: new THREE.CylinderGeometry(0.022, 0.032, 1.1, 6),
  copa: new THREE.IcosahedronGeometry(0.3, 1),
  folhaEspada: new THREE.ConeGeometry(0.045, 0.75, 4).scale(1, 1, 0.3),
  base: new THREE.BoxGeometry(1, 1, 1),
};

// ---------- cadeira de escritório ----------
// Referência local: quem senta olha para -z; o encosto fica em +z.
export function CadeiraEscritorio({
  posicao, rotacao = 0, cor = "#2f3640",
}: {
  posicao: [number, number];
  rotacao?: number;
  cor?: string;
}) {
  const tecido = mat(cor, 0.9);
  return (
    <group position={[posicao[0], 0, posicao[1]]} rotation-y={rotacao}>
      {[0, 1, 2, 3, 4].map((k) => (
        <group key={k} rotation-y={(k * Math.PI * 2) / 5}>
          <mesh geometry={G.bracoEstrela} material={acoPreto()} position={[0, 0.07, 0.15]} />
          <mesh geometry={G.rodinha} material={acoPreto()} position={[0, 0.03, 0.29]} />
        </group>
      ))}
      <mesh geometry={G.coluna} material={aluminio()} position={[0, 0.25, 0]} />
      <mesh geometry={G.assento} material={tecido} position={[0, 0.46, 0]} castShadow receiveShadow />
      <mesh geometry={G.hasteEncosto} material={acoPreto()} position={[0, 0.6, 0.25]} />
      <mesh geometry={G.encosto} material={tecido} position={[0, 0.84, 0.26]} rotation-x={0.1} castShadow />
      {[-0.24, 0.24].map((x) => (
        <group key={x}>
          <mesh geometry={G.bracoCadeira} material={acoPreto()} position={[x, 0.58, 0.04]} />
          <mesh geometry={G.apoioBraco} material={mat("#1f2328", 0.8)} position={[x, 0.69, 0.02]} />
        </group>
      ))}
    </group>
  );
}

// ---------- plantas ----------

export function Planta({
  posicao, tipo = "alta", escala = 1, semente = 1,
}: {
  posicao: [number, number];
  tipo?: "alta" | "baixa";
  escala?: number;
  semente?: number;
}) {
  const verdes = ["#3f7a3a", "#4e8a45", "#356b33", "#5b9650"];
  if (tipo === "baixa") {
    return (
      <group position={[posicao[0], 0, posicao[1]]} scale={escala}>
        <mesh geometry={G.vasoBaixo} material={mat("#ece8e1", 0.5)} position={[0, 0.18, 0]} castShadow />
        <mesh geometry={G.terra} material={mat("#3b2a1e", 1)} rotation-x={-Math.PI / 2} position={[0, 0.35, 0]} scale={0.75} />
        {Array.from({ length: 9 }).map((_, i) => {
          const a = (i / 9) * Math.PI * 2 + semente;
          const r = 0.04 + (i % 3) * 0.03;
          return (
            <mesh key={i} geometry={G.folhaEspada} material={mat(verdes[(i + semente) % 4], 0.6)}
              position={[Math.cos(a) * r, 0.35 + 0.33 + (i % 3) * 0.04, Math.sin(a) * r]}
              rotation={[Math.sin(a) * 0.18, a, Math.cos(a) * 0.18]} castShadow />
          );
        })}
      </group>
    );
  }
  const copas: [number, number, number, number][] = [
    [0, 1.55, 0, 1.1], [0.22, 1.3, 0.08, 0.85], [-0.2, 1.35, -0.06, 0.9], [0.05, 1.15, -0.2, 0.75],
    [-0.08, 1.18, 0.2, 0.7], [0.16, 1.72, -0.1, 0.7], [-0.15, 1.7, 0.12, 0.65],
  ];
  return (
    <group position={[posicao[0], 0, posicao[1]]} scale={escala} rotation-y={semente}>
      <mesh geometry={G.vaso} material={mat("#d8d2c8", 0.45)} position={[0, 0.25, 0]} castShadow />
      <mesh geometry={G.terra} material={mat("#3b2a1e", 1)} rotation-x={-Math.PI / 2} position={[0, 0.49, 0]} />
      <mesh geometry={G.tronco} material={mat("#6b4f36", 0.9)} position={[0, 1.0, 0]} castShadow />
      {copas.map(([x, y, z, s], i) => (
        <mesh key={i} geometry={G.copa} material={mat(verdes[(i + semente) % 4], 0.75)}
          position={[x, y, z]} scale={[s, s * 0.85, s]} castShadow />
      ))}
    </group>
  );
}

// ---------- sofá, mesa de centro e tapete ----------
// O sofá olha para +z.
export function Sofa({ posicao, rotacao = 0, cor = "#5b6470" }: { posicao: [number, number]; rotacao?: number; cor?: string }) {
  const tecido = mat(cor, 0.95);
  return (
    <group position={[posicao[0], 0, posicao[1]]} rotation-y={rotacao}>
      <mesh geometry={G.base} material={tecido} position={[0, 0.24, 0]} scale={[2.1, 0.3, 0.88]} castShadow receiveShadow />
      {[-0.5, 0.5].map((x) => (
        <mesh key={x} geometry={G.assento} material={tecido} position={[x, 0.45, 0.06]} scale={[1.9, 1.6, 1.5]} castShadow />
      ))}
      <mesh geometry={G.encosto} material={tecido} position={[0, 0.72, -0.34]} scale={[4.3, 0.95, 3.2]} castShadow />
      {[-1.0, 1.0].map((x) => (
        <mesh key={x} geometry={G.base} material={tecido} position={[x, 0.42, 0]} scale={[0.18, 0.42, 0.88]} castShadow />
      ))}
      {[-0.95, 0.95].flatMap((x) => [-0.35, 0.35].map((z) => (
        <mesh key={`${x}${z}`} geometry={G.base} material={mat("#3a2a1d", 0.6)} position={[x, 0.045, z]} scale={[0.05, 0.09, 0.05]} />
      )))}
    </group>
  );
}

export function MesaCentro({ posicao }: { posicao: [number, number] }) {
  return (
    <group position={[posicao[0], 0, posicao[1]]}>
      <mesh geometry={G.base} material={mat("#3b2f28", 0.4)} position={[0, 0.4, 0]} scale={[0.6, 0.035, 1.1]} castShadow receiveShadow />
      <mesh geometry={G.base} material={acoPreto()} position={[0, 0.2, 0]} scale={[0.5, 0.38, 0.03]} />
      <mesh geometry={G.base} material={mat("#e7e2d9", 0.6)} position={[0.05, 0.43, 0.2]} scale={[0.22, 0.03, 0.3]} rotation-y={0.2} />
    </group>
  );
}

export function Tapete({ posicao, tamanho, cor, borda }: { posicao: [number, number]; tamanho: [number, number]; cor: string; borda: string }) {
  return (
    <group position={[posicao[0], 0, posicao[1]]}>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.006, 0]} receiveShadow material={mat(borda, 1)}>
        <planeGeometry args={tamanho} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.008, 0]} receiveShadow material={mat(cor, 1)}>
        <planeGeometry args={[tamanho[0] - 0.24, tamanho[1] - 0.24]} />
      </mesh>
    </group>
  );
}

// ---------- estante de livros (olha para +z) ----------
export function EstanteLivros({ posicao, largura = 2, rotacao = 0 }: { posicao: [number, number]; largura?: number; rotacao?: number }) {
  const madeira = mat("#4a3426", 0.55);
  const livros = texturaLivros();
  const prateleiras = 5;
  const altura = 2.2;
  return (
    <group position={[posicao[0], 0, posicao[1]]} rotation-y={rotacao}>
      {[-largura / 2, largura / 2].map((x) => (
        <mesh key={x} geometry={G.base} material={madeira} position={[x, altura / 2, 0]} scale={[0.04, altura, 0.36]} castShadow />
      ))}
      <mesh geometry={G.base} material={mat("#3a291e", 0.7)} position={[0, altura / 2, -0.17]} scale={[largura, altura, 0.02]} />
      {Array.from({ length: prateleiras + 1 }).map((_, i) => (
        <mesh key={i} geometry={G.base} material={madeira} position={[0, 0.06 + i * (altura - 0.08) / prateleiras, 0]}
          scale={[largura, 0.035, 0.36]} castShadow receiveShadow />
      ))}
      {Array.from({ length: prateleiras }).map((_, i) => {
        const y = 0.08 + i * (altura - 0.08) / prateleiras;
        const comp = largura * (i % 2 ? 0.7 : 0.85);
        return (
          <group key={i} position={[(i % 2 ? 0.12 : -0.05) * largura, y + 0.15, 0]}>
            <mesh geometry={G.base} material={mat("#3f3a36", 0.8)} position={[0, 0, -0.02]} scale={[comp, 0.3, 0.24]} />
            <mesh position={[0, 0, 0.101]}>
              <planeGeometry args={[comp, 0.3]} />
              <meshStandardMaterial map={livros} roughness={0.8} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// ---------- luminária de mesa ----------
export function Luminaria({ posicao, rotacao = 0 }: { posicao: [number, number, number]; rotacao?: number }) {
  return (
    <group position={posicao} rotation-y={rotacao}>
      <mesh geometry={G.base} material={acoPreto()} position={[0, 0.01, 0]} scale={[0.14, 0.02, 0.14]} />
      <mesh geometry={G.base} material={acoPreto()} position={[0, 0.2, -0.04]} rotation-x={0.25} scale={[0.02, 0.4, 0.02]} />
      <mesh geometry={G.base} material={acoPreto()} position={[0, 0.39, 0.06]} rotation-x={-1.1} scale={[0.02, 0.26, 0.02]} />
      <mesh position={[0, 0.34, 0.17]} rotation-x={0.35} material={acoPreto()}>
        <coneGeometry args={[0.07, 0.11, 16, 1, true]} />
      </mesh>
      <mesh position={[0, 0.31, 0.18]} rotation-x={-Math.PI / 2 + 0.35} material={emissivo("#fff1d0", 1.6)}>
        <circleGeometry args={[0.055, 16]} />
      </mesh>
    </group>
  );
}

export const geometriaCaixa = G.base;
