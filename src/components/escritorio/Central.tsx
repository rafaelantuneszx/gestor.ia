"use client";

// A central: tudo o que não anda. Móveis e paredes viram poucas malhas unidas, o chão já vem com as sombras pintadas e os
// monitores dividem uma textura só. É o que mantém o escritório leve mesmo numa placa de vídeo integrada.
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
  ANEL_1, ANEL_2, ARQUIVO_X, ASSENTOS_REUNIAO, FILEIRA_1, FILEIRA_2, MESA_GESTOR, MESA_REUNIAO, PLATAFORMA_GESTOR, PONTOS_RECARGA, POSTOS, PREDIO,
  RACKS, SETOR_COR, ZONAS, estanteZ, polar,
  type AgenteInfo, type EstadoAgente, type Posto, type SetorInfo,
} from "@/lib/escritorio/modelo";
import { COR_STATUS } from "./status";
import { desenharIndependencia, desenharResultados, desenharServidores, desenharSuspenso, type DadosLed } from "./paineis";
import { desenharTerminal, TELA_H, TELA_W } from "./terminal";
import { desenharTV, TV_H, TV_W, type PainelTV } from "./tv";

type V3 = [number, number, number];
type Balde = "fosco" | "metal" | "brilho" | "luz";

const COR = {
  chassi: "#141c2a", tampo: "#1c2636", grafite: "#0c121c", aco: "#3a4556", claro: "#a9b6c8", parede: "#0a111c",
  ciano: "#3dd6f5", azul: "#3b82f6", nogueira: "#4a3324", planta: "#2f8f5b",
};

// ---------- montador: junta muitas peças numa malha só, com a cor em cada vértice ----------
class Montador {
  baldes: Record<Balde, THREE.BufferGeometry[]> = { fosco: [], metal: [], brilho: [], luz: [] };
  base = new THREE.Matrix4();
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();

  emGrupo(p: V3, giroY: number, f: () => void) {
    const antes = this.base.clone();
    this.base.multiply(new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), giroY), new THREE.Vector3(1, 1, 1)));
    f();
    this.base.copy(antes);
  }

  private por(geo: THREE.BufferGeometry, p: V3, cor: string, balde: Balde, giro: V3 = [0, 0, 0]) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    g.deleteAttribute("uv");
    this.e.set(giro[0], giro[1], giro[2]);
    this.q.setFromEuler(this.e);
    this.m.compose(new THREE.Vector3(...p), this.q, new THREE.Vector3(1, 1, 1));
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(this.base, this.m));
    const c = new THREE.Color(cor);
    const n = g.getAttribute("position").count;
    const cores = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { cores[i * 3] = c.r; cores[i * 3 + 1] = c.g; cores[i * 3 + 2] = c.b; }
    g.setAttribute("color", new THREE.BufferAttribute(cores, 3));
    this.baldes[balde].push(g);
  }

  caixa(p: V3, s: V3, cor: string, balde: Balde = "fosco", giro?: V3) {
    this.por(new THREE.BoxGeometry(s[0], s[1], s[2]), p, cor, balde, giro);
  }
  // Com as quinas arredondadas: pega a luz na borda e tira o aspecto de caixote.
  redonda(p: V3, s: V3, cor: string, balde: Balde = "fosco", raio = 0.02, giro?: V3) {
    this.por(new RoundedBoxGeometry(s[0], s[1], s[2], 2, Math.min(raio, Math.min(...s) * 0.49)), p, cor, balde, giro);
  }
  cil(p: V3, rTopo: number, rBase: number, h: number, cor: string, balde: Balde = "fosco", segmentos = 16, giro?: V3) {
    this.por(new THREE.CylinderGeometry(rTopo, rBase, h, segmentos), p, cor, balde, giro);
  }
  bola(p: V3, raio: number, cor: string, balde: Balde = "fosco") {
    this.por(new THREE.IcosahedronGeometry(raio, 1), p, cor, balde);
  }
  aro(p: V3, raio: number, tubo: number, cor: string, balde: Balde = "luz", segmentos = 48) {
    this.por(new THREE.TorusGeometry(raio, tubo, 6, segmentos), p, cor, balde, [Math.PI / 2, 0, 0]);
  }

  fechar(): Partial<Record<Balde, THREE.BufferGeometry>> {
    const out: Partial<Record<Balde, THREE.BufferGeometry>> = {};
    for (const b of Object.keys(this.baldes) as Balde[]) {
      if (this.baldes[b].length) out[b] = mergeGeometries(this.baldes[b]);
      this.baldes[b].forEach((g) => g.dispose());
    }
    return out;
  }
}

export const MATERIAIS = {
  fosco: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0.08 }),
  metal: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.34, metalness: 0.82 }),
  brilho: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.16, metalness: 0.15 }),
  luz: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
};

function Malhas({ geos }: { geos: Partial<Record<Balde, THREE.BufferGeometry>> }) {
  useEffect(() => () => { Object.values(geos).forEach((g) => g?.dispose()); }, [geos]);
  return (
    <>
      {(Object.keys(geos) as Balde[]).map((b) => <mesh key={b} geometry={geos[b]} material={MATERIAIS[b]} raycast={() => null} />)}
    </>
  );
}

// ---------- monitores: uma textura com todas as telas ----------
const ATLAS_COLS = 4;
const ATLAS_LINHAS = 6;
const CELULA_W = 512;
const CELULA_H = 320;
const IDS_POSTOS = Object.keys(POSTOS);
const SETORES_TELA = ["direcao", "sistemas", "financeiro", "custos", "frota-rh", "suprimentos"];
const NOME_SETOR: Record<string, string> = { direcao: "Direção", sistemas: "Sistemas", financeiro: "Financeiro", custos: "Custos e Contratos", "frota-rh": "Frota e RH", suprimentos: "Suprimentos" };
const CEL_SETOR = (s: string) => IDS_POSTOS.length + Math.max(0, SETORES_TELA.indexOf(s));
const CEL_EQUIPE = IDS_POSTOS.length + SETORES_TELA.length;
const CEL_PENDENTES = CEL_EQUIPE + 1;

