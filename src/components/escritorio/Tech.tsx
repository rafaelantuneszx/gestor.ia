"use client";

// A parte tech do escritório: telas de LED com números reais, parede de resultados, letreiro suspenso e data center.
import { memo, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Caixa } from "./Predio";
import { emissivo, mat } from "./materiais";
import { geometriaCaixa, geometriaPlano as plano } from "./Moveis";
import { Lote, montarKit, type Item, type Parte } from "./kit";
import {
  desenharFaixaSistema, desenharIndependencia, desenharResultados, desenharServidores, desenharSuspenso, type DadosLed,
} from "./paineis";
import { MESA_REUNIAO, PAREDE_RESULTADOS, RACKS, SALA, SISTEMAS_RACK } from "@/lib/escritorio/modelo";

type V3 = [number, number, number];

// Tela de LED: redesenha quando os dados mudam e ilumina o ambiente.
function TelaLED({ p, r, largura, altura, px, chave, desenhar, moldura = true }: {
  p: V3;
  r?: V3;
  largura: number;
  altura: number;
  px: number;
  chave: string;
  desenhar: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  moldura?: boolean;
}) {
  const h = Math.round((px * altura) / largura);
  const canvas = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = px;
    c.height = h;
    return c;
  }, [px, h]);
  const textura = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [canvas]);
  useEffect(() => () => textura.dispose(), [textura]);
  const desenho = useRef(desenhar);
  desenho.current = desenhar;
  useEffect(() => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    desenho.current(ctx, canvas.width, canvas.height);
    textura.needsUpdate = true;
  }, [chave, canvas, textura]);
  return (
    <group position={p} rotation={r}>
      {moldura && <Caixa p={[0, 0, -0.04]} s={[largura + 0.08, altura + 0.08, 0.06]} m={mat("#05080e", 0.3, 0.6)} />}
      <mesh geometry={plano()} scale={[largura, altura, 1]}>
        <meshBasicMaterial map={textura} toneMapped={false} />
      </mesh>
    </group>
  );
}

const chaveDe = (d: DadosLed) => JSON.stringify([d.ind, d.trabalhando, d.emReuniao, d.total]);

// Letreiro suspenso sobre o fundo do prédio, preso por cabos.
export function PainelSuspenso({ dados }: { dados: DadosLed }) {
  const largura = 30;
  const altura = 3.5;
  const y = 6.3;
  const z = SALA.direcao.z0 - 0.6;
  return (
    <group>
      <TelaLED p={[0, y, z]} largura={largura} altura={altura} px={2048} chave={chaveDe(dados)}
        desenhar={(c, w, h) => desenharSuspenso(c, w, h, dados)} />
      {[-13, -5, 5, 13].map((x) => <Caixa key={x} p={[x, (y - altura / 2 + 2.9) / 2, z - 0.05]} s={[0.05, y - altura / 2 - 2.9, 0.05]} m={mat("#1e293b", 0.4, 0.8)} />)}
    </group>
  );
}

// As duas telas grandes na parede do fundo da sala de reunião, ao lado da TV.
export function ParedeResultados({ dados }: { dados: DadosLed }) {
  const chave = chaveDe(dados);
  const { y, z, largura, altura, xResultados, xIndependencia } = PAREDE_RESULTADOS;
  return (
    <group>
      <TelaLED p={[xResultados, y, z]} largura={largura} altura={altura} px={1536} chave={chave}
        desenhar={(c, w, h) => desenharResultados(c, w, h, dados)} />
      <TelaLED p={[xIndependencia, y, z]} largura={largura} altura={altura} px={1536} chave={chave}
        desenhar={(c, w, h) => desenharIndependencia(c, w, h, dados)} />
      <mesh geometry={plano()} material={emissivo("#22d3ee", 1.6)} position={[MESA_REUNIAO[0], 0.03, z + 0.14]} rotation-x={-Math.PI / 2} scale={[14.4, 0.05, 1]} />
    </group>
  );
}

// ---------- data center ----------
const COR_LED = [new THREE.Color("#22d3ee"), new THREE.Color("#34d399"), new THREE.Color("#60a5fa"), new THREE.Color("#fbbf24")];
const APAGADO = new THREE.Color("#0b1220");
const LED_POR_RACK = 24;
const GEO_LED = new THREE.PlaneGeometry(0.04, 0.022);
const MAT_LED = new THREE.MeshBasicMaterial({ toneMapped: false });

