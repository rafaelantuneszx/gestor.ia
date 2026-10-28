"use client";

// Móveis do escritório. Os repetidos (cadeiras, mesas em L, plantas, sofás, luminárias do forro) são kits
// mesclados e desenhados com instâncias (ver kit.tsx); os únicos são componentes comuns.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
  acoPreto, aluminio, brancoFosco, emissivo, madeiraClara, mat, materialSombra, texturaLivros,
} from "./materiais";
import { montarKit, type Parte } from "./kit";

const G = {
  caixa: new THREE.BoxGeometry(1, 1, 1),
  cil: new THREE.CylinderGeometry(0.5, 0.5, 1, 16),
  cilBaixo: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
  esfera: new THREE.SphereGeometry(0.5, 10, 8),
  copa: new THREE.IcosahedronGeometry(0.3, 1),
  folhaEspada: new THREE.ConeGeometry(0.045, 0.75, 4).scale(1, 1, 0.3),
  folhaLarga: new THREE.SphereGeometry(0.5, 8, 6).scale(1, 0.12, 0.45),
  vaso: new THREE.CylinderGeometry(0.26, 0.19, 0.5, 20),
  vasoBaixo: new THREE.CylinderGeometry(0.19, 0.15, 0.36, 16),
  vasoAlto: new THREE.CylinderGeometry(0.2, 0.17, 0.75, 4, 1).rotateY(Math.PI / 4),
  terra: new THREE.CircleGeometry(0.24, 20).rotateX(-Math.PI / 2),
  tronco: new THREE.CylinderGeometry(0.022, 0.032, 1.1, 6),
  rodinha: new THREE.SphereGeometry(0.028, 8, 6),
  assento: new RoundedBoxGeometry(0.5, 0.08, 0.48, 3, 0.03),
  encosto: new RoundedBoxGeometry(0.46, 0.6, 0.06, 3, 0.025),
  cabeceira: new RoundedBoxGeometry(0.3, 0.12, 0.05, 2, 0.02),
  apoio: new RoundedBoxGeometry(0.06, 0.03, 0.26, 2, 0.012),
  tampo: new RoundedBoxGeometry(1, 1, 1, 2, 0.04),
  almofada: new RoundedBoxGeometry(1, 1, 1, 3, 0.06),
  plano: new THREE.PlaneGeometry(1, 1),
  planoChao: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
  planoTeto: new THREE.PlaneGeometry(1, 1).rotateX(Math.PI / 2),
  cone: new THREE.ConeGeometry(0.5, 1, 16, 1, true),
};
export const geometriaCaixa = G.caixa;

// Tecido branco: as instâncias pintam a cor de cada cadeira/sofá por cima.
let tecido: THREE.MeshStandardMaterial | null = null;
export function tecidoColorivel() {
  tecido ??= new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.93 });
  return tecido;
}
const plastico = () => mat("#24272c", 0.5);

// ---------- cadeira ergonômica (quem senta olha para -z; o encosto fica em +z) ----------
function partesCadeira(): Parte[] {
  const p: Parte[] = [];
  for (let k = 0; k < 5; k++) {
    const a = (k * Math.PI * 2) / 5;
    p.push({ geo: G.caixa, mat: plastico(), p: [Math.sin(a) * 0.15, 0.07, Math.cos(a) * 0.15], r: [0, a, 0], s: [0.045, 0.035, 0.3] });
    p.push({ geo: G.rodinha, mat: acoPreto(), p: [Math.sin(a) * 0.29, 0.03, Math.cos(a) * 0.29] });
  }
  p.push({ geo: G.cil, mat: aluminio(), p: [0, 0.25, 0], s: [0.055, 0.34, 0.055] });
  p.push({ geo: G.caixa, mat: plastico(), p: [0, 0.41, 0.02], s: [0.44, 0.03, 0.42] });
  p.push({ geo: G.assento, mat: tecidoColorivel(), p: [0, 0.46, 0], sombra: true });
  p.push({ geo: G.caixa, mat: plastico(), p: [0, 0.6, 0.27], r: [0.1, 0, 0], s: [0.06, 0.32, 0.03] });
  p.push({ geo: G.encosto, mat: tecidoColorivel(), p: [0, 0.88, 0.28], r: [0.12, 0, 0], sombra: true });
  p.push({ geo: G.cabeceira, mat: tecidoColorivel(), p: [0, 1.25, 0.33], r: [0.18, 0, 0] });
  p.push({ geo: G.caixa, mat: plastico(), p: [0, 1.17, 0.32], r: [0.15, 0, 0], s: [0.04, 0.1, 0.02] });
  for (const x of [-0.25, 0.25]) {
    p.push({ geo: G.caixa, mat: plastico(), p: [x, 0.57, 0.05], s: [0.03, 0.2, 0.03] });
    p.push({ geo: G.apoio, mat: plastico(), p: [x, 0.68, 0.03] });
  }
  return p;
}

