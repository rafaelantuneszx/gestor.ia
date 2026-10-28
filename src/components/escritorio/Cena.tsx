"use client";

// Mobília e detalhes de cada sala, a tela (terminal) de cada agente, o arquivo, a sua sala e a sala de reunião.
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
  ARQUIVO_Z, CADEIRA_RAFAEL, ESPINHA, MESAS, MESA_RAFAEL, MESA_REUNIAO, SALA, SETOR_COR, TV,
  ASSENTOS_REUNIAO, cadeira, estante,
  type EstadoAgente, type SetorInfo,
} from "@/lib/escritorio/modelo";
import { desenharTerminal, TELA_H, TELA_W } from "./terminal";
import { desenharTV, TV_H, TV_W, type PainelTV } from "./tv";
import { acoPreto, aluminio, brancoFosco, emissivo, mat, texturaArte, texturaLogoRecepcao, texturaQuadro, vidro } from "./materiais";
import { Caixa } from "./Predio";
import { Lote, type Item } from "./kit";
import { EstanteLivros, KITS, MesaCentro, Quadro, Tapete, geometriaPlano as plano, tecidoColorivel } from "./Moveis";

const TAMPO_REUNIAO = new RoundedBoxGeometry(6.4, 0.06, 1.6, 4, 0.03);
const TAMPO_RAFAEL = new RoundedBoxGeometry(2.8, 0.06, 1.05, 3, 0.025);
const BALCAO = new RoundedBoxGeometry(4.2, 1.1, 0.8, 4, 0.06);
const CIL = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
const ALT = 2.75; // parede do logo da recepção

// ---------- mobília repetida (instanciada) ----------
export const Mobilia = memo(function Mobilia() {
  const d = useMemo(() => {
    const cadeiras: Item[] = [];
    const mesas: Item[] = [];
    const sombras: Item[] = [];
    for (const id of Object.keys(MESAS)) {
      const [x, z] = MESAS[id];
      const [cx, cz] = cadeira(id);
      mesas.push({ x, z });
      cadeiras.push({ x: cx, z: cz, r: 0, cor: "#2f3a4a" });
      sombras.push({ x: x - 0.1, z: z + 0.35, s: [2.4, 1, 1.9] });
    }
    // sala de reunião
    const [rx, rz] = MESA_REUNIAO;
    for (const a of ASSENTOS_REUNIAO) cadeiras.push({ x: a.p[0], z: a.p[1], r: a.rotacao + Math.PI, cor: "#2b3340" });
    sombras.push({ x: rx, z: rz, s: [7.6, 1, 3.2] });
    // sua sala: a sua cadeira (de frente para nós) e duas de visita
    cadeiras.push({ x: CADEIRA_RAFAEL[0], z: CADEIRA_RAFAEL[1], r: Math.PI, cor: "#1a1d22", s: 1.08 });
    cadeiras.push({ x: MESA_RAFAEL[0] - 0.7, z: MESA_RAFAEL[1] + 1.15, r: 0, cor: "#7a5a40" });
    cadeiras.push({ x: MESA_RAFAEL[0] + 0.7, z: MESA_RAFAEL[1] + 1.15, r: 0, cor: "#7a5a40" });
    sombras.push({ x: MESA_RAFAEL[0], z: MESA_RAFAEL[1], s: [3.6, 1, 2.2] });
    // Direção: mesa redonda; Financeiro: mesinha; arquivo: consulta; copa
    for (const [x, z, r] of [[-21.5 - 0.95, -11, Math.PI / 2], [-21.5 + 0.95, -11, -Math.PI / 2], [-21.5, -11 + 0.95, 0]] as const) {
      cadeiras.push({ x, z, r: r + Math.PI, cor: "#5b4b3f" });
    }
    for (const [x, z, r] of [[7 - 0.9, -10.8, Math.PI / 2], [7 + 0.9, -10.8, -Math.PI / 2]] as const) cadeiras.push({ x, z, r: r + Math.PI, cor: "#285e4f" });
    cadeiras.push({ x: 12.4, z: 3.35, r: 0, cor: "#4b5563" });
    cadeiras.push({ x: 13.8, z: 3.35, r: 0, cor: "#4b5563" });
    for (const [x, z, r] of [[21.5, 1.1, Math.PI], [21.5, 3.1, 0], [20.5, 2.1, Math.PI / 2], [22.5, 2.1, -Math.PI / 2]] as const) {
      cadeiras.push({ x, z, r: r + Math.PI, cor: "#c2410c", s: 0.92 });
    }

    const plantasAltas: Item[] = [
      [-25.4, -18.4], [-14.6, -18.4], [-13.4, -8.6], [0.6, -8.6], [10.4, -8.6], [25.4, -18.4], [-25.4, -3.4], [-13.4, 5.4],
      [2.4, -3.4], [16.4, 5.4], [25.4, 5.4], [-10.6, 16.4], [25.4, 16.4], [-9.4, 10.6],
    ].map(([x, z], i) => ({ x, z, r: i * 1.7, s: 0.9 + (i % 3) * 0.08 }));
    const plantasLargas: Item[] = [
      [-13.3, -18.3], [14.6, -18.3], [-11.4, -3.3], [3.6, -3.4], [6.4, 5.4], [17.6, -3.4], [-25.3, 10.6], [10.2, 16.3], [3.2, 10.7],
    ].map(([x, z], i) => ({ x, z, r: i * 2.3 }));
    const plantasBaixas: Item[] = [
      [-25.6, -8.6], [25.6, -8.6], [-25.6, 9.6], [25.6, 9.6], [-6.6, 9.6], [12.6, 9.6], [-18.4, 5.4], [-12.6, 5.4], [-14.4, 10.6],
    ].map(([x, z], i) => ({ x, z, r: i, s: 0.95 }));
    for (const p of [...plantasAltas, ...plantasLargas]) sombras.push({ x: p.x, z: p.z, s: [1.1, 1, 1.1] });

    const sofas: Item[] = [
      { x: 17, z: 12.0, r: 0, cor: "#4a5568" },
      { x: 17, z: 15.9, r: Math.PI, cor: "#4a5568" },
      { x: -25.3, z: -11, r: Math.PI / 2, cor: "#6b5b4d" },
      { x: -25.2, z: 13.8, r: Math.PI / 2, cor: "#5a4636" },
    ];
    const poltronas: Item[] = [
      { x: 14.6, z: 13.95, r: Math.PI / 2, cor: "#b45309" },
      { x: 19.4, z: 13.95, r: -Math.PI / 2, cor: "#b45309" },
      { x: -22.9, z: 12.7, r: -Math.PI / 2 - 0.4, cor: "#7c5a3a" },
    ];
    for (const s of sofas) sombras.push({ x: s.x, z: s.z, s: Math.abs(Math.sin(s.r ?? 0)) > 0.5 ? [1.4, 1, 2.6] : [2.6, 1, 1.4] });
    for (const s of poltronas) sombras.push({ x: s.x, z: s.z, s: [1.2, 1, 1.2] });
    const pendentes: Item[] = [
      { x: MESA_REUNIAO[0] - 1.6, z: MESA_REUNIAO[1] }, { x: MESA_REUNIAO[0] + 1.6, z: MESA_REUNIAO[1] },
      { x: MESA_RAFAEL[0], z: MESA_RAFAEL[1] }, { x: -1, z: 13.4 }, { x: 17, z: 13.95 },
    ];
    return { cadeiras, mesas, sombras, plantasAltas, plantasLargas, plantasBaixas, sofas, poltronas, pendentes };
  }, []);
  return (
    <group>
      <Lote kit={KITS.mesaL()} itens={d.mesas} />
      <Lote kit={KITS.cadeira()} itens={d.cadeiras} colorir={tecidoColorivel()} />
      <Lote kit={KITS.plantaAlta()} itens={d.plantasAltas} />
      <Lote kit={KITS.plantaLarga()} itens={d.plantasLargas} />
      <Lote kit={KITS.plantaBaixa()} itens={d.plantasBaixas} />
      <Lote kit={KITS.sofa()} itens={d.sofas} colorir={tecidoColorivel()} />
      <Lote kit={KITS.poltrona()} itens={d.poltronas} colorir={tecidoColorivel()} />
      <Lote kit={KITS.pendente()} itens={d.pendentes} />
      <Lote kit={KITS.sombra()} itens={d.sombras} />
    </group>
  );
});