function uvDaCelula(c: number): [number, number, number, number] {
  const col = c % ATLAS_COLS;
  const lin = Math.floor(c / ATLAS_COLS);
  return [col / ATLAS_COLS, 1 - (lin + 1) / ATLAS_LINHAS, (col + 1) / ATLAS_COLS, 1 - lin / ATLAS_LINHAS];
}

function desenharSetor(ctx: CanvasRenderingContext2D, setor: string, agentes: AgenteInfo[], estados: Record<string, EstadoAgente>) {
  ctx.fillStyle = "#0b1420";
  ctx.fillRect(0, 0, CELULA_W, CELULA_H);
  ctx.fillStyle = SETOR_COR[setor] ?? COR.ciano;
  ctx.fillRect(0, 0, CELULA_W, 8);
  ctx.fillStyle = "#f1f5f9";
  ctx.font = "700 32px system-ui, sans-serif";
  ctx.fillText(NOME_SETOR[setor] ?? setor, 22, 54);
  const doSetor = agentes.filter((a) => POSTOS[a.id]?.setor === setor).slice(0, 5);
  const ativos = doSetor.filter((a) => estados[a.id]?.status === "trabalhando").length;
  ctx.fillStyle = COR.ciano;
  ctx.font = "600 22px system-ui, sans-serif";
  ctx.fillText(`${ativos} de ${doSetor.length} trabalhando`, 22, 88);
  doSetor.forEach((a, i) => {
    const e = estados[a.id];
    const y = 134 + i * 40;
    ctx.fillStyle = e?.status === "trabalhando" ? COR_STATUS.trabalhando : e?.status === "erro" ? COR_STATUS.atencao : COR_STATUS.livre;
    ctx.beginPath();
    ctx.arc(32, y - 8, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "600 26px system-ui, sans-serif";
    ctx.fillText(a.nome, 54, y);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "22px system-ui, sans-serif";
    ctx.fillText(e?.status === "trabalhando" ? "trabalhando" : e?.status === "erro" ? "atenção" : "livre", 240, y);
  });
}

function desenharEquipe(ctx: CanvasRenderingContext2D, agentes: AgenteInfo[], estados: Record<string, EstadoAgente>) {
  ctx.fillStyle = "#0b1420";
  ctx.fillRect(0, 0, CELULA_W, CELULA_H);
  const ativos = agentes.filter((a) => estados[a.id]?.status === "trabalhando").length;
  ctx.fillStyle = "#94a3b8";
  ctx.font = "600 26px system-ui, sans-serif";
  ctx.fillText("Equipe agora", 24, 56);
  ctx.fillStyle = COR.ciano;
  ctx.font = "700 120px system-ui, sans-serif";
  ctx.fillText(`${ativos}/${agentes.length}`, 24, 190);
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "600 28px system-ui, sans-serif";
  ctx.fillText("robôs trabalhando", 24, 240);
}

function desenharPendentes(ctx: CanvasRenderingContext2D, pendentes: number) {
  ctx.fillStyle = "#0b1420";
  ctx.fillRect(0, 0, CELULA_W, CELULA_H);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "600 26px system-ui, sans-serif";
  ctx.fillText("Esperando você", 24, 56);
  ctx.fillStyle = pendentes > 0 ? "#fbbf24" : "#34d399";
  ctx.font = "700 140px system-ui, sans-serif";
  ctx.fillText(String(pendentes), 24, 205);
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "600 28px system-ui, sans-serif";
  ctx.fillText(pendentes === 1 ? "decisão" : "decisões", 24, 250);
}

// Redesenha só a célula que mudou e sobe a textura no máximo a cada 2 s. Antes, cada monitor subia a sua duas vezes por segundo.
function useAtlas(agentes: AgenteInfo[], estados: Record<string, EstadoAgente>, pendentes: number) {
  const { canvas, textura } = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = CELULA_W * ATLAS_COLS;
    c.height = CELULA_H * ATLAS_LINHAS;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return { canvas: c, textura: t };
  }, []);
  useEffect(() => () => textura.dispose(), [textura]);
  const vistos = useRef(new Map<string, EstadoAgente>());
  const ultimo = useRef({ agentes, estados, pendentes });
  ultimo.current = { agentes, estados, pendentes };
  const pendurado = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const desenhar = () => {
      pendurado.current = null;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const { agentes: lista, estados: est, pendentes: p } = ultimo.current;
      const emCelula = (cel: number, f: () => void) => {
        ctx.save();
        ctx.translate((cel % ATLAS_COLS) * CELULA_W, Math.floor(cel / ATLAS_COLS) * CELULA_H);
        ctx.beginPath();
        ctx.rect(0, 0, CELULA_W, CELULA_H);
        ctx.clip();
        f();
        ctx.restore();
      };
      lista.forEach((a) => {
        const i = IDS_POSTOS.indexOf(a.id);
        const e = est[a.id];
        if (i < 0 || !e || vistos.current.get(a.id) === e) return;
        vistos.current.set(a.id, e);
        emCelula(i, () => {
          ctx.scale(CELULA_W / TELA_W, CELULA_H / TELA_H);
          desenharTerminal(ctx, a.nome, e, false);
        });
      });
      SETORES_TELA.forEach((s) => emCelula(CEL_SETOR(s), () => desenharSetor(ctx, s, lista, est)));
      emCelula(CEL_EQUIPE, () => desenharEquipe(ctx, lista, est));
      emCelula(CEL_PENDENTES, () => desenharPendentes(ctx, p));
      textura.needsUpdate = true;
    };
    if (vistos.current.size === 0) { desenhar(); return; }
    if (!pendurado.current) pendurado.current = setTimeout(desenhar, 2000);
  }, [agentes, estados, pendentes, canvas, textura]);
  useEffect(() => () => { if (pendurado.current) clearTimeout(pendurado.current); }, []);
  return textura;
}