// ---------- mesa em L com monitor, notebook e acessórios (o agente fica em +z, olhando para -z) ----------
function partesMesaL(): Parte[] {
  const madeira = mat("#d6bf9c", 0.45);
  const p: Parte[] = [
    { geo: G.tampo, mat: madeira, p: [0, 0.74, 0], s: [1.8, 0.035, 0.8], sombra: true },
    { geo: G.tampo, mat: madeira, p: [-0.625, 0.74, 0.775], s: [0.55, 0.035, 0.75], sombra: true },
    // pés em painel branco, gaveteiro sob o retorno e painel frontal
    { geo: G.caixa, mat: brancoFosco(), p: [0.87, 0.36, 0], s: [0.04, 0.72, 0.72], sombra: true },
    { geo: G.caixa, mat: brancoFosco(), p: [-0.625, 0.36, 1.12], s: [0.5, 0.72, 0.04], sombra: true },
    { geo: G.caixa, mat: brancoFosco(), p: [-0.64, 0.3, 0.2], s: [0.46, 0.6, 0.5], sombra: true },
    { geo: G.caixa, mat: mat("#9aa0a6", 0.6, 0.3), p: [0.1, 0.5, -0.38], s: [1.5, 0.32, 0.02] },
    // monitor (moldura e pé; a tela é outra malha, com o terminal)
    { geo: G.caixa, mat: mat("#111214", 0.35), p: [0, 1.26, -0.24], s: [1.0, 0.6, 0.025], sombra: true },
    { geo: G.caixa, mat: aluminio(), p: [0, 0.96, -0.28], s: [0.05, 0.36, 0.025] },
    { geo: G.caixa, mat: aluminio(), p: [0, 0.765, -0.25], s: [0.24, 0.012, 0.17] },
    // teclado, mouse, papéis
    { geo: G.caixa, mat: mat("#e2e4e7", 0.6), p: [0.05, 0.765, 0.2], s: [0.44, 0.018, 0.14] },
    { geo: G.caixa, mat: plastico(), p: [0.38, 0.765, 0.21], s: [0.06, 0.025, 0.1] },
    { geo: G.caixa, mat: mat("#fbfaf7", 0.9), p: [0.55, 0.759, -0.02], r: [0, 0.25, 0], s: [0.21, 0.004, 0.29] },
    // notebook aberto no retorno, virado para o agente
    { geo: G.caixa, mat: mat("#c7cbd1", 0.3, 0.6), p: [-0.62, 0.765, 0.78], r: [0, Math.PI / 2 + 0.3, 0], s: [0.34, 0.015, 0.24] },
    { geo: G.caixa, mat: mat("#c7cbd1", 0.3, 0.6), p: [-0.74, 0.88, 0.74], r: [0, Math.PI / 2 + 0.3, -0.25], s: [0.34, 0.23, 0.012] },
    { geo: G.plano, mat: emissivo("#8fb7f0", 0.55), p: [-0.732, 0.88, 0.743], r: [0, Math.PI / 2 + 0.3, -0.25], s: [0.31, 0.2, 1] },
    // caneca e vasinho
    { geo: G.cil, mat: mat("#f5f5f4", 0.3), p: [0.7, 0.805, 0.15], s: [0.08, 0.1, 0.08] },
    { geo: G.cil, mat: mat("#ece8e1", 0.5), p: [0.75, 0.81, -0.28], s: [0.12, 0.1, 0.12] },
    { geo: G.esfera, mat: mat("#4e8a45", 0.7), p: [0.75, 0.9, -0.28], s: [0.16, 0.12, 0.16] },
    // luminária articulada
    { geo: G.caixa, mat: acoPreto(), p: [-0.78, 0.77, -0.28], s: [0.14, 0.02, 0.14] },
    { geo: G.caixa, mat: acoPreto(), p: [-0.78, 0.96, -0.32], r: [0.25, 0, 0], s: [0.02, 0.4, 0.02] },
    { geo: G.caixa, mat: acoPreto(), p: [-0.78, 1.15, -0.22], r: [-1.1, 0, 0], s: [0.02, 0.26, 0.02] },
    { geo: G.cone, mat: acoPreto(), p: [-0.78, 1.1, -0.11], r: [0.35, 0, 0], s: [0.14, 0.11, 0.14] },
    { geo: G.plano, mat: emissivo("#fff1d0", 1.6), p: [-0.78, 1.07, -0.1], r: [-Math.PI / 2 + 0.35, 0, 0], s: [0.1, 0.1, 1] },
  ];
  return p;
}