// ---------- detalhes vivos ----------

// Relógio de parede com ponteiros de verdade (hora de Brasília).
function Relogio({ p, rot = 0, raio = 0.22 }: { p: [number, number, number]; rot?: number; raio?: number }) {
  const h = useRef<THREE.Mesh>(null);
  const m = useRef<THREE.Mesh>(null);
  const s = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const agora = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const seg = agora.getSeconds();
    const min = agora.getMinutes() + seg / 60;
    const hr = (agora.getHours() % 12) + min / 60;
    if (h.current) h.current.rotation.z = -(hr / 12) * Math.PI * 2;
    if (m.current) m.current.rotation.z = -(min / 60) * Math.PI * 2;
    if (s.current) s.current.rotation.z = -(seg / 60) * Math.PI * 2;
  });
  return (
    <group position={p} rotation-y={rot}>
      <mesh geometry={CIL} material={mat("#1d1f22", 0.4)} rotation-x={Math.PI / 2} scale={[raio * 2.1, 0.04, raio * 2.1]} />
      <mesh geometry={CIL} material={mat("#fafaf9", 0.6)} rotation-x={Math.PI / 2} position={[0, 0, 0.021]} scale={[raio * 1.9, 0.002, raio * 1.9]} />
      {Array.from({ length: 12 }).map((_, i) => (
        <mesh key={i} geometry={plano()} material={mat("#1d1f22", 0.5)} rotation-z={(i / 12) * Math.PI * 2}
          position={[Math.sin((i / 12) * Math.PI * 2) * raio * 0.8, Math.cos((i / 12) * Math.PI * 2) * raio * 0.8, 0.024]} scale={[0.012, i % 3 ? 0.03 : 0.05, 1]} />
      ))}
      <group position={[0, 0, 0.027]}>
        <mesh ref={h}><mesh geometry={plano()} material={mat("#1d1f22", 0.5)} position={[0, raio * 0.25, 0]} scale={[0.018, raio * 0.5, 1]} /></mesh>
        <mesh ref={m} position={[0, 0, 0.002]}><mesh geometry={plano()} material={mat("#1d1f22", 0.5)} position={[0, raio * 0.36, 0]} scale={[0.012, raio * 0.72, 1]} /></mesh>
        <mesh ref={s} position={[0, 0, 0.004]}><mesh geometry={plano()} material={mat("#dc2626", 0.5)} position={[0, raio * 0.36, 0]} scale={[0.005, raio * 0.8, 1]} /></mesh>
      </group>
    </group>
  );
}