// LEDs numa malha só (centenas de luzes por uma chamada de desenho). A atividade real da equipe acelera o piscar.
const LedsDosRacks = memo(function LedsDosRacks({ atividade }: { atividade: number }) {
  const malha = useRef<THREE.InstancedMesh>(null);
  const total = RACKS.length * LED_POR_RACK;
  const coluna = useMemo(() => Array.from({ length: total }, (_, i) => ((i * 2654435761) >>> 0) / 4294967296), [total]);
  const atividadeRef = useRef(atividade);
  atividadeRef.current = atividade;
  useEffect(() => {
    const m = malha.current;
    if (!m) return;
    const o = new THREE.Object3D();
    RACKS.forEach(([x, z], r) => {
      for (let i = 0; i < LED_POR_RACK; i++) {
        const lin = Math.floor(i / 3);
        o.position.set(x - 0.3 + (i % 3) * 0.07, 0.34 + lin * 0.2, z + 0.522);
        o.updateMatrix();
        m.setMatrixAt(r * LED_POR_RACK + i, o.matrix);
      }
    });
    m.instanceMatrix.needsUpdate = true;
  }, []);
  const acumulado = useRef(0);
  useFrame(({ clock }, dt) => {
    const m = malha.current;
    if (!m) return;
    acumulado.current += dt;
    if (acumulado.current < 0.16) return;
    acumulado.current = 0;
    const t = clock.elapsedTime;
    const ritmo = 0.8 + Math.min(atividadeRef.current, 8) * 0.55;
    for (let i = 0; i < total; i++) {
      const s = coluna[i];
      const aceso = Math.sin(t * ritmo * (1 + s * 5) + s * 40) > -0.35 + s * 0.25;
      m.setColorAt(i, aceso ? COR_LED[i % 7 === 0 ? 3 : i % COR_LED.length % 3] : APAGADO);
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  return <instancedMesh ref={malha} args={[GEO_LED, MAT_LED, total]} frustumCulled={false} />;
});

// Rack único mesclado e desenhado com instâncias: 24 racks custam só algumas chamadas de desenho.
let kitRack: ReturnType<typeof montarKit> | null = null;
function rack() {
  if (kitRack) return kitRack;
  const p: Parte[] = [
    { geo: geometriaCaixa, mat: mat("#0b0f17", 0.35, 0.7), p: [0, 1.05, 0], s: [0.84, 2.1, 1.0], sombra: true },
    { geo: geometriaCaixa, mat: mat("#141b27", 0.25, 0.8), p: [0, 1.05, 0.505], s: [0.76, 1.98, 0.012] },
    { geo: geometriaCaixa, mat: mat("#0b1220", 0.85, 0.1), p: [0, 2.13, 0], s: [0.86, 0.04, 1.02] },
    { geo: geometriaCaixa, mat: emissivo("#22d3ee", 1.4), p: [0, 2.155, 0.47], s: [0.8, 0.012, 0.03] },
    { geo: plano(), mat: emissivo("#22d3ee", 1.6), p: [0.36, 1.05, 0.521], s: [0.012, 1.9, 1] },
  ];
  for (let i = 0; i < 8; i++) p.push({ geo: geometriaCaixa, mat: mat("#05080e", 0.45), p: [0, 0.34 + i * 0.2, 0.513], s: [0.72, 0.15, 0.01] });
  kitRack = montarKit(p);
  return kitRack;
}
const ITENS_RACK: Item[] = RACKS.map(([x, z]) => ({ x, z }));
const Racks = memo(function Racks() {
  return <Lote kit={rack()} itens={ITENS_RACK} />;
});

export function DataCenter({ dados }: { dados: DadosLed }) {
  const s = SALA.datacenter;
  const zFileiras = [...new Set(RACKS.map(([, z]) => z))];
  const xMeio = (s.x0 + s.x1) / 2 + 0.6;
  return (
    <group>
      <Racks />
      <LedsDosRacks atividade={dados.trabalhando + dados.emReuniao} />
      {zFileiras.map((z, f) => (
        <group key={z}>
          {SISTEMAS_RACK.map((nome, i) => {
            const w = 11 / SISTEMAS_RACK.length;
            return (
              <TelaLED key={nome} p={[xMeio + (i - (SISTEMAS_RACK.length - 1) / 2) * w, 2.38, z + 0.46]} largura={w - 0.08} altura={0.2}
                px={512} chave={`${nome}${f}`} moldura={false} desenhar={(c, cw, ch) => desenharFaixaSistema(c, cw, ch, nome)} />
            );
          })}
          <mesh geometry={plano()} material={emissivo("#22d3ee", 1.8)} position={[xMeio, 0.012, z + 0.86]} rotation-x={-Math.PI / 2} scale={[11.4, 0.05, 1]} />
        </group>
      ))}
      <TelaLED p={[xMeio, 2.28, s.z0 + 0.14]} largura={8.6} altura={1.0} px={1536} chave={chaveDe(dados)}
        desenhar={(c, w, h) => desenharServidores(c, w, h, dados)} />
    </group>
  );
}