// ---------- plantas ----------
const verdes = ["#3f7a3a", "#4e8a45", "#356b33", "#5b9650"];
function partesPlantaAlta(): Parte[] {
  const copas: [number, number, number, number][] = [
    [0, 1.55, 0, 1.1], [0.22, 1.3, 0.08, 0.85], [-0.2, 1.35, -0.06, 0.9], [0.05, 1.15, -0.2, 0.75],
    [-0.08, 1.18, 0.2, 0.7], [0.16, 1.72, -0.1, 0.7], [-0.15, 1.7, 0.12, 0.65],
  ];
  return [
    { geo: G.vaso, mat: mat("#d8d2c8", 0.45), p: [0, 0.25, 0], sombra: true },
    { geo: G.terra, mat: mat("#3b2a1e", 1), p: [0, 0.49, 0] },
    { geo: G.tronco, mat: mat("#6b4f36", 0.9), p: [0, 1.0, 0] },
    ...copas.map(([x, y, z, s], i) => ({ geo: G.copa, mat: mat(verdes[i % 4], 0.75), p: [x, y, z] as [number, number, number], s: [s, s * 0.85, s] as [number, number, number], sombra: true })),
  ];
}
function partesPlantaBaixa(): Parte[] {
  const p: Parte[] = [
    { geo: G.vasoBaixo, mat: mat("#ece8e1", 0.5), p: [0, 0.18, 0], sombra: true },
    { geo: G.terra, mat: mat("#3b2a1e", 1), p: [0, 0.35, 0], s: [0.75, 1, 0.75] },
  ];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const r = 0.04 + (i % 3) * 0.03;
    p.push({ geo: G.folhaEspada, mat: mat(verdes[i % 4], 0.6), p: [Math.cos(a) * r, 0.68 + (i % 3) * 0.04, Math.sin(a) * r], r: [Math.sin(a) * 0.18, a, Math.cos(a) * 0.18], sombra: true });
  }
  return p;
}
// Costela-de-adão num vaso alto quadrado.
function partesPlantaLarga(): Parte[] {
  const p: Parte[] = [
    { geo: G.vasoAlto, mat: mat("#2f3236", 0.5), p: [0, 0.375, 0], sombra: true },
    { geo: G.terra, mat: mat("#3b2a1e", 1), p: [0, 0.75, 0], s: [0.7, 1, 0.7] },
  ];
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + (i % 2) * 0.3;
    const alt = 0.95 + (i % 4) * 0.18;
    const dist = 0.18 + (i % 3) * 0.08;
    p.push({ geo: G.caixa, mat: mat("#5c7a3e", 0.8), p: [Math.cos(a) * dist * 0.5, (0.75 + alt) / 2, Math.sin(a) * dist * 0.5], r: [Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35], s: [0.012, alt - 0.75, 0.012] });
    p.push({ geo: G.folhaLarga, mat: mat(i % 2 ? "#2f6b34" : "#3d7d3b", 0.65), p: [Math.cos(a) * dist, alt, Math.sin(a) * dist], r: [0.4 * Math.sin(a), -a, 0.4 * Math.cos(a)], s: [0.42, 0.42, 0.42], sombra: true });
  }
  return p;
}