// Rack de servidores com luzes piscando (Sistemas).
function Rack({ x, z }: { x: number; z: number }) {
  const luzes = useMemo(() => [
    new THREE.MeshBasicMaterial({ color: "#22c55e", toneMapped: false }),
    new THREE.MeshBasicMaterial({ color: "#38bdf8", toneMapped: false }),
    new THREE.MeshBasicMaterial({ color: "#f59e0b", toneMapped: false }),
  ], []);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    luzes.forEach((m, i) => { m.visible = Math.sin(t.current * (5 + i * 3.1) + i) > -0.2; });
  });
  return (
    <group position={[x, 0, z]}>
      <Caixa p={[0, 1.0, 0]} s={[0.66, 2.0, 1.0]} m={mat("#1b1d21", 0.4, 0.4)} sombra recebe />
      <Caixa p={[0, 1.0, 0.503]} s={[0.6, 1.9, 0.01]} m={mat("#2a2e35", 0.3, 0.6)} />
      {Array.from({ length: 9 }).map((_, i) => (
        <group key={i} position={[0, 0.22 + i * 0.2, 0.51]}>
          <Caixa p={[0, 0, 0]} s={[0.54, 0.14, 0.01]} m={mat("#0f1115", 0.5)} />
          {[0, 1, 2, 3].map((k) => (
            <mesh key={k} geometry={plano()} material={luzes[(i + k) % 3]} position={[-0.22 + k * 0.035, 0.03, 0.007]} scale={[0.014, 0.014, 1]} />
          ))}
        </group>
      ))}
    </group>
  );
}

// Mesa redonda com tampo claro e base preta.
function MesaRedonda({ x, z, raio = 0.55, alt = 0.74 }: { x: number; z: number; raio?: number; alt?: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh geometry={CIL} material={mat("#efe9df", 0.35)} position={[0, alt, 0]} scale={[raio * 2, 0.04, raio * 2]} castShadow receiveShadow />
      <Caixa p={[0, alt / 2, 0]} s={[0.07, alt, 0.07]} m={acoPreto()} />
      <mesh geometry={CIL} material={acoPreto()} position={[0, 0.015, 0]} scale={[raio * 1.0, 0.03, raio * 1.0]} />
    </group>
  );
}

