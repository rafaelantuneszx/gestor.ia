"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
  ALTURA_PAREDE, ARQUIVO_PASSO, ARQUIVO_X0, ARQUIVO_Z, CADEIRA_RAFAEL, CORREDOR, MESA_RAFAEL, MESA_REUNIAO, PREDIO,
  SALA, SALAS, SETOR_COR, TV,
  type EstadoAgente, type Sala, type SetorInfo,
} from "@/lib/escritorio/modelo";
import { desenharTerminal, TELA_H, TELA_W } from "./terminal";
import { desenharTV, TV_H, TV_W, type PainelTV } from "./tv";
import {
  acoPreto, aluminio, emissivo, mat, materialPiso, parede, texturaCeu, texturaLogo, texturaPlaca, texturaQuadro,
  vidro, vidroFosco,
} from "./materiais";
import {
  CadeiraEscritorio, EstanteLivros, geometriaCaixa as CAIXA, Luminaria, MesaCentro, Planta, Sofa, Tapete,
} from "./Moveis";

const H = ALTURA_PAREDE;
const ESPESSURA = 0.12;
const PORTA = 1.0;
const ALTURA_PORTA = 2.15;

// Uma caixa com a geometria compartilhada: posição no centro e tamanho por escala.
function Caixa({
  p, s, m, sombra = false, recebe = false, r,
}: {
  p: [number, number, number];
  s: [number, number, number];
  m: THREE.Material;
  sombra?: boolean;
  recebe?: boolean;
  r?: [number, number, number];
}) {
  return <mesh geometry={CAIXA} material={m} position={p} scale={s} rotation={r} castShadow={sombra} receiveShadow={recebe} />;
}

// ---------- prédio: pisos, paredes, janelas e divisórias ----------

export function Predio() {
  const w = PREDIO.x1 - PREDIO.x0;
  const d = PREDIO.z1 - PREDIO.z0;
  const cx = (PREDIO.x0 + PREDIO.x1) / 2;
  const cz = (PREDIO.z0 + PREDIO.z1) / 2;
  return (
    <group>
      {/* terreno e laje */}
      <mesh rotation-x={-Math.PI / 2} position={[cx, -0.31, cz]} receiveShadow material={mat("#d5dbe0", 1)}>
        <planeGeometry args={[220, 220]} />
      </mesh>
      <Caixa p={[cx, -0.15, cz + 0.2]} s={[w + 0.6, 0.3, d + 0.8]} m={mat("#bdb8b1", 0.9)} recebe />
      {/* pisos */}
      {SALAS.map((s) => (
        <mesh key={s.id} rotation-x={-Math.PI / 2} position={[(s.x0 + s.x1) / 2, 0.002, (s.z0 + s.z1) / 2]} receiveShadow
          material={materialPiso(s.piso, s.x1 - s.x0, s.z1 - s.z0)}>
          <planeGeometry args={[s.x1 - s.x0, s.z1 - s.z0]} />
        </mesh>
      ))}
      <mesh rotation-x={-Math.PI / 2} position={[cx, 0.002, (CORREDOR.z0 + CORREDOR.z1) / 2]} receiveShadow
        material={materialPiso("porcelanato", w, CORREDOR.z1 - CORREDOR.z0)}>
        <planeGeometry args={[w, CORREDOR.z1 - CORREDOR.z0]} />
      </mesh>

      <FachadaFundo />
      {/* paredes laterais externas */}
      {[PREDIO.x0 - 0.1, PREDIO.x1 + 0.1].map((x) => (
        <group key={x}>
          <Caixa p={[x, (H + 0.1) / 2, cz - 0.1]} s={[0.2, H + 0.1, d + 0.2]} m={parede()} sombra recebe />
          <Caixa p={[x, H + 0.1, cz - 0.1]} s={[0.22, 0.02, d + 0.22]} m={mat("#9c968e", 0.8)} />
        </group>
      ))}
      {/* divisórias entre as salas */}
      {SALAS.filter((s) => s.x0 > PREDIO.x0).map((s) => (
        <ParedeLateral key={`lat-${s.id}`} x={s.x0} z0={s.z0} z1={s.z1} />
      ))}
      {/* frente das salas do fundo: vidro com porta */}
      {SALAS.filter((s) => s.fileira === "fundo").map((s) => (
        <Divisoria key={`div-${s.id}`} sala={s} z={CORREDOR.z0} abreParaMenos />
      ))}
      {/* parede do corredor das salas da frente: vidro, com trechos de parede onde há estante ou TV */}
      <Divisoria sala={SALA.rafael} z={CORREDOR.z1} solidos={[[-15, -11]]} />
      <Divisoria sala={SALA.reuniao} z={CORREDOR.z1} solidos={[[TV.x - 1.6, TV.x + 1.6]]} />
      <Divisoria sala={SALA.arquivo} z={CORREDOR.z1} solidos={[[SALA.arquivo.porta + PORTA / 2, SALA.arquivo.x1]]} />
      <Divisoria sala={SALA.copa} z={CORREDOR.z1} />

      <Corredor />
      <SalasDeTrabalho />
      <Copa />
    </group>
  );
}