// ---------- sofá (olha para +z) ----------
function partesSofa(): Parte[] {
  const t = tecidoColorivel();
  return [
    { geo: G.almofada, mat: t, p: [0, 0.24, 0], s: [2.1, 0.3, 0.88], sombra: true },
    { geo: G.almofada, mat: t, p: [-0.5, 0.45, 0.06], s: [0.96, 0.14, 0.72], sombra: true },
    { geo: G.almofada, mat: t, p: [0.5, 0.45, 0.06], s: [0.96, 0.14, 0.72], sombra: true },
    { geo: G.almofada, mat: t, p: [0, 0.68, -0.34], s: [2.0, 0.55, 0.2], sombra: true },
    { geo: G.almofada, mat: t, p: [-1.0, 0.42, 0], s: [0.18, 0.42, 0.88], sombra: true },
    { geo: G.almofada, mat: t, p: [1.0, 0.42, 0], s: [0.18, 0.42, 0.88], sombra: true },
    ...[-0.95, 0.95].flatMap((x) => [-0.35, 0.35].map((z) => ({ geo: G.caixa, mat: mat("#3a2a1d", 0.6), p: [x, 0.045, z] as [number, number, number], s: [0.05, 0.09, 0.05] as [number, number, number] }))),
  ];
}

// ---------- poltrona (olha para +z) ----------
function partesPoltrona(): Parte[] {
  const t = tecidoColorivel();
  return [
    { geo: G.almofada, mat: t, p: [0, 0.3, 0], s: [0.78, 0.22, 0.74], sombra: true },
    { geo: G.almofada, mat: t, p: [0, 0.62, -0.3], s: [0.78, 0.5, 0.16], r: [-0.12, 0, 0], sombra: true },
    { geo: G.almofada, mat: t, p: [-0.36, 0.48, 0], s: [0.1, 0.22, 0.7] },
    { geo: G.almofada, mat: t, p: [0.36, 0.48, 0], s: [0.1, 0.22, 0.7] },
    ...[-0.32, 0.32].flatMap((x) => [-0.28, 0.28].map((z) => ({ geo: G.cil, mat: mat("#3a2a1d", 0.6), p: [x, 0.09, z] as [number, number, number], s: [0.04, 0.18, 0.04] as [number, number, number] }))),
  ];
}

// ---------- luminária de embutir no forro (vista de baixo; de cima ela some junto com o forro) ----------
function partesLuminaria(): Parte[] {
  return [
    { geo: G.planoTeto, mat: emissivo("#fff8ea", 1.25), p: [0, -0.005, 0], s: [1.15, 1, 0.28] },
    { geo: G.planoTeto, mat: mat("#d9d7d2", 0.4, 0.4), p: [0, -0.002, 0], s: [1.25, 1, 0.38] },
  ];
}

// Pendente linear (sala de reunião, sua sala): visível também de cima.
function partesPendente(): Parte[] {
  return [
    { geo: G.caixa, mat: acoPreto(), p: [0, 2.32, 0], s: [1.6, 0.05, 0.08] },
    { geo: G.plano, mat: emissivo("#fff3dc", 1.8), p: [0, 2.294, 0], r: [Math.PI / 2, 0, 0], s: [1.55, 0.05, 1] },
    { geo: G.caixa, mat: acoPreto(), p: [-0.7, 2.62, 0], s: [0.008, 0.56, 0.008] },
    { geo: G.caixa, mat: acoPreto(), p: [0.7, 2.62, 0], s: [0.008, 0.56, 0.008] },
  ];
}

function partesSombra(): Parte[] {
  return [{ geo: G.planoChao, mat: materialSombra(), p: [0, 0.006, 0] }];
}

// Kits prontos (criados uma vez, na primeira vez que alguém pede).
const cache = new Map<string, ReturnType<typeof montarKit>>();
const kit = (k: string, f: () => Parte[]) => {
  let v = cache.get(k);
  if (!v) { v = montarKit(f()); cache.set(k, v); }
  return v;
};
export const KITS = {
  cadeira: () => kit("cadeira", partesCadeira),
  mesaL: () => kit("mesaL", partesMesaL),
  plantaAlta: () => kit("plantaAlta", partesPlantaAlta),
  plantaBaixa: () => kit("plantaBaixa", partesPlantaBaixa),
  plantaLarga: () => kit("plantaLarga", partesPlantaLarga),
  sofa: () => kit("sofa", partesSofa),
  poltrona: () => kit("poltrona", partesPoltrona),
  luminaria: () => kit("luminaria", partesLuminaria),
  pendente: () => kit("pendente", partesPendente),
  sombra: () => kit("sombra", partesSombra),
};