// Uma mesa de trabalho, com as telas e o que aquela função usa.
function montarMesa(m: Montador, telas: PlanoTela[], id: string, p: Posto) {
  const largura = p.telas === 3 ? 2.75 : p.telas === 2 ? 2.2 : 1.8;
  const [x, z] = polar(p.r, p.angulo);
  const cor = SETOR_COR[p.setor] ?? COR.ciano;
  m.emGrupo([x, 0, z], p.angulo, () => {
    // tampo, laterais, painel e a linha de luz na cor do setor
    m.redonda([0, 0.74, 0], [largura, 0.05, 0.86], COR.tampo, "fosco", 0.02);
    m.caixa([0, 0.765, 0.4], [largura - 0.1, 0.006, 0.04], cor, "luz");
    for (const lx of [-largura / 2 + 0.06, largura / 2 - 0.06]) m.caixa([lx, 0.37, 0], [0.05, 0.72, 0.78], COR.chassi, "metal");
    m.caixa([0, 0.42, -0.34], [largura - 0.2, 0.56, 0.03], COR.grafite);
    m.caixa([0, 0.04, -0.3], [largura - 0.1, 0.012, 0.03], cor, "luz");
    // teclado e canecas: a mesa em uso
    m.redonda([0, 0.775, 0.16], [0.44, 0.018, 0.15], COR.grafite, "fosco", 0.006);
    m.caixa([0, 0.786, 0.16], [0.4, 0.004, 0.11], "#26303f");
    m.redonda([0.34, 0.772, 0.16], [0.07, 0.016, 0.11], COR.grafite, "fosco", 0.006);
    // braço e telas
    const n = p.telas;
    const lugares = n === 1 ? [[0, 0]] : n === 2 ? [[-0.39, 0.16], [0.39, -0.16]] : [[-0.78, 0.34], [0, 0], [0.78, -0.34]];
    const celulas = n === 1 ? [IDS_POSTOS.indexOf(id)] : n === 2 ? [IDS_POSTOS.indexOf(id), CEL_SETOR(p.setor)] : [CEL_SETOR(p.setor), IDS_POSTOS.indexOf(id), CEL_EQUIPE];
    lugares.forEach(([lx, giro], i) => {
      const lz = -0.2 + Math.abs(lx) * 0.24;
      m.emGrupo([lx, 0, lz], giro, () => {
        m.caixa([0, 0.92, -0.045], [0.045, 0.3, 0.03], COR.aco, "metal");
        m.redonda([0, 0.775, -0.045], [0.22, 0.014, 0.16], COR.aco, "metal", 0.006);
        m.redonda([0, 1.18, 0], [0.76, 0.49, 0.028], "#090d14", "brilho", 0.012);
        telas.push({ matriz: m.base.clone(), p: [0, 1.18, 0.0155], w: 0.725, h: 0.453, celula: celulas[i], dono: id });
      });
    });
    montarKit(m, p.kit, largura);
  });
}

function montarKit(m: Montador, kit: Posto["kit"], w: number) {
  const fora = w / 2 + 0.34;
  const emCima = w / 2 - 0.3;
  if (kit === "direcao") {
    // painel holográfico sobre a mesa
    m.cil([emCima, 0.785, -0.1], 0.13, 0.15, 0.03, COR.aco, "metal");
    m.aro([emCima, 0.81, -0.1], 0.11, 0.006, "#a78bfa");
    m.aro([emCima, 0.95, -0.1], 0.08, 0.004, "#a78bfa");
    m.aro([emCima, 1.07, -0.1], 0.05, 0.004, "#a78bfa");
  } else if (kit === "sistemas") {
    // torre de servidor ao lado da mesa
    m.redonda([fora, 0.55, -0.1], [0.4, 1.1, 0.56], COR.grafite, "metal", 0.02);
    for (let i = 0; i < 6; i++) m.caixa([fora, 0.2 + i * 0.15, 0.181], [0.3, 0.018, 0.004], i % 2 ? "#34d399" : COR.ciano, "luz");
  } else if (kit === "financeiro") {
    // impressora de relatórios e pilha de papéis
    m.redonda([emCima, 0.83, -0.12], [0.36, 0.13, 0.28], "#c7d0dc", "fosco", 0.02);
    m.caixa([emCima, 0.9, -0.2], [0.24, 0.01, 0.16], "#f4f6f9");
    m.caixa([emCima - 0.02, 0.905, -0.2], [0.04, 0.004, 0.04], "#34d399", "luz");
    for (let i = 0; i < 5; i++) m.caixa([-emCima, 0.772 + i * 0.012, 0.1], [0.24, 0.01, 0.32], i % 2 ? "#f4f6f9" : "#dbe3ee", "fosco", [0, i * 0.05, 0]);
  } else if (kit === "custos") {
    // plantas de obra sobre a mesa e rolos ao lado
    m.caixa([-emCima + 0.02, 0.77, 0.14], [0.46, 0.005, 0.32], "#7fb0e8", "fosco", [0, 0.12, 0]);
    m.cil([fora - 0.06, 0.32, 0], 0.13, 0.11, 0.64, COR.aco, "metal");
    [[-0.05, 0], [0.05, 0.03], [0, -0.05]].forEach(([dx, dz]) => m.cil([fora - 0.06 + dx, 0.62, dz], 0.028, 0.028, 0.72, "#dbeafe", "fosco", 8));
  } else if (kit === "frota") {
    // miniatura de caminhão e mapa das rotas
    m.emGrupo([emCima - 0.02, 0.77, -0.05], 0.4, () => {
      m.redonda([0.05, 0.06, 0], [0.2, 0.11, 0.1], "#f59e0b", "fosco", 0.012);
      m.redonda([-0.11, 0.045, 0], [0.09, 0.09, 0.1], "#dbe3ee", "fosco", 0.012);
      [[-0.12, 0.05], [-0.12, -0.05], [0.09, 0.05], [0.09, -0.05]].forEach(([dx, dz]) => m.cil([dx, 0.012, dz], 0.018, 0.018, 0.012, "#0c121c", "fosco", 8, [Math.PI / 2, 0, 0]));
    });
    m.caixa([-emCima + 0.02, 0.77, 0.12], [0.42, 0.005, 0.3], "#3a6b52", "fosco", [0, -0.1, 0]);
  } else if (kit === "rh") {
    // fichas e pastas por cor
    ["#60a5fa", "#fbbf24", "#34d399", "#a78bfa"].forEach((c, i) => m.redonda([emCima - 0.05, 0.79 + i * 0.03, -0.05], [0.28, 0.026, 0.36], c, "fosco", 0.004, [0, i * 0.08, 0]));
  } else if (kit === "suprimentos") {
    // caixas ao lado da mesa
    m.redonda([fora, 0.2, -0.05], [0.46, 0.4, 0.42], "#b08a5a", "fosco", 0.01);
    m.redonda([fora - 0.02, 0.54, -0.04], [0.36, 0.28, 0.34], "#c29a68", "fosco", 0.01, [0, 0.2, 0]);
    m.caixa([fora, 0.2, 0.167], [0.2, 0.09, 0.004], "#f4f6f9");
  }
}