// Parede do fundo com janelões, e a cidade lá fora.
function FachadaFundo() {
  const z = PREDIO.z0 - 0.1;
  const w = PREDIO.x1 - PREDIO.x0 + 0.4;
  const cx = (PREDIO.x0 + PREDIO.x1) / 2;
  const pilares = [PREDIO.x0, ...SALAS.filter((s) => s.fileira === "fundo" && s.x0 > PREDIO.x0).map((s) => s.x0), PREDIO.x1];
  const montantes: number[] = [];
  for (let i = 0; i < pilares.length - 1; i++) {
    const a = pilares[i] + 0.25;
    const b = pilares[i + 1] - 0.25;
    const n = Math.max(1, Math.round((b - a) / 2.2));
    for (let k = 1; k < n; k++) montantes.push(a + ((b - a) * k) / n);
  }
  const ceu = texturaCeu();
  return (
    <group>
      <Caixa p={[cx, 0.45, z]} s={[w, 0.9, 0.2]} m={parede()} sombra recebe />
      <Caixa p={[cx, 2.75, z]} s={[w, 0.5, 0.2]} m={parede()} sombra recebe />
      <Caixa p={[cx, 3.0, z]} s={[w + 0.02, 0.02, 0.22]} m={mat("#9c968e", 0.8)} />
      {pilares.map((x) => (
        <Caixa key={x} p={[x, 1.7, z]} s={[0.5, 1.6, 0.22]} m={parede()} sombra />
      ))}
      {montantes.map((x) => (
        <Caixa key={x} p={[x, 1.7, z]} s={[0.05, 1.6, 0.08]} m={aluminio()} />
      ))}
      <Caixa p={[cx, 0.92, z + 0.16]} s={[w - 0.4, 0.04, 0.2]} m={mat("#ece9e3", 0.4)} recebe />
      <Caixa p={[cx, 0.92, z - 0.02]} s={[w, 0.03, 0.1]} m={aluminio()} />
      <Caixa p={[cx, 2.49, z - 0.02]} s={[w, 0.03, 0.1]} m={aluminio()} />
      <mesh position={[cx, 1.7, z]} material={vidro()}>
        <planeGeometry args={[w, 1.6]} />
      </mesh>
      <mesh position={[cx, 1.45, z - 0.55]}>
        <planeGeometry args={[w + 1, 2.9]} />
        <meshBasicMaterial map={ceu} toneMapped={false} />
      </mesh>
    </group>
  );
}

function ParedeLateral({ x, z0, z1 }: { x: number; z0: number; z1: number }) {
  const len = z1 - z0;
  const zc = (z0 + z1) / 2;
  return (
    <group>
      <Caixa p={[x, H / 2, zc]} s={[ESPESSURA, H, len]} m={parede()} sombra recebe />
      <Caixa p={[x, 0.04, zc]} s={[ESPESSURA + 0.03, 0.08, len]} m={mat("#d6d0c6", 0.7)} />
      <Caixa p={[x, H + 0.005, zc]} s={[ESPESSURA + 0.01, 0.01, len]} m={mat("#9c968e", 0.8)} />
    </group>
  );
}