// ---------- peças únicas ----------

export function MesaCentro({ posicao, tamanho = [0.6, 1.1] }: { posicao: [number, number]; tamanho?: [number, number] }) {
  return (
    <group position={[posicao[0], 0, posicao[1]]}>
      <mesh geometry={G.tampo} material={mat("#3b2f28", 0.35)} position={[0, 0.4, 0]} scale={[tamanho[0], 0.035, tamanho[1]]} castShadow receiveShadow />
      <mesh geometry={G.caixa} material={acoPreto()} position={[0, 0.2, 0]} scale={[tamanho[0] - 0.1, 0.38, 0.03]} />
      <mesh geometry={G.caixa} material={mat("#e7e2d9", 0.6)} position={[0.05, 0.43, 0.2]} scale={[0.22, 0.03, 0.3]} rotation-y={0.2} />
    </group>
  );
}

export function Tapete({ posicao, tamanho, cor, borda }: { posicao: [number, number]; tamanho: [number, number]; cor: string; borda: string }) {
  return (
    <group position={[posicao[0], 0, posicao[1]]}>
      <mesh geometry={G.planoChao} material={mat(borda, 1)} position={[0, 0.006, 0]} scale={[tamanho[0], 1, tamanho[1]]} receiveShadow />
      <mesh geometry={G.planoChao} material={mat(cor, 1)} position={[0, 0.008, 0]} scale={[tamanho[0] - 0.24, 1, tamanho[1] - 0.24]} receiveShadow />
    </group>
  );
}

// Estante de livros (olha para +z).
export function EstanteLivros({ posicao, largura = 2, rotacao = 0, altura = 2.2 }: { posicao: [number, number]; largura?: number; rotacao?: number; altura?: number }) {
  const madeira = mat("#4a3426", 0.55);
  const livros = texturaLivros();
  const prateleiras = 5;
  return (
    <group position={[posicao[0], 0, posicao[1]]} rotation-y={rotacao}>
      {[-largura / 2, largura / 2].map((x) => (
        <mesh key={x} geometry={G.caixa} material={madeira} position={[x, altura / 2, 0]} scale={[0.04, altura, 0.36]} castShadow />
      ))}
      <mesh geometry={G.caixa} material={mat("#3a291e", 0.7)} position={[0, altura / 2, -0.17]} scale={[largura, altura, 0.02]} />
      {Array.from({ length: prateleiras + 1 }).map((_, i) => (
        <mesh key={i} geometry={G.caixa} material={madeira} position={[0, 0.06 + i * (altura - 0.08) / prateleiras, 0]}
          scale={[largura, 0.035, 0.36]} castShadow receiveShadow />
      ))}
      {Array.from({ length: prateleiras }).map((_, i) => {
        const y = 0.08 + i * (altura - 0.08) / prateleiras;
        const comp = largura * (i % 2 ? 0.7 : 0.85);
        return (
          <group key={i} position={[(i % 2 ? 0.12 : -0.05) * largura, y + 0.15, 0]}>
            <mesh geometry={G.caixa} material={mat("#3f3a36", 0.8)} position={[0, 0, -0.02]} scale={[comp, 0.3, 0.24]} />
            <mesh geometry={G.plano} position={[0, 0, 0.101]} scale={[comp, 0.3, 1]}>
              <meshStandardMaterial map={livros} roughness={0.8} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export function Quadro({ posicao, rotacao = 0, largura = 1.2, altura = 0.9, mapa, y = 1.6 }: {
  posicao: [number, number];
  rotacao?: number;
  largura?: number;
  altura?: number;
  mapa: THREE.Texture;
  y?: number;
}) {
  return (
    <group position={[posicao[0], y, posicao[1]]} rotation-y={rotacao}>
      <mesh geometry={G.caixa} material={mat("#1d1f22", 0.5)} scale={[largura + 0.06, altura + 0.06, 0.03]} castShadow />
      <mesh geometry={G.plano} position={[0, 0, 0.0165]} scale={[largura, altura, 1]}>
        <meshStandardMaterial map={mapa} roughness={0.75} />
      </mesh>
    </group>
  );
}

export function geometriaPlano() {
  return G.plano;
}
export function madeira() {
  return madeiraClara();
}