// ---------- salas de trabalho ----------
export const DetalhesSalas = memo(function DetalhesSalas() {
  const quadro = texturaQuadro();
  return (
    <group>
      {/* Direção: mesa de conversa, estante e quadro */}
      <MesaRedonda x={-21.5} z={-11} />
      <Tapete posicao={[-23.3, -11]} tamanho={[4.8, 3.6]} cor="#c9bca8" borda="#a8977f" />
      <MesaCentro posicao={[-24.1, -11]} tamanho={[0.55, 1.2]} />

      {/* Sistemas: quadro branco, rack e mesa alta */}
      <group position={[-0.1, 1.5, -11.2]} rotation-y={-Math.PI / 2}>
        <Caixa p={[0, 0, -0.005]} s={[2.5, 1.45, 0.03]} m={aluminio()} />
        <mesh geometry={plano()} position={[0, 0, 0.012]} scale={[2.4, 1.36, 1]}>
          <meshStandardMaterial map={quadro} roughness={0.25} />
        </mesh>
      </group>
      <Rack x={-0.75} z={-18.2} />
      <MesaRedonda x={-7.4} z={-11.2} raio={0.45} alt={1.05} />

      {/* Financeiro: mesinha, arquivos de aço e painel com gráfico */}
      <MesaRedonda x={7} z={-10.8} />
      {[13.35, 12.8].map((x) => (
        <group key={x} position={[x, 0, -18.45]}>
          <Caixa p={[0, 0.66, 0]} s={[0.5, 1.32, 0.6]} m={mat("#b8bcc2", 0.4, 0.4)} sombra recebe />
          {[0.28, 0.6, 0.92, 1.24].map((y) => <Caixa key={y} p={[0, y, 0.302]} s={[0.2, 0.03, 0.02]} m={acoPreto()} />)}
        </group>
      ))}

      {/* Custos: mesa de projetos com plantas de obra */}
      <group position={[20, 0, -10.8]}>
        <Caixa p={[0, 0.94, 0]} s={[2.4, 0.05, 1.2]} m={mat("#e8e2d8", 0.5)} sombra recebe />
        {[-1.1, 1.1].map((x) => <Caixa key={x} p={[x, 0.46, 0]} s={[0.06, 0.92, 1.0]} m={acoPreto()} />)}
        <mesh geometry={plano()} position={[-0.3, 0.968, 0.05]} rotation-x={-Math.PI / 2} rotation-z={0.08} scale={[1.2, 0.85, 1]}>
          <meshStandardMaterial map={texturaQuadro()} color="#cfe0f5" roughness={0.6} />
        </mesh>
        <Caixa p={[0.75, 0.975, -0.2]} s={[0.5, 0.01, 0.35]} m={mat("#f6f4ef", 0.9)} r={[0, -0.3, 0]} />
        <mesh geometry={CIL} material={mat("#1e3a8a", 0.5)} position={[0.8, 1.0, 0.35]} rotation-z={Math.PI / 2} scale={[0.06, 0.7, 0.06]} />
      </group>

      {/* Frota e RH: quadro de chaves e mapa; Suprimentos: estante de caixas */}
      <group position={[-12.32, 0, 3.4]} rotation-y={-Math.PI / 2}>
        {[0.05, 0.6, 1.15, 1.7].map((y) => <Caixa key={y} p={[0, y, 0]} s={[2.6, 0.04, 0.45]} m={mat("#8b9097", 0.4, 0.6)} sombra />)}
        {[-1.28, 1.28].map((x) => <Caixa key={x} p={[x, 0.9, 0]} s={[0.04, 1.8, 0.45]} m={acoPreto()} />)}
        {Array.from({ length: 14 }).map((_, i) => (
          <Caixa key={i} p={[-1.0 + (i % 5) * 0.5, 0.25 + Math.floor(i / 5) * 0.55, 0]} s={[0.4, 0.34, 0.36]} m={mat(i % 3 ? "#c9a77c" : "#b8946a", 0.9)} sombra />
        ))}
      </group>

      {/* hall do meio: banco, bebedouro e quadros */}
      <group position={[ESPINHA.x0 + 0.45, 0, 1.0]}>
        <Caixa p={[0, 0.44, 0]} s={[0.5, 0.06, 2.0]} m={mat("#7a5a40", 0.5)} sombra recebe />
        {[-0.85, 0.85].map((z) => <Caixa key={z} p={[0, 0.21, z]} s={[0.4, 0.42, 0.05]} m={acoPreto()} />)}
      </group>
      <Quadro posicao={[ESPINHA.x0 + 0.08, 1.0]} rotacao={Math.PI / 2} mapa={texturaArte(6)} largura={1.8} altura={1.1} />
      <Quadro posicao={[ESPINHA.x1 - 0.08, 1.0]} rotacao={-Math.PI / 2} mapa={texturaArte(7)} largura={1.8} altura={1.1} />
      <group position={[ESPINHA.x1 - 0.35, 0, -3.3]}>
        <Caixa p={[0, 0.5, 0]} s={[0.32, 1.0, 0.32]} m={mat("#f2f2f0", 0.5)} sombra />
        <mesh geometry={CIL} material={mat("#93c5fd", 0.1, 0.1)} position={[0, 1.24, 0]} scale={[0.26, 0.46, 0.26]} />
      </group>
    </group>
  );
});

// ---------- tela do agente (monitor com o terminal) ----------

export function MesaAgente({
  posicao, nome, estado, selecionado, onClick,
}: {
  posicao: [number, number];
  nome: string;
  estado: EstadoAgente;
  selecionado: boolean;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
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
  useEffect(() => () => textura.dispose(), [textura]);
  const cursor = useRef(true);
  const acumulado = useRef(0);
  const ultimo = useRef(estado);
  ultimo.current = estado;

  const redesenhar = () => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    desenharTerminal(ctx, nome, ultimo.current, cursor.current);
    textura.needsUpdate = true;
  };
  useEffect(redesenhar, [estado, nome]); // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((_, dt) => {
    acumulado.current += dt;
    if (acumulado.current > 0.5) {
      acumulado.current = 0;
      cursor.current = !cursor.current;
      redesenhar();
    }
  });

  const brilho = estado.status === "trabalhando" ? 1.0 : 0.62;
  return (
    <group position={[posicao[0], 1.26, posicao[1] - 0.2265]}>
      {(selecionado || hover) && (
        <mesh geometry={plano()} position={[0, 0, -0.03]} scale={[1.1, 0.7, 1]}>
          <meshBasicMaterial color="#3b82f6" toneMapped={false} />
        </mesh>
      )}
      <mesh geometry={plano()} scale={[0.97, 0.57, 1]}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = ""; }}>
        <meshStandardMaterial map={textura} emissive="#ffffff" emissiveMap={textura} emissiveIntensity={brilho} toneMapped={false} roughness={0.2} />
      </mesh>
    </group>
  );
}

// ---------- arquivo ----------