// Divisória ao longo de x na parede do corredor de uma sala: vidro (ou parede nos trechos sólidos),
// com a porta da sala. `abreParaMenos`: a folha da porta abre para dentro das salas do fundo (-z).
function Divisoria({
  sala, z, solidos = [], abreParaMenos = false,
}: {
  sala: Sala;
  z: number;
  solidos?: [number, number][];
  abreParaMenos?: boolean;
}) {
  const p0 = sala.porta - PORTA / 2;
  const p1 = sala.porta + PORTA / 2;
  // corta o trecho [x0, x1] pela porta e pelos trechos sólidos
  const cortes = [sala.x0 + ESPESSURA / 2, sala.x1 - ESPESSURA / 2, p0, p1, ...solidos.flat()]
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => a - b);
  const pedacos: { a: number; b: number; tipo: "vidro" | "solido" | "porta" }[] = [];
  for (let i = 0; i < cortes.length - 1; i++) {
    const a = cortes[i];
    const b = cortes[i + 1];
    if (b - a < 0.01 || a < sala.x0 || b > sala.x1) continue;
    const meio = (a + b) / 2;
    const tipo = meio > p0 && meio < p1 ? "porta" : solidos.some(([s0, s1]) => meio > s0 && meio < s1) ? "solido" : "vidro";
    pedacos.push({ a, b, tipo });
  }
  const lado = abreParaMenos ? -1 : 1;
  return (
    <group>
      {pedacos.map(({ a, b, tipo }) => {
        const len = b - a;
        const xc = (a + b) / 2;
        if (tipo === "solido") {
          return (
            <group key={a}>
              <Caixa p={[xc, H / 2, z]} s={[len, H, ESPESSURA]} m={parede()} sombra recebe />
              <Caixa p={[xc, 0.04, z]} s={[len, 0.08, ESPESSURA + 0.03]} m={mat("#d6d0c6", 0.7)} />
              <Caixa p={[xc, H + 0.005, z]} s={[len, 0.01, ESPESSURA + 0.01]} m={mat("#9c968e", 0.8)} />
            </group>
          );
        }
        if (tipo === "porta") {
          return (
            <group key={a}>
              {[a, b].map((x) => <Caixa key={x} p={[x, ALTURA_PORTA / 2, z]} s={[0.05, ALTURA_PORTA, 0.1]} m={aluminio()} />)}
              <Caixa p={[xc, (H + ALTURA_PORTA) / 2, z]} s={[len, H - ALTURA_PORTA, ESPESSURA]} m={parede()} />
              <Caixa p={[xc, ALTURA_PORTA, z]} s={[len, 0.05, 0.1]} m={aluminio()} />
              {/* folha de vidro aberta, presa na dobradiça da esquerda */}
              <group position={[a + 0.03, 0, z]} rotation-y={lado * 1.25}>
                <mesh position={[0.46, ALTURA_PORTA / 2 - 0.02, 0]} material={vidro()}>
                  <planeGeometry args={[0.92, ALTURA_PORTA - 0.06]} />
                </mesh>
                <Caixa p={[0.46, 0.03, 0]} s={[0.92, 0.05, 0.04]} m={aluminio()} />
                <Caixa p={[0.84, 1.05, 0.04 * lado]} s={[0.025, 0.5, 0.025]} m={inox()} />
              </group>
              <Placa nome={sala.nome} cor={sala.cor} x={xc} z={z + 0.07} />
            </group>
          );
        }
        const montantes = Math.max(1, Math.round(len / 1.3));
        return (
          <group key={a}>
            <mesh position={[xc, H / 2 - 0.06, z]} material={vidro()}>
              <planeGeometry args={[len, H - 0.12]} />
            </mesh>
            <mesh position={[xc, 1.2, z + 0.006]} material={vidroFosco()}>
              <planeGeometry args={[len, 0.22]} />
            </mesh>
            <Caixa p={[xc, 0.03, z]} s={[len, 0.06, 0.07]} m={aluminio()} />
            <Caixa p={[xc, H - 0.04, z]} s={[len, 0.08, 0.08]} m={aluminio()} />
            {Array.from({ length: montantes + 1 }).map((_, k) => (
              <Caixa key={k} p={[a + (len * k) / montantes, H / 2, z]} s={[0.04, H, 0.06]} m={aluminio()} />
            ))}
          </group>
        );
      })}
    </group>
  );
}

function inox() {
  return mat("#c7ccd1", 0.25, 0.9);
}

function Placa({ nome, cor, x, z }: { nome: string; cor: string; x: number; z: number }) {
  const t = texturaPlaca(nome, cor);
  return (
    <mesh position={[x, 2.48, z]}>
      <planeGeometry args={[1.2, 0.24]} />
      <meshStandardMaterial map={t} roughness={0.5} />
    </mesh>
  );
}

// ---------- corredor ----------

function Corredor() {
  const logo = texturaLogo();
  return (
    <group>
      <Tapete posicao={[0, -0.5]} tamanho={[31, 1.7]} cor="#4b5059" borda="#31353b" />
      {/* recepção */}
      <group position={[-15.6, 0, 1.75]}>
        <Caixa p={[0, 0.53, 0]} s={[3.2, 1.06, 0.7]} m={mat("#f1efea", 0.5)} sombra recebe />
        <Caixa p={[0, 1.08, -0.05]} s={[3.3, 0.04, 0.85]} m={mat("#6b4a33", 0.45)} sombra />
        <mesh position={[0, 0.6, 0.352]}>
          <planeGeometry args={[2.4, 0.6]} />
          <meshStandardMaterial map={logo} roughness={0.4} />
        </mesh>
        <Caixa p={[0.9, 1.25, -0.1]} s={[0.4, 0.28, 0.02]} m={mat("#16181c", 0.3)} />
      </group>
      <Planta posicao={[-17.4, 2.5]} semente={2} />
      <Planta posicao={[-17.4, -3.45]} tipo="baixa" semente={3} />
      <Planta posicao={[-6.0, -3.45]} semente={4} />
      <Planta posicao={[6.6, -3.45]} tipo="baixa" semente={5} />
      <Planta posicao={[15.2, -3.45]} semente={6} />
      <Planta posicao={[-4.2, 2.5]} tipo="baixa" semente={7} />
      <Planta posicao={[10.7, 2.5]} semente={1} />
      <Planta posicao={[17.4, 2.5]} tipo="baixa" semente={8} />
      {/* bancos de espera */}
      {[1.2, 15.5].map((x) => (
        <group key={x} position={[x, 0, 2.55]}>
          <Caixa p={[0, 0.44, 0]} s={[1.8, 0.06, 0.45]} m={mat("#7a5a40", 0.5)} sombra recebe />
          {[-0.8, 0.8].map((dx) => <Caixa key={dx} p={[dx, 0.21, 0]} s={[0.05, 0.42, 0.4]} m={acoPreto()} />)}
        </group>
      ))}
    </group>
  );
}