type PlanoTela = { matriz: THREE.Matrix4; p: V3; w: number; h: number; celula: number; dono: string };

// Todas as telas das mesas numa malha só; o clique descobre de quem é pelo triângulo.
function TelasDasMesas({ planos, textura, onClick }: { planos: PlanoTela[]; textura: THREE.Texture; onClick: (id: string) => void }) {
  const { geo, donos } = useMemo(() => {
    const partes: THREE.BufferGeometry[] = [];
    const donos: (string | null)[] = [];
    for (const t of planos) {
      const g = new THREE.PlaneGeometry(t.w, t.h).toNonIndexed();
      const [u0, v0, u1, v1] = uvDaCelula(t.celula);
      const uv = g.getAttribute("uv") as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) ? u1 : u0, uv.getY(i) ? v1 : v0);
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(t.matriz, new THREE.Matrix4().makeTranslation(...t.p)));
      partes.push(g);
      donos.push(t.dono, t.dono);
    }
    return { geo: mergeGeometries(partes), donos };
  }, [planos]);
  useEffect(() => () => geo.dispose(), [geo]);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ map: textura, toneMapped: false }), [textura]);
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh geometry={geo} material={material}
      onClick={(e) => { e.stopPropagation(); const d = e.faceIndex != null ? donos[e.faceIndex] : null; if (d) onClick(d); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { document.body.style.cursor = ""; }} />
  );
}