export function Arquivo({
  setores, contagem, onAbrir, rotulos = true,
}: {
  setores: SetorInfo[];
  contagem: Record<string, number>;
  onAbrir: (setor: string) => void;
  rotulos?: boolean;
}) {
  const s = SALA.arquivo;
  return (
    <group>
      {setores.map((st, i) => (
        <Estante key={st.id} {...estante(i, setores.length)} setor={st} quantidade={contagem[st.id] ?? 0}
          onClick={() => onAbrir(st.id)} alturaRotulo={i % 2 ? 2.62 : 2.32} rotulos={rotulos} />
      ))}
      {/* mesa de consulta com caixas */}
      <group position={[13.1, 0, 2.4]}>
        <mesh geometry={TAMPO_RAFAEL} material={mat("#d6bf9c", 0.45)} position={[0, 0.74, 0]} scale={[0.85, 0.7, 1.0]} castShadow receiveShadow />
        {[-1.1, 1.1].map((x) => <Caixa key={x} p={[x, 0.36, 0]} s={[0.06, 0.72, 0.9]} m={acoPreto()} />)}
        <Caixa p={[-0.5, 0.88, 0.05]} s={[0.4, 0.24, 0.3]} m={mat("#c9a77c", 0.9)} sombra />
        <Caixa p={[-0.05, 0.85, -0.1]} s={[0.38, 0.18, 0.28]} m={mat("#b8946a", 0.9)} sombra r={[0, 0.3, 0]} />
        <Caixa p={[0.6, 0.77, 0.1]} s={[0.24, 0.02, 0.32]} m={mat("#f6f4ef", 0.9)} r={[0, -0.2, 0]} />
      </group>
      <Tapete posicao={[13.1, 2.6]} tamanho={[4.4, 3.0]} cor="#7a7f86" borda="#5b6068" />
      <Quadro posicao={[s.x1 - 0.08, 1.5]} rotacao={-Math.PI / 2} mapa={texturaArte(4)} largura={1.6} altura={1.0} />
    </group>
  );
}

function Estante({
  x, escala = 1, setor, quantidade, onClick, alturaRotulo, rotulos,
}: {
  x: number;
  escala?: number;
  setor: SetorInfo;
  quantidade: number;
  onClick: () => void;
  alturaRotulo: number;
  rotulos: boolean;
}) {
  const [hover, setHover] = useState(false);
  const cor = SETOR_COR[setor.id] ?? "#888780";
  const PRAT = 4;
  const POR_PRAT = 8;
  const pastas = Math.min(quantidade, PRAT * POR_PRAT);
  const madeira = mat(hover ? cor : "#5a4230", 0.55);
  return (
    <group position={[x, 0, ARQUIVO_Z]} scale={[escala, 1, 1]}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = ""; }}>
      {[-0.49, 0.49].map((lx) => <Caixa key={lx} p={[lx, 1.05, 0]} s={[0.04, 2.1, 0.44]} m={madeira} sombra />)}
      <Caixa p={[0, 1.05, -0.2]} s={[1.0, 2.1, 0.02]} m={mat("#d9cbb8", 0.8)} />
      <Caixa p={[0, 2.14, 0]} s={[1.0, 0.08, 0.46]} m={mat(cor, 0.5)} />
      {Array.from({ length: PRAT + 1 }).map((_, i) => (
        <Caixa key={i} p={[0, 0.08 + i * 0.5, 0]} s={[0.96, 0.03, 0.44]} m={mat("#c9ab86", 0.55)} sombra recebe />
      ))}
      {Array.from({ length: pastas }).map((_, i) => {
        const prat = Math.floor(i / POR_PRAT);
        const col = i % POR_PRAT;
        const tom = i % 3 === 0 ? cor : i % 3 === 1 ? tonalidade(cor, 0.8) : tonalidade(cor, 1.15);
        return (
          <Caixa key={i} p={[-0.4 + col * 0.11, 0.1 + prat * 0.5 + 0.17, 0.02]}
            s={[0.085, 0.32 + ((i * 7) % 5) * 0.012, 0.3]} m={mat(tom, 0.7)} />
        );
      })}
      {(
        <Html position={[0, alturaRotulo, 0.2]} center pointerEvents="none" distanceFactor={13} zIndexRange={[10, 0]}>
          <div style={{ display: rotulos ? "block" : "none",
            fontFamily: "system-ui", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", padding: "2px 8px",
            borderRadius: 999, background: "rgba(255,255,255,0.94)", color: "#1b1f24", borderBottom: `3px solid ${cor}`,
          }}>
            {setor.nome} · {quantidade}
          </div>
        </Html>
      )}
    </group>
  );
}

function tonalidade(hex: string, f: number) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(f);
  return `#${c.getHexString()}`;
}

// ---------- sua sala ----------