// ---------- salas de trabalho (sem as mesas dos agentes) ----------

function SalasDeTrabalho() {
  const quadro = texturaQuadro();
  return (
    <group>
      {SALAS.filter((s) => s.fileira === "fundo").map((s, i) => (
        <group key={s.id}>
          <Planta posicao={[s.x0 + 0.5, CORREDOR.z0 - 0.55]} tipo="baixa" semente={i + 2} escala={0.95} />
          {/* gaveteiro de aço no canto do fundo */}
          <group position={[s.x1 - 0.45, 0, PREDIO.z0 + 0.45]}>
            <Caixa p={[0, 0.66, 0]} s={[0.48, 1.32, 0.6]} m={mat("#b8bcc2", 0.4, 0.4)} sombra recebe />
            {[0.28, 0.6, 0.92, 1.24].map((y) => (
              <Caixa key={y} p={[0, y, 0.302]} s={[0.2, 0.03, 0.02]} m={acoPreto()} />
            ))}
          </group>
        </group>
      ))}
      {/* Direção: mesinha redonda de conversa */}
      <group position={[-16.7, 0, -5.0]}>
        <mesh position={[0, 0.73, 0]} material={mat("#efe9df", 0.4)} castShadow receiveShadow>
          <cylinderGeometry args={[0.55, 0.55, 0.04, 32]} />
        </mesh>
        <Caixa p={[0, 0.36, 0]} s={[0.06, 0.72, 0.06]} m={acoPreto()} />
        <mesh position={[0, 0.015, 0]} material={acoPreto()}>
          <cylinderGeometry args={[0.28, 0.3, 0.03, 24]} />
        </mesh>
        <CadeiraEscritorio posicao={[-0.85, 0]} rotacao={-Math.PI / 2} cor="#6b5b4d" />
        <CadeiraEscritorio posicao={[0.85, 0]} rotacao={Math.PI / 2} cor="#6b5b4d" />
      </group>
      {/* Sistemas: quadro branco na parede da esquerda */}
      <group position={[SALA.sistemas.x0 + ESPESSURA / 2 + 0.02, 1.55, -7.0]} rotation-y={Math.PI / 2}>
        <Caixa p={[0, 0, -0.005]} s={[2.3, 1.38, 0.03]} m={aluminio()} />
        <mesh position={[0, 0, 0.012]}>
          <planeGeometry args={[2.2, 1.29]} />
          <meshStandardMaterial map={quadro} roughness={0.25} />
        </mesh>
        <Caixa p={[0, -0.72, 0.05]} s={[1.6, 0.03, 0.08]} m={aluminio()} />
      </group>
    </group>
  );
}

// ---------- mesa do agente com monitor ----------

const TAMPO = new RoundedBoxGeometry(1.8, 0.04, 0.85, 2, 0.015);