// ---------- chão: as sombras e a luz já vêm pintadas ----------
function criarPiso(alta: boolean): THREE.CanvasTexture {
  const X0 = PREDIO.x0 - 1;
  const Z0 = PREDIO.z0 - 1;
  const W = PREDIO.x1 - PREDIO.x0 + 2;
  const D = PREDIO.z1 - PREDIO.z0 + 2;
  const k = (alta ? 3072 : 2048) / W;
  const c = document.createElement("canvas");
  c.width = Math.round(W * k);
  c.height = Math.round(D * k);
  const ctx = c.getContext("2d")!;
  const px = (x: number) => (x - X0) * k;
  const pz = (z: number) => (z - Z0) * k;

  const fundo = ctx.createLinearGradient(0, 0, 0, c.height);
  fundo.addColorStop(0, "#101b2d");
  fundo.addColorStop(0.55, "#0c1524");
  fundo.addColorStop(1, "#0a111d");
  ctx.fillStyle = fundo;
  ctx.fillRect(0, 0, c.width, c.height);

  // placas do piso elevado
  for (let x = Math.ceil(X0); x <= X0 + W; x++) {
    ctx.strokeStyle = x % 5 === 0 ? "rgba(140,185,255,0.085)" : "rgba(140,185,255,0.04)";
    ctx.lineWidth = x % 5 === 0 ? 1.6 : 1;
    ctx.beginPath(); ctx.moveTo(px(x), 0); ctx.lineTo(px(x), c.height); ctx.stroke();
  }
  for (let z = Math.ceil(Z0); z <= Z0 + D; z++) {
    ctx.strokeStyle = z % 5 === 0 ? "rgba(140,185,255,0.085)" : "rgba(140,185,255,0.04)";
    ctx.lineWidth = z % 5 === 0 ? 1.6 : 1;
    ctx.beginPath(); ctx.moveTo(0, pz(z)); ctx.lineTo(c.width, pz(z)); ctx.stroke();
  }

  // Ângulo em canvas: 0 aponta para +x, e o arco cresce em direção a +z.
  const arcoEm = (r: number, a0: number, a1: number) => {
    const fx = px(polar(0, 0)[0]);
    const fz = pz(polar(0, 0)[1]);
    ctx.beginPath();
    ctx.arc(fx, fz, r * k, Math.PI / 2 - a1, Math.PI / 2 - a0);
  };
  // luz da parede de telas no chão
  const luz = ctx.createLinearGradient(0, pz(PREDIO.z0), 0, pz(PREDIO.z0 + 10));
  luz.addColorStop(0, "rgba(61,214,245,0.28)");
  luz.addColorStop(1, "rgba(61,214,245,0)");
  ctx.fillStyle = luz;
  ctx.fillRect(px(-20), pz(PREDIO.z0), px(20) - px(-20), pz(PREDIO.z0 + 10) - pz(PREDIO.z0));

  // faixas sob as fileiras, com o trecho de cada setor
  for (const [r, largura, abertura] of [[FILEIRA_1 + 0.35, 2.7, 0.98], [FILEIRA_2 + 0.35, 2.7, 0.72]] as const) {
    ctx.lineWidth = largura * k;
    ctx.strokeStyle = "rgba(24,36,58,0.9)";
    arcoEm(r, -abertura, abertura);
    ctx.stroke();
  }
  for (const p of Object.values(POSTOS)) {
    const passo = p.r === FILEIRA_1 ? 0.14 : 0.087;
    ctx.lineWidth = 2.7 * k;
    ctx.strokeStyle = `${SETOR_COR[p.setor] ?? COR.ciano}26`;
    arcoEm(p.r + 0.35, p.angulo - passo, p.angulo + passo);
    ctx.stroke();
  }
  // corredores
  ctx.setLineDash([0.5 * k, 0.45 * k]);
  ctx.lineWidth = 0.05 * k;
  ctx.strokeStyle = "rgba(61,214,245,0.42)";
  arcoEm(ANEL_1, -1.2, 1.2); ctx.stroke();
  arcoEm(ANEL_2, -0.86, 0.86); ctx.stroke();
  ctx.setLineDash([]);

  const sombra = (x: number, z: number, w: number, d: number, giro: number, forca: number, cor = "0,0,0") => {
    ctx.save();
    ctx.translate(px(x), pz(z));
    ctx.rotate(-giro);
    ctx.scale((w * k) / 2, (d * k) / 2);
    const g = ctx.createRadialGradient(0, 0, 0.1, 0, 0, 1);
    g.addColorStop(0, `rgba(${cor},${forca})`);
    g.addColorStop(0.62, `rgba(${cor},${forca * 0.72})`);
    g.addColorStop(1, `rgba(${cor},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // a luz dos monitores no chão, depois a sombra da mesa
  for (const p of Object.values(POSTOS)) {
    const [fx, fz] = polar(p.r + 0.75, p.angulo);
    sombra(fx, fz, 3.1, 2.0, p.angulo, 0.2, "61,214,245");
    const [x, z] = polar(p.r + 0.03, p.angulo);
    sombra(x, z, p.telas === 3 ? 4.0 : 3.4, 1.9, p.angulo, 0.72);
    // lugar do robô, na cor do setor
    const [rx, rz] = polar(p.r + 0.85, p.angulo);
    ctx.strokeStyle = SETOR_COR[p.setor] ?? COR.ciano;
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 0.035 * k;
    ctx.beginPath();
    ctx.arc(px(rx), pz(rz), 0.5 * k, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // nomes dos setores no chão, lidos de quem olha do fundo
  const nomes: [string, number, number][] = [
    ["FROTA E RH", FILEIRA_1 - 1.2, -0.84], ["SUPRIMENTOS", FILEIRA_1 - 1.2, -0.56], ["DIREÇÃO", FILEIRA_1 - 1.2, -0.14],
    ["SISTEMAS", FILEIRA_1 - 1.2, 0.42], ["FINANCEIRO", ANEL_2 + 1.05, -0.3], ["CUSTOS", ANEL_2 + 1.05, 0.44],
  ];
  ctx.textAlign = "center";
  ctx.font = `700 ${Math.round(0.5 * k)}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
  ctx.fillStyle = "rgba(190,215,250,0.5)";
  for (const [t, r, a] of nomes) {
    const [x, z] = polar(r, a);
    ctx.save();
    ctx.translate(px(x), pz(z));
    ctx.rotate(-a);
    ctx.fillText(t, 0, 0);
    ctx.restore();
  }

  // zonas de apoio
  for (const zn of ZONAS) {
    ctx.fillStyle = `${zn.cor}12`;
    ctx.strokeStyle = `${zn.cor}70`;
    ctx.lineWidth = 0.05 * k;
    ctx.beginPath();
    ctx.roundRect(px(zn.x0), pz(zn.z0), (zn.x1 - zn.x0) * k, (zn.z1 - zn.z0) * k, 0.6 * k);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = `${zn.cor}c0`;
    ctx.textAlign = "left";
    ctx.font = `700 ${Math.round(0.42 * k)}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
    ctx.fillText(zn.nome.toUpperCase(), px(zn.x0 + 0.5), pz(zn.z1 - 0.45));
  }

  // sua mesa: plataforma com luz quente
  sombra(MESA_GESTOR[0], MESA_GESTOR[1] + 0.2, 7.6, 7.6, 0, 0.3, "255,190,120");
  sombra(MESA_GESTOR[0], MESA_GESTOR[1], 5.8, 5.8, 0, 0.66);
  // mesa de reunião, servidores, estantes e docas
  sombra(MESA_REUNIAO[0], MESA_REUNIAO[1], 9.4, 4.6, 0, 0.72);
  sombra(MESA_REUNIAO[0], MESA_REUNIAO[1], 5.6, 3.0, 0, 0.26, "61,214,245");
  for (const [x, z] of RACKS) sombra(x, z + 0.1, 1.8, 2.0, 0, 0.42);
  for (const [x, z] of PONTOS_RECARGA) {
    sombra(x, z, 2.6, 2.6, 0, 0.3, "52,211,153");
  }
  sombra(ARQUIVO_X - 0.2, -8, 2.8, 15, 0, 0.6);

  // base das paredes
  const canto = ctx.createLinearGradient(0, pz(PREDIO.z0), 0, pz(PREDIO.z0 + 1.2));
  canto.addColorStop(0, "rgba(0,0,0,0.5)");
  canto.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = canto;
  ctx.fillRect(0, pz(PREDIO.z0), c.width, 1.2 * k);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16;
  return t;
}

const Piso = memo(function Piso({ alta }: { alta: boolean }) {
  const textura = useMemo(() => criarPiso(alta), [alta]);
  useEffect(() => () => textura.dispose(), [textura]);
  const W = PREDIO.x1 - PREDIO.x0 + 2;
  const D = PREDIO.z1 - PREDIO.z0 + 2;
  return (
    <mesh rotation-x={-Math.PI / 2} position={[(PREDIO.x0 + PREDIO.x1) / 2, 0, (PREDIO.z0 + PREDIO.z1) / 2]} raycast={() => null}>
      <planeGeometry args={[W, D]} />
      <meshStandardMaterial map={textura} roughness={0.82} metalness={0} envMapIntensity={0.35} />
    </mesh>
  );
});

// ---------- estrutura: paredes, sua mesa, reunião, servidores, recarga ----------
function montarEstrutura(m: Montador) {
  const { x0, x1, z0, z1 } = PREDIO;
  // parede de telas
  m.caixa([0, 4.6, z0 + 0.2], [x1 - x0, 9.2, 0.4], COR.parede);
  m.caixa([0, 0.05, z0 + 0.45], [x1 - x0, 0.1, 0.12], COR.ciano, "luz");
  // laterais baixas, com nervuras e uma linha de luz
  for (const lado of [-1, 1]) {
    const x = lado > 0 ? x1 : x0;
    const zm = (z0 + z1) / 2;
    m.caixa([x, 1.8, zm], [0.3, 3.6, z1 - z0], COR.parede);
    m.caixa([x - lado * 0.17, 3.45, zm], [0.03, 0.05, z1 - z0], COR.ciano, "luz");
    for (let z = z0 + 2; z < z1; z += 3) m.caixa([x - lado * 0.17, 1.72, z], [0.05, 3.3, 0.14], COR.chassi, "metal");
  }
  // friso de luz na borda aberta
  m.caixa([0, 0.03, z1 + 0.5], [x1 - x0, 0.06, 0.05], COR.azul, "luz");
  m.caixa([0, -0.2, z1 + 0.74], [x1 - x0 + 0.6, 0.5, 0.4], COR.grafite);

  // molduras da parede de telas
  m.redonda([0, 3.35, z0 + 0.46], [10, 5.72, 0.12], "#05080e", "metal", 0.04);
  m.redonda([0, 7.6, z0 + 0.46], [20.3, 2.62, 0.12], "#05080e", "metal", 0.04);
  for (const l of [-1, 1]) m.redonda([l * 9.5, 3.0, z0 + 1.04], [8.3, 3.9, 0.12], "#05080e", "metal", 0.04, [0, -l * 0.3, 0]);

  // sua mesa, no centro da equipe
  const [gx, gz] = MESA_GESTOR;
  m.cil([gx, 0.06, gz + 0.2], PLATAFORMA_GESTOR, PLATAFORMA_GESTOR + 0.05, 0.12, "#1b2433", "fosco", 56);
  m.aro([gx, 0.125, gz + 0.2], PLATAFORMA_GESTOR - 0.03, 0.012, "#f5b57a", "luz", 72);
  m.emGrupo([gx, 0.12, gz], 0, () => {
    m.redonda([0, 0.74, 0], [3.1, 0.07, 1.05], COR.nogueira, "brilho", 0.03);
    m.redonda([1.75, 0.74, 0.35], [0.5, 0.07, 1.3], COR.nogueira, "brilho", 0.03);
    m.caixa([0, 0.42, -0.42], [2.9, 0.6, 0.04], "#2a1d14");
    m.caixa([0, 0.7, -0.49], [2.9, 0.012, 0.012], "#f5b57a", "luz");
    for (const lx of [-1.46, 1.46]) m.caixa([lx, 0.37, 0], [0.07, 0.72, 0.9], "#2a1d14");
    // cadeira: é o seu lugar
    m.cil([0, 0.03, 0.92], 0.3, 0.32, 0.04, COR.aco, "metal", 16);
    m.cil([0, 0.26, 0.92], 0.04, 0.04, 0.42, COR.aco, "metal", 10);
    m.redonda([0, 0.5, 0.92], [0.56, 0.1, 0.54], "#1a1d22", "fosco", 0.04);
    m.redonda([0, 0.92, 1.18], [0.54, 0.78, 0.09], "#1a1d22", "fosco", 0.04, [-0.08, 0, 0]);
    for (const l of [-1, 1]) m.redonda([l * 0.31, 0.68, 0.94], [0.05, 0.04, 0.32], COR.aco, "metal", 0.012);
    // teclado e caneca
    m.redonda([0, 0.785, 0.2], [0.46, 0.018, 0.16], COR.grafite, "fosco", 0.006);
    m.cil([-0.9, 0.84, 0.15], 0.05, 0.045, 0.1, "#e2e8f0", "brilho", 12);
    // luminária
    m.cil([1.26, 0.79, -0.2], 0.09, 0.1, 0.02, COR.aco, "metal", 16);
    m.caixa([1.26, 1.03, -0.2], [0.018, 0.46, 0.018], COR.aco, "metal");
    m.caixa([1.14, 1.26, -0.2], [0.3, 0.025, 0.09], "#ffe6c7", "luz");
  });

  // mesa de reunião aberta, com banquinhos para os robôs
  const [rx, rz] = MESA_REUNIAO;
  m.redonda([rx, 0.76, rz], [6.4, 0.07, 1.65], COR.tampo, "brilho", 0.03);
  m.caixa([rx, 0.8, rz], [5.8, 0.006, 0.05], "#fbbf24", "luz");
  for (const dx of [-2, 2]) {
    m.caixa([rx + dx, 0.38, rz], [0.14, 0.72, 0.9], COR.chassi, "metal");
    m.caixa([rx + dx, 0.025, rz], [0.5, 0.05, 1.2], COR.chassi, "metal");
  }
  m.aro([rx, 0.82, rz], 0.3, 0.008, COR.ciano);
  m.aro([rx, 1.02, rz], 0.2, 0.005, COR.ciano);
  for (const a of ASSENTOS_REUNIAO) m.cil([a.p[0], 0.015, a.p[1]], 0.36, 0.38, 0.03, COR.chassi, "metal", 20);

  // servidores
  for (const [x, z] of RACKS) {
    m.caixa([x, 1.05, z], [0.84, 2.1, 1.0], "#0b0f17", "metal");
    m.caixa([x, 1.05, z + 0.505], [0.76, 1.98, 0.012], "#141b27", "metal");
    m.caixa([x, 2.155, z + 0.47], [0.8, 0.012, 0.03], COR.ciano, "luz");
    for (let i = 0; i < 8; i++) m.caixa([x, 0.34 + i * 0.2, z + 0.513], [0.72, 0.15, 0.01], "#05080e");
  }

  // recarga: doca de piso, torre e cabo
  for (const [x, z] of PONTOS_RECARGA) {
    m.cil([x, 0.025, z], 0.55, 0.58, 0.05, COR.chassi, "metal", 28);
    m.aro([x, 0.056, z], 0.48, 0.012, "#34d399");
    m.redonda([x, 0.75, z - 0.85], [0.3, 1.5, 0.22], COR.tampo, "metal", 0.03);
    m.caixa([x, 1.2, z - 0.735], [0.16, 0.36, 0.006], "#34d399", "luz");
  }

  // plantas: um pouco de vida nos cantos
  const plantas: [number, number, number][] = [[-25, -15.6, 1.2], [-13.8, -15.6, 1], [13.8, -15.6, 1], [25, 9, 1], [-25, 1, 0.9], [14, 1, 0.8], [-14, 9, 0.9], [14, 9.1, 0.8]];
  for (const [x, z, e] of plantas) {
    m.cil([x, 0.22 * e, z], 0.26 * e, 0.2 * e, 0.44 * e, "#1d2736", "fosco", 14);
    for (let i = 0; i < 5; i++) m.bola([x + Math.sin(i * 2.4) * 0.2 * e, (0.68 + (i % 3) * 0.2) * e, z + Math.cos(i * 2.4) * 0.2 * e], (0.28 - i * 0.015) * e, i % 2 ? "#3aa76d" : COR.planta);
  }
}

export const Estrutura = memo(function Estrutura({ alta }: { alta: boolean }) {
  const geos = useMemo(() => { const m = new Montador(); montarEstrutura(m); return m.fechar(); }, []);
  return (
    <group>
      <Piso alta={alta} />
      <Malhas geos={geos} />
    </group>
  );
});

// Mesas dos agentes (uma malha) e as telas delas (outra).
export const MesasDaEquipe = memo(function MesasDaEquipe({ agentes, estados, pendentes, onClick, onGestor }: {
  agentes: AgenteInfo[];
  estados: Record<string, EstadoAgente>;
  pendentes: number;
  onClick: (id: string) => void;
  onGestor: () => void;
}) {
  const textura = useAtlas(agentes, estados, pendentes);
  const { geos, planos } = useMemo(() => {
    const m = new Montador();
    const planos: PlanoTela[] = [];
    for (const [id, p] of Object.entries(POSTOS)) montarMesa(m, planos, id, p);
    // suas três telas: a fila de decisões no meio
    const [gx, gz] = MESA_GESTOR;
    m.emGrupo([gx, 0.12, gz], 0, () => {
      ([[-0.86, 0.3, CEL_EQUIPE], [0, 0, CEL_PENDENTES], [0.86, -0.3, CEL_EQUIPE]] as const).forEach(([lx, giro, cel]) => {
        m.emGrupo([lx, 0, -0.2 + Math.abs(lx) * 0.2], giro, () => {
          m.caixa([0, 0.96, -0.05], [0.05, 0.34, 0.03], COR.aco, "metal");
          m.redonda([0, 0.785, -0.05], [0.24, 0.016, 0.18], COR.aco, "metal", 0.006);
          m.redonda([0, 1.24, 0], [0.84, 0.54, 0.03], "#090d14", "brilho", 0.012);
          planos.push({ matriz: m.base.clone(), p: [0, 1.24, 0.0165], w: 0.8, h: 0.5, celula: cel, dono: "" });
        });
      });
    });
    return { geos: m.fechar(), planos };
  }, []);
  return (
    <group>
      <Malhas geos={geos} />
      <TelasDasMesas planos={planos} textura={textura} onClick={(id) => (id ? onClick(id) : onGestor())} />
    </group>
  );
});

// ---------- parede de telas ----------
function TelaLED({ p, r, largura, altura, px, chave, desenhar }: {
  p: V3; r?: V3; largura: number; altura: number; px: number; chave: string;
  desenhar: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
}) {
  const h = Math.round((px * altura) / largura);
  const { canvas, textura } = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = px;
    c.height = h;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return { canvas: c, textura: t };
  }, [px, h]);
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
    <mesh position={p} rotation={r} raycast={() => null}>
      <planeGeometry args={[largura, altura]} />
      <meshBasicMaterial map={textura} toneMapped={false} />
    </mesh>
  );
}

const chaveLed = (d: DadosLed) => JSON.stringify([d.ind, d.trabalhando, d.emReuniao, d.total]);

function TelaCentral({ painel }: { painel: PainelTV }) {
  const ultimo = useRef(painel);
  ultimo.current = painel;
  const comReuniao = !!painel.reuniao && !painel.relogio;
  const [tique, setTique] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTique((x) => x + 1), comReuniao ? 1000 : 20000);
    return () => clearInterval(t);
  }, [comReuniao]);
  return (
    <TelaLED p={[0, 3.35, PREDIO.z0 + 0.53]} largura={9.7} altura={5.46} px={TV_W} chave={`${JSON.stringify(painel)}${tique}`}
      desenhar={(c, w, h) => { c.save(); c.scale(w / TV_W, h / TV_H); desenharTV(c, ultimo.current); c.restore(); }} />
  );
}

export const ParedeDeTelas = memo(function ParedeDeTelas({ dados, painel }: { dados: DadosLed; painel: PainelTV }) {
  const chave = chaveLed(dados);
  const z = PREDIO.z0;
  return (
    <group>
      <TelaCentral painel={painel} />
      <TelaLED p={[0, 7.6, z + 0.53]} largura={20} altura={2.33} px={2048} chave={chave} desenhar={(c, w, h) => desenharSuspenso(c, w, h, dados)} />
      <TelaLED p={[-9.48, 3.0, z + 1.11]} r={[0, 0.3, 0]} largura={8} altura={3.6} px={1536} chave={chave} desenhar={(c, w, h) => desenharResultados(c, w, h, dados)} />
      <TelaLED p={[9.48, 3.0, z + 1.11]} r={[0, -0.3, 0]} largura={8} altura={3.6} px={1536} chave={chave} desenhar={(c, w, h) => desenharIndependencia(c, w, h, dados)} />
      {/* tela sobre os servidores */}
      <TelaLED p={[20, 2.85, RACKS[0][1] - 0.6]} largura={7.6} altura={0.88} px={1024} chave={chave} desenhar={(c, w, h) => desenharServidores(c, w, h, dados)} />
    </group>
  );
});

// ---------- LEDs dos servidores: o ritmo acompanha a atividade real da equipe ----------
const COR_LED = [new THREE.Color("#3dd6f5"), new THREE.Color("#34d399"), new THREE.Color("#60a5fa"), new THREE.Color("#fbbf24")];
const APAGADO = new THREE.Color("#0b1220");
const LED_POR_RACK = 24;
const GEO_LED = new THREE.PlaneGeometry(0.04, 0.022);
const MAT_LED = new THREE.MeshBasicMaterial({ toneMapped: false });

export const LedsDosServidores = memo(function LedsDosServidores({ atividade }: { atividade: number }) {
  const malha = useRef<THREE.InstancedMesh>(null);
  const total = RACKS.length * LED_POR_RACK;
  const sementes = useMemo(() => Array.from({ length: total }, (_, i) => ((i * 2654435761) >>> 0) / 4294967296), [total]);
  const ritmo = useRef(atividade);
  ritmo.current = atividade;
  useEffect(() => {
    const m = malha.current;
    if (!m) return;
    const o = new THREE.Object3D();
    RACKS.forEach(([x, z], r) => {
      for (let i = 0; i < LED_POR_RACK; i++) {
        o.position.set(x - 0.3 + (i % 3) * 0.07, 0.34 + Math.floor(i / 3) * 0.2, z + 0.522);
        o.updateMatrix();
        m.setMatrixAt(r * LED_POR_RACK + i, o.matrix);
      }
    });
    m.instanceMatrix.needsUpdate = true;
  }, []);
  const espera = useRef(0);
  useFrame(({ clock }, dt) => {
    const m = malha.current;
    if (!m) return;
    espera.current += dt;
    if (espera.current < 0.3) return;
    espera.current = 0;
    const t = clock.elapsedTime;
    const vel = 0.8 + Math.min(ritmo.current, 8) * 0.55;
    for (let i = 0; i < total; i++) {
      const s = sementes[i];
      m.setColorAt(i, Math.sin(t * vel * (1 + s * 5) + s * 40) > -0.35 + s * 0.25 ? COR_LED[i % 7 === 0 ? 3 : i % 3] : APAGADO);
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  return <instancedMesh ref={malha} args={[GEO_LED, MAT_LED, total]} frustumCulled={false} raycast={() => null} />;
});

// ---------- arquivo: uma estante por setor ----------
export const Arquivo = memo(function Arquivo({ setores, contagem, onAbrir }: {
  setores: SetorInfo[]; contagem: Record<string, number>; onAbrir: (setor: string) => void;
}) {
  const chave = JSON.stringify([setores.map((s) => s.id), contagem]);
  const geos = useMemo(() => {
    const m = new Montador();
    setores.forEach((s, i) => {
      const z = estanteZ(i, setores.length);
      const cor = SETOR_COR[s.id] ?? "#888780";
      m.emGrupo([ARQUIVO_X, 0, z], -Math.PI / 2, () => {
        const w = Math.min(1.7, (12.4 / Math.max(setores.length, 1)) - 0.14);
        for (const lx of [-w / 2, w / 2]) m.caixa([lx, 1.15, 0], [0.04, 2.3, 0.5], COR.chassi, "metal");
        m.caixa([0, 1.15, -0.23], [w, 2.3, 0.02], COR.grafite);
        m.caixa([0, 2.34, 0], [w + 0.04, 0.08, 0.52], cor);
        m.caixa([0, 2.3, 0.262], [w, 0.012, 0.006], cor, "luz");
        for (let p = 0; p < 5; p++) m.caixa([0, 0.1 + p * 0.54, 0], [w - 0.04, 0.03, 0.48], COR.aco, "metal");
        const porPrat = Math.max(4, Math.floor((w - 0.14) / 0.11));
        const pastas = Math.min(contagem[s.id] ?? 0, porPrat * 4);
        const tons = [cor, new THREE.Color(cor).multiplyScalar(0.78).getStyle(), new THREE.Color(cor).multiplyScalar(1.15).getStyle()];
        for (let k = 0; k < pastas; k++) {
          const prat = Math.floor(k / porPrat);
          const col = k % porPrat;
          const alt = 0.32 + ((k * 7) % 5) * 0.014;
          m.caixa([-w / 2 + 0.1 + col * 0.11, 0.115 + prat * 0.54 + alt / 2, 0.02], [0.09, alt, 0.32], tons[k % 3]);
        }
      });
    });
    return m.fechar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);
  return (
    <group>
      <Malhas geos={geos} />
      {setores.map((s, i) => (
        <mesh key={s.id} position={[ARQUIVO_X, 1.2, estanteZ(i, setores.length)]}
          onClick={(e) => { e.stopPropagation(); onAbrir(s.id); }}
          onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
          onPointerOut={() => { document.body.style.cursor = ""; }}>
          <boxGeometry args={[0.6, 2.4, 1.6]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      ))}
    </group>
  );
});

// ---------- o que está esperando na sua mesa ----------
const GEO_PAPEL = new THREE.BoxGeometry(0.3, 0.018, 0.42);
const MAT_PAPEL = new THREE.MeshStandardMaterial({ color: "#dfe6f0", roughness: 0.9 });

export function MesaDoGestor({ pendentes, onClick }: { pendentes: number; onClick: () => void }) {
  const pilha = Math.min(pendentes, 20);
  const malha = useRef<THREE.InstancedMesh>(null);
  const luz = useRef<THREE.MeshBasicMaterial>(null);
  useEffect(() => {
    const m = malha.current;
    if (!m) return;
    const o = new THREE.Object3D();
    for (let i = 0; i < 20; i++) {
      o.position.set(-1.1 + (i % 2) * 0.012, 0.795 + i * 0.02, 0.12 + (i % 3) * 0.01);
      o.rotation.y = (i % 4) * 0.05;
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, []);
  useEffect(() => { if (malha.current) malha.current.count = pilha; }, [pilha]);
  useFrame(({ clock }) => {
    if (luz.current) luz.current.color.set(pendentes > 0 ? (Math.sin(clock.elapsedTime * 3) > 0 ? "#fbbf24" : "#a16207") : "#1e293b");
  });
  return (
    <group position={[MESA_GESTOR[0], 0.12, MESA_GESTOR[1]]}>
      <instancedMesh ref={malha} args={[GEO_PAPEL, MAT_PAPEL, 20]} frustumCulled={false} raycast={() => null} />
      <mesh position={[-1.1, 0.83 + pilha * 0.02, 0.12]} raycast={() => null}>
        <sphereGeometry args={[0.035, 10, 8]} />
        <meshBasicMaterial ref={luz} toneMapped={false} />
      </mesh>
      {/* área de clique: a mesa inteira */}
      <mesh position={[0, 0.7, 0.3]} onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { document.body.style.cursor = ""; }}>
        <boxGeometry args={[3.4, 1.5, 2]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </group>
  );
}