export function SalaRafael({ pendentes, onClick }: { pendentes: number; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  const pilha = Math.min(pendentes, 20);
  const luz = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (luz.current) {
      const m = luz.current.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = pendentes > 0 ? 1.2 + Math.sin(clock.elapsedTime * 3) * 0.8 : 0.1;
    }
  });
  const [mx, mz] = MESA_RAFAEL;
  const nogueira = mat(hover ? "#7a5236" : "#4e3423", 0.4);
  const s = SALA.rafael;
  return (
    <group>
      <Tapete posicao={[mx, mz + 0.5]} tamanho={[6.0, 4.4]} cor="#b9ad9c" borda="#8b7d69" />
      <group position={[mx, 0, mz]}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = ""; }}>
        {/* mesa executiva: você senta em -z; o painel da frente fica para nós */}
        <mesh geometry={TAMPO_RAFAEL} material={nogueira} position={[0, 0.75, 0]} castShadow receiveShadow />
        {[-1.3, 1.3].map((x) => <Caixa key={x} p={[x, 0.37, 0]} s={[0.08, 0.74, 1.0]} m={nogueira} sombra />)}
        <Caixa p={[0, 0.43, 0.47]} s={[2.5, 0.62, 0.04]} m={nogueira} sombra />
        <Caixa p={[0, 0.43, 0.495]} s={[2.3, 0.02, 0.01]} m={mat("#c8a46a", 0.3, 0.8)} />
        {Array.from({ length: pilha }).map((_, i) => (
          <Caixa key={i} p={[-0.85 + (i % 2) * 0.02, 0.795 + i * 0.022, 0.05 + (i % 3) * 0.015]}
            s={[0.3, 0.018, 0.42]} r={[0, (i % 4) * 0.06, 0]} m={mat(i % 2 ? "#fbfaf7" : "#f2efe6", 0.9)} sombra />
        ))}
        <mesh ref={luz} position={[-0.85, 0.82 + pilha * 0.022, 0.05]}>
          <sphereGeometry args={[0.035, 12, 12]} />
          <meshStandardMaterial color="#f0a43a" emissive="#f0a43a" toneMapped={false} />
        </mesh>
        {/* dois monitores virados para você e um notebook */}
        {[0.5, 1.08].map((x, i) => (
          <group key={x} position={[x, 0.78, 0.28 - i * 0.1]} rotation-y={Math.PI + (i ? -0.45 : -0.1)}>
            <Caixa p={[0, 0.34, 0]} s={[0.62, 0.38, 0.025]} m={mat("#111214", 0.35)} />
            <mesh geometry={plano()} material={emissivo(i ? "#a7c4f2" : "#c6e3d2", 0.55)} position={[0, 0.345, 0.0135]} scale={[0.59, 0.35, 1]} />
            <Caixa p={[0, 0.1, -0.03]} s={[0.04, 0.2, 0.02]} m={aluminio()} />
          </group>
        ))}
        <Caixa p={[0.2, 0.8, -0.05]} s={[0.4, 0.015, 0.14]} m={mat("#e2e4e7", 0.6)} />
        <mesh geometry={CIL} material={mat("#f5f5f4", 0.3)} position={[0.95, 0.83, 0.15]} scale={[0.08, 0.1, 0.08]} castShadow />
      </group>
      {/* aparador e quadro atrás de você, estante na parede da recepção */}
      <group position={[mx, 0, s.z0 + 0.35]}>
        <Caixa p={[0, 0.36, 0]} s={[3.6, 0.72, 0.5]} m={mat("#3b2a1e", 0.45)} sombra recebe />
        <Caixa p={[0, 0.735, 0]} s={[3.64, 0.03, 0.52]} m={mat("#c8a46a", 0.35, 0.6)} />
        <mesh geometry={CIL} material={mat("#e7e1d6", 0.4)} position={[-1.3, 0.9, 0]} scale={[0.18, 0.3, 0.18]} castShadow />
        <Caixa p={[1.1, 0.84, 0]} s={[0.5, 0.18, 0.3]} m={mat("#7c2d12", 0.7)} />
      </group>
      <Quadro posicao={[mx, s.z0 + 0.08]} mapa={texturaArte(0)} largura={2.6} altura={1.2} y={1.75} />
      <EstanteLivros posicao={[s.x1 - 0.25, 14.0]} largura={3.4} rotacao={-Math.PI / 2} />
      <MesaCentro posicao={[-24.0, 13.8]} tamanho={[0.6, 1.2]} />
      <Tapete posicao={[-24.2, 13.6]} tamanho={[3.0, 3.4]} cor="#d6cfc3" borda="#b4aa9b" />
      {/* luminária de pé */}
      <group position={[s.x0 + 0.5, 0, 16.3]}>
        <mesh geometry={CIL} material={acoPreto()} position={[0, 0.015, 0]} scale={[0.36, 0.03, 0.36]} />
        <Caixa p={[0, 0.8, 0]} s={[0.03, 1.6, 0.03]} m={acoPreto()} />
        <mesh position={[0, 1.65, 0]} material={mat("#efe6d6", 0.9)} castShadow>
          <cylinderGeometry args={[0.18, 0.25, 0.3, 24, 1, true]} />
        </mesh>
        <mesh position={[0, 1.55, 0]} material={emissivo("#ffe2b0", 1.4)}>
          <sphereGeometry args={[0.06, 12, 10]} />
        </mesh>
      </group>
      <Relogio p={[s.x1 - 0.08, 2.2, 11.6]} rot={-Math.PI / 2} raio={0.2} />
    </group>
  );
}

// ---------- sala de reunião com TV ----------