export function MesaAgente({
  posicao, nome, estado, cor, selecionado, onClick, semente = 0,
}: {
  posicao: [number, number];
  nome: string;
  estado: EstadoAgente;
  cor: string;
  selecionado: boolean;
  onClick: () => void;
  semente?: number;
}) {
  const [hover, setHover] = useState(false);
  return (
    <group position={[posicao[0], 0, posicao[1]]}>
      <mesh geometry={TAMPO} material={mat("#d9c4a6", 0.5)} position={[0, 0.74, 0]} castShadow receiveShadow />
      {/* pés em quadro de aço */}
      {[-0.84, 0.84].map((x) => (
        <group key={x}>
          {[-0.36, 0.36].map((z) => <Caixa key={z} p={[x, 0.36, z]} s={[0.05, 0.72, 0.05]} m={acoPreto()} />)}
          <Caixa p={[x, 0.02, 0]} s={[0.05, 0.04, 0.78]} m={acoPreto()} />
          <Caixa p={[x, 0.69, 0]} s={[0.05, 0.04, 0.78]} m={acoPreto()} />
        </group>
      ))}
      <Caixa p={[0, 0.5, -0.38]} s={[1.62, 0.34, 0.02]} m={mat("#8b9097", 0.95)} />
      <Caixa p={[0.58, 0.29, -0.12]} s={[0.42, 0.56, 0.5]} m={mat("#eceae6", 0.5)} sombra />
      {/* teclado, mouse, caneca e papéis */}
      <Caixa p={[0, 0.772, 0.24]} s={[0.44, 0.018, 0.14]} m={mat("#e2e4e7", 0.6)} />
      <Caixa p={[0, 0.782, 0.24]} s={[0.4, 0.004, 0.11]} m={mat("#9aa0a6", 0.7)} />
      <Caixa p={[0.33, 0.775, 0.25]} s={[0.06, 0.025, 0.1]} m={mat("#2b2e33", 0.4)} />
      <mesh position={[-0.58, 0.81, 0.18]} material={mat(cor, 0.4)} castShadow>
        <cylinderGeometry args={[0.042, 0.038, 0.1, 16]} />
      </mesh>
      <Caixa p={[-0.36, 0.763, 0.0]} s={[0.21, 0.004, 0.29]} m={mat("#fbfaf7", 0.9)} r={[0, 0.25, 0]} />
      <Caixa p={[-0.33, 0.767, 0.02]} s={[0.21, 0.004, 0.29]} m={mat("#f2efe8", 0.9)} r={[0, 0.05, 0]} />
      <Luminaria posicao={[-0.74, 0.76, -0.26]} rotacao={0.2} />
      {semente % 2 === 0 && (
        <group position={[0, 0.76, 0]}>
          <Planta posicao={[0.72, -0.28]} tipo="baixa" escala={0.3} semente={semente} />
        </group>
      )}
      <Monitor nome={nome} estado={estado} selecionado={selecionado || hover} onClick={onClick} onHover={setHover} />
      <CadeiraEscritorio posicao={[0, 0.72]} />
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
  useEffect(() => () => textura.dispose(), [textura]);
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

  const brilho = estado.status === "trabalhando" ? 0.95 : 0.6;
  return (
    <group position={[0, 0.76, -0.24]}>
      <Caixa p={[0, 0.008, 0]} s={[0.24, 0.016, 0.17]} m={aluminio()} />
      <Caixa p={[0, 0.2, -0.04]} s={[0.05, 0.36, 0.025]} m={aluminio()} />
      <group position={[0, 0.5, 0]}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={(e) => { e.stopPropagation(); onHover(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { onHover(false); document.body.style.cursor = ""; }}>
        <Caixa p={[0, 0, 0]} s={[1.0, 0.6, 0.025]} m={selecionado ? mat("#2563eb", 0.4) : mat("#111214", 0.35)} sombra />
        <mesh position={[0, 0.005, 0.0135]}>
          <planeGeometry args={[0.97, 0.57]} />
          <meshStandardMaterial map={textura} emissive="#ffffff" emissiveMap={textura} emissiveIntensity={brilho}
            toneMapped={false} roughness={0.2} />
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
  const s = SALA.arquivo;
  return (
    <group>
      {setores.map((st, i) => (
        <Estante key={st.id} x={ARQUIVO_X0 + i * ARQUIVO_PASSO} setor={st} quantidade={contagem[st.id] ?? 0}
          onClick={() => onAbrir(st.id)} alturaRotulo={i % 2 ? 2.75 : 2.35} />
      ))}
      {/* mesa de consulta com caixas */}
      <group position={[(s.x0 + s.x1) / 2 + 0.6, 0, 8.6]}>
        <mesh geometry={TAMPO} material={mat("#d9c4a6", 0.5)} position={[0, 0.74, 0]} scale={[1.3, 1, 1.2]} castShadow receiveShadow />
        {[-1.1, 1.1].map((x) => <Caixa key={x} p={[x, 0.36, 0]} s={[0.06, 0.72, 0.9]} m={acoPreto()} />)}
        <Caixa p={[-0.5, 0.88, 0.05]} s={[0.4, 0.24, 0.3]} m={mat("#c9a77c", 0.9)} sombra />
        <Caixa p={[-0.05, 0.85, -0.1]} s={[0.38, 0.18, 0.28]} m={mat("#b8946a", 0.9)} sombra r={[0, 0.3, 0]} />
        <Caixa p={[0.6, 0.77, 0.1]} s={[0.24, 0.02, 0.32]} m={mat("#f6f4ef", 0.9)} r={[0, -0.2, 0]} />
        <CadeiraEscritorio posicao={[0, 0.95]} cor="#4b5563" />
      </group>
      <Planta posicao={[s.x1 - 0.5, s.z1 - 0.6]} semente={9} />
      <Tapete posicao={[(s.x0 + s.x1) / 2 + 0.6, 8.6]} tamanho={[4.4, 3.0]} cor="#7a7f86" borda="#5b6068" />
    </group>
  );
}

function Estante({
  x, setor, quantidade, onClick, alturaRotulo,
}: {
  x: number;
  setor: SetorInfo;
  quantidade: number;
  onClick: () => void;
  alturaRotulo: number; // alternada, para os rótulos vizinhos não se sobreporem
}) {
  const [hover, setHover] = useState(false);
  const cor = SETOR_COR[setor.id] ?? "#888780";
  const PRAT = 4;
  const POR_PRAT = 8;
  const pastas = Math.min(quantidade, PRAT * POR_PRAT);
  const madeira = mat(hover ? cor : "#5a4230", 0.55);
  return (
    <group position={[x, 0, ARQUIVO_Z]}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = ""; }}>
      {[-0.49, 0.49].map((lx) => <Caixa key={lx} p={[lx, 1.05, 0]} s={[0.04, 2.1, 0.44]} m={madeira} sombra />)}
      <Caixa p={[0, 1.05, -0.2]} s={[1.0, 2.1, 0.02]} m={mat("#d9cbb8", 0.8)} />
      {Array.from({ length: PRAT + 1 }).map((_, i) => (
        <Caixa key={i} p={[0, 0.08 + i * 0.5, 0]} s={[0.96, 0.03, 0.44]} m={mat("#c9ab86", 0.55)} sombra recebe />
      ))}
      {/* pastas: uma por documento do setor */}
      {Array.from({ length: pastas }).map((_, i) => {
        const prat = Math.floor(i / POR_PRAT);
        const col = i % POR_PRAT;
        const tom = i % 3 === 0 ? cor : i % 3 === 1 ? tonalidade(cor, 0.8) : tonalidade(cor, 1.15);
        return (
          <Caixa key={i} p={[-0.4 + col * 0.11, 0.1 + prat * 0.5 + 0.17, 0.02]}
            s={[0.085, 0.32 + ((i * 7) % 5) * 0.012, 0.3]} m={mat(tom, 0.7)} sombra />
        );
      })}
      <Html position={[0, alturaRotulo, 0]} center pointerEvents="none" distanceFactor={13}>
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
  const nogueira = mat(hover ? "#7a5236" : "#5b3d2a", 0.45);
  return (
    <group>
      <Tapete posicao={[mx, mz + 0.4]} tamanho={[5.4, 4.0]} cor="#b9ad9c" borda="#8b7d69" />
      <group position={[mx, 0, mz]}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = ""; }}>
        {/* mesa executiva: você senta em -z; o painel da frente fica para nós */}
        <Caixa p={[0, 0.75, 0]} s={[2.6, 0.05, 1.05]} m={nogueira} sombra recebe />
        {[-1.27, 1.27].map((x) => <Caixa key={x} p={[x, 0.37, 0]} s={[0.06, 0.74, 1.0]} m={nogueira} sombra />)}
        <Caixa p={[0, 0.43, 0.47]} s={[2.5, 0.62, 0.04]} m={nogueira} sombra />
        <Caixa p={[0, 0.43, 0.495]} s={[2.3, 0.02, 0.01]} m={mat("#c8a46a", 0.3, 0.8)} />
        {/* pilha de demandas aguardando você */}
        {Array.from({ length: pilha }).map((_, i) => (
          <Caixa key={i} p={[-0.85 + (i % 2) * 0.02, 0.785 + i * 0.022, 0.05 + (i % 3) * 0.015]}
            s={[0.3, 0.018, 0.42]} r={[0, (i % 4) * 0.06, 0]} m={mat(i % 2 ? "#fbfaf7" : "#f2efe6", 0.9)} sombra />
        ))}
        <mesh ref={luz} position={[-0.85, 0.81 + pilha * 0.022, 0.05]}>
          <sphereGeometry args={[0.035, 12, 12]} />
          <meshStandardMaterial color="#f0a43a" emissive="#f0a43a" toneMapped={false} />
        </mesh>
        {/* notebook aberto, com a tela virada para você */}
        <Caixa p={[0.4, 0.785, -0.12]} s={[0.36, 0.015, 0.25]} m={mat("#c7cbd1", 0.3, 0.6)} />
        <group position={[0.4, 0.79, 0.0]} rotation-x={0.3}>
          <Caixa p={[0, 0.12, 0]} s={[0.36, 0.24, 0.012]} m={mat("#c7cbd1", 0.3, 0.6)} />
          <mesh position={[0, 0.12, -0.007]} rotation-y={Math.PI} material={emissivo("#bcd4f5", 0.5)}>
            <planeGeometry args={[0.33, 0.21]} />
          </mesh>
        </group>
        <Caixa p={[0, 0.8, 0.38]} s={[0.36, 0.07, 0.05]} r={[-0.4, 0, 0]} m={mat("#1f1f22", 0.4)} />
        <mesh position={[0.95, 0.82, 0.15]} material={mat("#f5f5f4", 0.3)} castShadow>
          <cylinderGeometry args={[0.042, 0.038, 0.1, 16]} />
        </mesh>
        <Luminaria posicao={[1.05, 0.775, -0.3]} rotacao={-0.6} />
      </group>
      <CadeiraEscritorio posicao={CADEIRA_RAFAEL} rotacao={Math.PI} cor="#1b1e23" />
      {/* cadeiras de visita, viradas para você */}
      <CadeiraEscritorio posicao={[mx - 0.6, mz + 1.05]} cor="#6b4f3a" />
      <CadeiraEscritorio posicao={[mx + 0.6, mz + 1.05]} cor="#6b4f3a" />
      <EstanteLivros posicao={[mx, CORREDOR.z1 + 0.32]} largura={3.6} />
      <Sofa posicao={[SALA.rafael.x0 + 0.65, 8.4]} rotacao={Math.PI / 2} cor="#55606d" />
      <MesaCentro posicao={[SALA.rafael.x0 + 1.85, 8.4]} />
      <Planta posicao={[SALA.rafael.x0 + 0.5, CORREDOR.z1 + 0.6]} semente={3} />
      <Planta posicao={[SALA.rafael.x1 - 0.5, SALA.rafael.z1 - 0.6]} tipo="baixa" semente={4} />
      {/* luminária de pé */}
      <group position={[SALA.rafael.x0 + 0.5, 0, 10.3]}>
        <mesh position={[0, 0.015, 0]} material={acoPreto()}>
          <cylinderGeometry args={[0.18, 0.2, 0.03, 20]} />
        </mesh>
        <Caixa p={[0, 0.8, 0]} s={[0.03, 1.6, 0.03]} m={acoPreto()} />
        <mesh position={[0, 1.65, 0]} material={mat("#efe6d6", 0.9)} castShadow>
          <cylinderGeometry args={[0.18, 0.25, 0.3, 24, 1, true]} />
        </mesh>
        <mesh position={[0, 1.55, 0]} material={emissivo("#ffe2b0", 1.4)}>
          <sphereGeometry args={[0.06, 12, 10]} />
        </mesh>
      </group>
    </group>
  );
}

// ---------- sala de reunião com TV ----------

const TAMPO_REUNIAO = new RoundedBoxGeometry(4.8, 0.05, 1.4, 3, 0.02);

export function SalaReuniao({ painel }: { painel: PainelTV }) {
  const [mx, mz] = MESA_REUNIAO;
  const lados = [-1.65, -0.55, 0.55, 1.65];
  return (
    <group>
      <group position={[mx, 0, mz]}>
        <mesh geometry={TAMPO_REUNIAO} material={mat("#c6ae8e", 0.4)} position={[0, 0.75, 0]} castShadow receiveShadow />
        {[-1.7, 1.7].map((x) => (
          <group key={x}>
            <Caixa p={[x, 0.37, 0]} s={[0.1, 0.72, 0.7]} m={acoPreto()} sombra />
            <Caixa p={[x, 0.02, 0]} s={[0.14, 0.04, 1.0]} m={acoPreto()} />
          </group>
        ))}
        {/* telefone de conferência, copos e cadernos */}
        <mesh position={[0, 0.79, 0]} material={mat("#1f2125", 0.4)}>
          <cylinderGeometry args={[0.16, 0.18, 0.03, 3]} />
        </mesh>
        {lados.map((x, i) => (
          <group key={x}>
            <mesh position={[x + 0.25, 0.83, -0.38]} material={vidro()}>
              <cylinderGeometry args={[0.035, 0.03, 0.12, 12]} />
            </mesh>
            {i % 2 === 0 && <Caixa p={[x, 0.785, 0.38]} s={[0.22, 0.012, 0.3]} m={mat("#1f2937", 0.7)} r={[0, 0.15, 0]} />}
          </group>
        ))}
        {lados.map((x) => <CadeiraEscritorio key={`a${x}`} posicao={[x, -1.0]} rotacao={Math.PI} cor="#3b4250" />)}
        {lados.map((x) => <CadeiraEscritorio key={`b${x}`} posicao={[x, 1.0]} cor="#3b4250" />)}
        <CadeiraEscritorio posicao={[-2.85, 0]} rotacao={-Math.PI / 2} cor="#3b4250" />
        <CadeiraEscritorio posicao={[2.85, 0]} rotacao={Math.PI / 2} cor="#3b4250" />
      </group>
      <Televisao painel={painel} />
      {/* aparador sob a TV */}
      <group position={[TV.x, 0, CORREDOR.z1 + 0.32]}>
        <Caixa p={[0, 0.3, 0]} s={[2.8, 0.52, 0.42]} m={mat("#4a3426", 0.5)} sombra recebe />
        <Caixa p={[0, 0.03, 0]} s={[2.7, 0.06, 0.38]} m={acoPreto()} />
        <Caixa p={[0, 0.65, -0.05]} s={[1.1, 0.07, 0.1]} m={mat("#16181c", 0.4)} />
        <Planta posicao={[1.15, 0]} tipo="baixa" escala={0.45} semente={2} />
      </group>
      <Planta posicao={[SALA.reuniao.x0 + 0.5, SALA.reuniao.z1 - 0.6]} semente={5} />
      <Planta posicao={[SALA.reuniao.x1 - 0.5, SALA.reuniao.z1 - 0.6]} semente={8} />
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

  // redesenha quando os dados mudam e a cada 20 s, para o relógio andar
  useEffect(() => {
    const desenhar = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      desenharTV(ctx, ultimo.current);
      textura.needsUpdate = true;
    };
    desenhar();
    const t = setInterval(desenhar, 20000);
    return () => clearInterval(t);
  }, [painel, canvas, textura]);

  return (
    <group position={[TV.x, TV.y, TV.z]}>
      <Caixa p={[0, 0, 0.03]} s={[TV.largura + 0.05, TV.altura + 0.05, 0.05]} m={mat("#0c0d0f", 0.3)} sombra />
      <mesh position={[0, 0, 0.0565]}>
        <planeGeometry args={[TV.largura, TV.altura]} />
        <meshStandardMaterial map={textura} emissive="#ffffff" emissiveMap={textura} emissiveIntensity={0.9}
          toneMapped={false} roughness={0.15} />
      </mesh>
    </group>
  );
}

// ---------- copa ----------

function Copa() {
  const s = SALA.copa;
  const xb = s.x1 - 0.32;
  return (
    <group>
      {/* bancada com armários na parede da direita */}
      <Caixa p={[xb, 0.44, 5.9]} s={[0.6, 0.88, 3.6]} m={mat("#f4f2ee", 0.5)} sombra recebe />
      <Caixa p={[xb - 0.01, 0.9, 5.9]} s={[0.64, 0.04, 3.64]} m={mat("#e6e3dd", 0.2)} sombra recebe />
      <Caixa p={[xb + 0.12, 1.95, 5.9]} s={[0.36, 0.7, 3.6]} m={mat("#f4f2ee", 0.5)} sombra />
      {[4.6, 5.5, 6.4, 7.3].map((z) => <Caixa key={z} p={[xb - 0.302, 0.62, z]} s={[0.02, 0.025, 0.2]} m={inox()} />)}
      {/* cafeteira, micro-ondas, pia */}
      <group position={[xb, 0.92, 4.5]}>
        <Caixa p={[0, 0.18, 0]} s={[0.32, 0.36, 0.3]} m={mat("#1e1f22", 0.3, 0.3)} sombra />
        <Caixa p={[-0.17, 0.27, 0]} s={[0.01, 0.06, 0.12]} m={emissivo("#7dd3fc", 1.2)} />
        <mesh position={[-0.1, 0.05, 0]} material={mat("#f5f5f4", 0.3)}>
          <cylinderGeometry args={[0.035, 0.03, 0.08, 12]} />
        </mesh>
      </group>
      <group position={[xb, 0.92, 6.7]}>
        <Caixa p={[0, 0.16, 0]} s={[0.4, 0.32, 0.55]} m={inox()} sombra />
        <Caixa p={[-0.205, 0.16, -0.05]} s={[0.01, 0.24, 0.38]} m={mat("#16181c", 0.2)} />
      </group>
      <Caixa p={[xb - 0.02, 0.921, 5.6]} s={[0.4, 0.005, 0.5]} m={inox()} />
      <Caixa p={[xb + 0.18, 1.05, 5.6]} s={[0.03, 0.25, 0.03]} m={inox()} />
      {/* geladeira e bebedouro */}
      <Caixa p={[s.x1 - 0.4, 0.95, 8.4]} s={[0.72, 1.9, 0.72]} m={inox()} sombra />
      <Caixa p={[s.x1 - 0.77, 1.3, 8.15]} s={[0.02, 0.5, 0.03]} m={acoPreto()} />
      <group position={[s.x0 + 0.5, 0, s.z1 - 0.6]}>
        <Caixa p={[0, 0.5, 0]} s={[0.32, 1.0, 0.32]} m={mat("#f2f2f0", 0.5)} sombra />
        <mesh position={[0, 1.24, 0]} material={vidroAgua()}>
          <cylinderGeometry args={[0.13, 0.13, 0.46, 20]} />
        </mesh>
      </group>
      {/* mesa alta com banquetas */}
      <group position={[15.3, 0, 7.4]}>
        <mesh position={[0, 1.05, 0]} material={mat("#efe9df", 0.35)} castShadow receiveShadow>
          <cylinderGeometry args={[0.45, 0.45, 0.04, 32]} />
        </mesh>
        <Caixa p={[0, 0.52, 0]} s={[0.06, 1.04, 0.06]} m={acoPreto()} />
        <mesh position={[0, 0.015, 0]} material={acoPreto()}>
          <cylinderGeometry args={[0.25, 0.27, 0.03, 24]} />
        </mesh>
        {[0, 2.1, 4.2].map((a) => (
          <group key={a} position={[Math.cos(a) * 0.72, 0, Math.sin(a) * 0.72]}>
            <mesh position={[0, 0.76, 0]} material={mat("#6b4f3a", 0.6)} castShadow>
              <cylinderGeometry args={[0.18, 0.17, 0.05, 20]} />
            </mesh>
            <Caixa p={[0, 0.38, 0]} s={[0.04, 0.76, 0.04]} m={acoPreto()} />
            <mesh position={[0, 0.3, 0]} rotation-x={Math.PI / 2} material={acoPreto()}>
              <torusGeometry args={[0.14, 0.012, 6, 20]} />
            </mesh>
          </group>
        ))}
      </group>
      <Planta posicao={[s.x0 + 0.45, s.z1 - 2.2]} tipo="baixa" semente={6} />
    </group>
  );
}

function vidroAgua() {
  return mat("#93c5fd", 0.1, 0.1);
}

export const PISO_ALTURA = H;