export function SalaReuniao({ painel }: { painel: PainelTV }) {
  const [mx, mz] = MESA_REUNIAO;
  const s = SALA.reuniao;
  return (
    <group>
      <group position={[mx, 0, mz]}>
        <mesh geometry={TAMPO_REUNIAO} material={mat("#bda383", 0.38)} position={[0, 0.76, 0]} castShadow receiveShadow />
        {[-2.0, 2.0].map((x) => (
          <group key={x}>
            <Caixa p={[x, 0.37, 0]} s={[0.12, 0.72, 0.9]} m={acoPreto()} sombra />
            <Caixa p={[x, 0.02, 0]} s={[0.5, 0.04, 1.2]} m={acoPreto()} />
          </group>
        ))}
        <mesh geometry={CIL} material={mat("#1f2125", 0.4)} position={[0, 0.8, 0]} scale={[0.34, 0.03, 0.34]} />
        {[-2.6, -1.3, 0, 1.3, 2.6].map((x, i) => (
          <group key={x}>
            <mesh geometry={CIL} material={vidro()} position={[x + 0.25, 0.85, -0.5]} scale={[0.07, 0.12, 0.07]} />
            <mesh geometry={CIL} material={vidro()} position={[x - 0.25, 0.85, 0.5]} scale={[0.07, 0.12, 0.07]} />
            {i % 2 === 0 && <Caixa p={[x, 0.795, 0.48]} s={[0.22, 0.012, 0.3]} m={mat("#1f2937", 0.7)} r={[0, 0.15, 0]} />}
            {i % 2 === 1 && <Caixa p={[x, 0.795, -0.48]} s={[0.3, 0.012, 0.22]} m={mat("#f6f4ef", 0.9)} r={[0, -0.2, 0]} />}
          </group>
        ))}
      </group>
      <Televisao painel={painel} />
      {/* aparador sob a TV */}
      <group position={[TV.x, 0, s.z0 + 0.3]}>
        <Caixa p={[0, 0.3, 0]} s={[3.4, 0.52, 0.42]} m={mat("#4a3426", 0.5)} sombra recebe />
        <Caixa p={[0, 0.03, 0]} s={[3.3, 0.06, 0.38]} m={acoPreto()} />
        <Caixa p={[0, 0.6, -0.05]} s={[1.1, 0.07, 0.1]} m={mat("#16181c", 0.4)} />
      </group>
      <Quadro posicao={[s.x0 + 0.08, 0.6]} rotacao={Math.PI / 2} mapa={texturaArte(8)} largura={2.2} altura={1.2} />
      <Quadro posicao={[s.x1 - 0.08, 0.6]} rotacao={-Math.PI / 2} mapa={texturaArte(9)} largura={2.2} altura={1.2} />
      <Relogio p={[TV.x + 2.6, 2.1, s.z0 + 0.08]} />
    </group>
  );
}

function Televisao({ painel }: { painel: PainelTV }) {
  const canvas = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = TV_W;
    c.height = TV_H;
    return c;
  }, []);
  const textura = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [canvas]);
  useEffect(() => () => textura.dispose(), [textura]);
  const ultimo = useRef(painel);
  ultimo.current = painel;

  // redesenha quando os dados mudam e a cada 20 s, para o relógio andar (a cada 1 s com reunião, pelo cronômetro)
  const comReuniao = !!painel.reuniao && !painel.relogio;
  useEffect(() => {
    const desenhar = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      desenharTV(ctx, ultimo.current);
      textura.needsUpdate = true;
    };
    desenhar();
    const t = setInterval(desenhar, comReuniao ? 1000 : 20000);
    return () => clearInterval(t);
  }, [painel, canvas, textura, comReuniao]);

  return (
    <group position={[TV.x, TV.y, TV.z]}>
      <Caixa p={[0, 0, -0.02]} s={[TV.largura + 0.05, TV.altura + 0.05, 0.05]} m={mat("#0c0d0f", 0.3)} sombra />
      <mesh geometry={plano()} position={[0, 0, 0.0065]} scale={[TV.largura, TV.altura, 1]}>
        <meshStandardMaterial map={textura} emissive="#ffffff" emissiveMap={textura} emissiveIntensity={0.9} toneMapped={false} roughness={0.15} />
      </mesh>
    </group>
  );
}

// ---------- copa ----------

export const Copa = memo(function Copa() {
  const s = SALA.copa;
  const z = s.z0 + 0.32;
  return (
    <group>
      <Caixa p={[21.3, 0.44, z]} s={[6.6, 0.88, 0.62]} m={brancoFosco()} sombra recebe />
      <Caixa p={[21.3, 0.9, z + 0.01]} s={[6.64, 0.04, 0.66]} m={mat("#2b2e33", 0.2)} sombra recebe />
      <Caixa p={[21.3, 1.95, s.z0 + 0.2]} s={[6.6, 0.7, 0.36]} m={brancoFosco()} sombra />
      <Caixa p={[21.3, 1.55, s.z0 + 0.03]} s={[6.6, 0.75, 0.02]} m={mat("#3f6f6a", 0.3)} />
      {[18.6, 19.9, 21.2, 22.5, 23.8].map((x) => <Caixa key={x} p={[x, 0.62, z + 0.315]} s={[0.2, 0.025, 0.02]} m={aluminio()} />)}
      {/* cafeteira, micro-ondas e pia */}
      <group position={[18.7, 0.92, z]}>
        <Caixa p={[0, 0.2, 0]} s={[0.34, 0.4, 0.32]} m={mat("#1e1f22", 0.3, 0.3)} sombra />
        <Caixa p={[0, 0.28, 0.165]} s={[0.12, 0.06, 0.01]} m={emissivo("#7dd3fc", 1.2)} />
        <mesh geometry={CIL} material={mat("#f5f5f4", 0.3)} position={[0, 0.05, 0.1]} scale={[0.07, 0.08, 0.07]} />
      </group>
      <group position={[20.4, 0.92, z]}>
        <Caixa p={[0, 0.16, 0]} s={[0.55, 0.32, 0.4]} m={aluminio()} sombra />
        <Caixa p={[-0.05, 0.16, 0.205]} s={[0.38, 0.24, 0.01]} m={mat("#16181c", 0.2)} />
      </group>
      <Caixa p={[22.6, 0.921, z]} s={[0.6, 0.005, 0.42]} m={aluminio()} />
      <Caixa p={[22.6, 1.06, z - 0.18]} s={[0.03, 0.28, 0.03]} m={aluminio()} />
      {/* geladeira e mesa */}
      <Caixa p={[25.2, 0.95, s.z0 + 0.45]} s={[0.78, 1.9, 0.78]} m={aluminio()} sombra />
      <MesaRedonda x={21.5} z={2.1} raio={0.7} />
      <mesh geometry={CIL} material={mat("#ef4444", 0.6)} position={[21.5, 0.82, 2.1]} scale={[0.22, 0.1, 0.22]} />
      <Quadro posicao={[s.x1 - 0.08, 2.0]} rotacao={-Math.PI / 2} mapa={texturaArte(10)} largura={1.4} altura={1.0} />
    </group>
  );
});

// ---------- recepção ----------

export const Recepcao = memo(function Recepcao() {
  const logo = texturaLogoRecepcao();
  return (
    <group>
      {/* parede do logo, solta, virada para a entrada */}
      <group position={[-1, 0, 11.0]}>
        <Caixa p={[0, ALT / 2, 0]} s={[7.2, ALT, 0.24]} m={mat("#2b2119", 0.6)} sombra recebe />
        <mesh geometry={plano()} position={[0, ALT / 2, 0.123]} scale={[5.4, 2.7, 1]}>
          <meshStandardMaterial map={logo} roughness={0.55} emissive="#ffffff" emissiveMap={logo} emissiveIntensity={0.18} />
        </mesh>
        <mesh geometry={plano()} material={emissivo("#ffd9a0", 1.6)} position={[0, 0.02, 0.2]} rotation-x={-Math.PI / 2} scale={[6.8, 0.08, 1]} />
      </group>
      {/* balcão */}
      <group position={[-1, 0, 13.6]}>
        <mesh geometry={BALCAO} material={brancoFosco()} position={[0, 0.55, 0]} castShadow receiveShadow />
        <Caixa p={[0, 1.12, -0.06]} s={[4.3, 0.04, 0.95]} m={mat("#2b2e33", 0.25)} sombra />
        {Array.from({ length: 20 }).map((_, i) => (
          <Caixa key={i} p={[-1.9 + i * 0.2, 0.55, 0.405]} s={[0.12, 1.0, 0.02]} m={mat("#8a6a4a", 0.5)} />
        ))}
        <mesh geometry={plano()} material={emissivo("#ffd9a0", 1.2)} position={[0, 0.03, 0.43]} rotation-x={-Math.PI / 2} scale={[4.0, 0.06, 1]} />
        <group position={[0.9, 1.14, -0.15]} rotation-y={Math.PI}>
          <Caixa p={[0, 0.25, 0]} s={[0.55, 0.34, 0.02]} m={mat("#111214", 0.35)} />
          <mesh geometry={plano()} material={emissivo("#bcd4f5", 0.5)} position={[0, 0.255, 0.011]} scale={[0.52, 0.31, 1]} />
          <Caixa p={[0, 0.06, -0.03]} s={[0.04, 0.12, 0.02]} m={aluminio()} />
        </group>
        <mesh geometry={CIL} material={vidro()} position={[-1.4, 1.27, 0.1]} scale={[0.12, 0.26, 0.12]} />
        {[0, 1, 2, 3, 4].map((k) => (
          <mesh key={k} geometry={CIL} material={mat("#16a34a", 0.6)} position={[-1.4 + (k - 2) * 0.03, 1.45 + (k % 2) * 0.04, 0.1]} scale={[0.01, 0.3, 0.01]} />
        ))}
        <mesh position={[-1.4, 1.62, 0.1]} material={mat("#f9a8d4", 0.6)}><sphereGeometry args={[0.07, 10, 8]} /></mesh>
      </group>
      {/* sala de espera */}
      <Tapete posicao={[17, 13.95]} tamanho={[6.4, 5.2]} cor="#cfc6b8" borda="#a99d8b" />
      <MesaCentro posicao={[17, 13.95]} tamanho={[1.2, 0.7]} />
      {/* tapete da entrada */}
      <mesh geometry={plano()} position={[SALA.recepcao.porta, 0.008, 16.2]} rotation-x={-Math.PI / 2} scale={[2.2, 1.4, 1]} material={mat("#2f3236", 1)} receiveShadow />
      <Quadro posicao={[SALA.recepcao.x0 + 0.08, 14.6]} rotacao={Math.PI / 2} mapa={texturaArte(11)} largura={2.0} altura={1.2} />
    </group>
  );
});

