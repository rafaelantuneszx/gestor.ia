"use client";

// A equipe de robôs. Cada parte do corpo é uma malha instanciada: os 15 robôs juntos custam menos de dez chamadas de desenho,
// e um único useFrame cuida de todos. A lógica de quem anda e quando vem dos eventos reais, como antes.
import { memo, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
  casa, giroDoPosto, POSTOS, SETOR_COR, viagemPausa,
  type AgenteInfo, type EstadoAgente, type LugarReuniao, type Vec2, type Viagem,
} from "@/lib/escritorio/modelo";
import { COR_STATUS, situacaoDe } from "./status";

const VELOCIDADE = 2.0; // m/s
const PAUSA_DESTINO = 1.6;
const GIRO = 8;

type Fase = "sentado" | "indo" | "pausa" | "voltando" | "indoReuniao" | "naReuniao" | "voltandoReuniao";

// O que os nomes em HTML e o ritmo de desenho precisam saber, sem re-renderizar nada a cada quadro.
export type Registro = {
  pos: Map<string, { x: number; z: number; visivel: boolean }>;
  legendas: Map<string, string>;
  movendo: boolean;
  versao: number;
  ouvintes: Set<() => void>;
  mudou: () => void;
};
export function criarRegistro(): Registro {
  const r: Registro = {
    pos: new Map(), legendas: new Map(), movendo: false, versao: 0, ouvintes: new Set(),
    mudou: () => { r.versao += 1; r.ouvintes.forEach((f) => f()); },
  };
  return r;
}

// ---------- modelo do robô ----------
function pintar(g: THREE.BufferGeometry, cor: string) {
  const c = new THREE.Color(cor);
  const n = g.getAttribute("position").count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute("color", new THREE.BufferAttribute(a, 3));
  return g;
}
const peca = (g: THREE.BufferGeometry, x: number, y: number, z: number, cor: string, rx = 0) => {
  const out = g.index ? g.toNonIndexed() : g;
  out.deleteAttribute("uv");
  if (rx) out.rotateX(rx);
  out.translate(x, y, z);
  return pintar(out, cor);
};
const CASCA = "#ffffff"; // recebe a cor do setor
const ESCURO = "#1a2230";
const VISOR = "#060a12";
const juntar = (partes: THREE.BufferGeometry[]) => mergeGeometries(partes);
const caixaR = (w: number, h: number, d: number, r = 0.04) => new RoundedBoxGeometry(w, h, d, 2, r);
const cil = (a: number, b: number, h: number, s = 18) => new THREE.CylinderGeometry(a, b, h, s);

const GEO = {
  corpo: () => juntar([
    peca(cil(0.27, 0.33, 0.12, 22), 0, 0.16, 0, ESCURO),
    peca(cil(0.2, 0.29, 0.24, 22), 0, 0.33, 0, CASCA),
    peca(cil(0.15, 0.17, 0.1, 16), 0, 0.5, 0, ESCURO),
    peca(caixaR(0.56, 0.56, 0.38, 0.09), 0, 0.82, 0, CASCA),
    peca(caixaR(0.36, 0.26, 0.02, 0.01), 0, 0.85, 0.19, VISOR),
    peca(new THREE.SphereGeometry(0.095, 14, 10), 0.33, 1.0, 0, ESCURO),
    peca(new THREE.SphereGeometry(0.095, 14, 10), -0.33, 1.0, 0, ESCURO),
    peca(cil(0.07, 0.09, 0.09, 12), 0, 1.14, 0, ESCURO),
  ]),
  cabeca: () => juntar([
    peca(caixaR(0.5, 0.36, 0.4, 0.1), 0, 0.2, 0, CASCA),
    peca(caixaR(0.4, 0.17, 0.02, 0.008), 0, 0.21, 0.2, VISOR),
    peca(cil(0.055, 0.055, 0.04, 12), 0.265, 0.2, 0, ESCURO, 0).rotateZ(0),
    peca(cil(0.055, 0.055, 0.04, 12), -0.265, 0.2, 0, ESCURO, 0).rotateZ(0),
    peca(cil(0.012, 0.016, 0.17, 8), 0, 0.46, 0, ESCURO),
  ]),
  braco: () => juntar([
    peca(caixaR(0.1, 0.28, 0.1, 0.03), 0, -0.14, 0, CASCA),
    peca(new THREE.SphereGeometry(0.058, 10, 8), 0, -0.28, 0, ESCURO),
    peca(caixaR(0.085, 0.085, 0.3, 0.03), 0, -0.28, 0.15, CASCA),
    peca(new THREE.SphereGeometry(0.058, 10, 8), 0, -0.28, 0.32, ESCURO),
  ]),
  // luzes: a cor diz o status. Peito e base acompanham o corpo; olhos e antena, a cabeça.
  luzCorpo: () => juntar([
    peca(new THREE.TorusGeometry(0.3, 0.012, 6, 36), 0, 0.09, 0, "#ffffff", Math.PI / 2),
    peca(new THREE.BoxGeometry(0.2, 0.024, 0.004), 0, 0.91, 0.203, "#ffffff"),
    peca(new THREE.BoxGeometry(0.13, 0.024, 0.004), -0.035, 0.86, 0.203, "#ffffff"),
    peca(new THREE.BoxGeometry(0.17, 0.024, 0.004), -0.015, 0.81, 0.203, "#ffffff"),
  ]),
  luzCabeca: () => juntar([
    peca(caixaR(0.095, 0.05, 0.004, 0.0015), 0.09, 0.215, 0.212, "#ffffff"),
    peca(caixaR(0.095, 0.05, 0.004, 0.0015), -0.09, 0.215, 0.212, "#ffffff"),
    peca(new THREE.SphereGeometry(0.036, 10, 8), 0, 0.57, 0, "#ffffff"),
  ]),
  halo: () => {
    const g = new THREE.TorusGeometry(0.22, 0.02, 6, 36, Math.PI * 1.45).rotateX(Math.PI / 2);
    g.deleteAttribute("uv");
    return g;
  },
};

const MAT_CASCA = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.34, metalness: 0.42 });
const MAT_LUZ = new THREE.MeshBasicMaterial({ toneMapped: false });
const MAT_ALVO = new THREE.MeshBasicMaterial({ visible: false });
const GEO_ALVO = new THREE.BoxGeometry(0.8, 1.8, 0.8).translate(0, 0.9, 0);

let texturaSombra: THREE.CanvasTexture | null = null;
function sombraRobo() {
  if (texturaSombra) return texturaSombra;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d")!;
  const g = x.createRadialGradient(64, 64, 8, 64, 64, 64);
  g.addColorStop(0, "rgba(0,0,0,0.85)");
  g.addColorStop(0.55, "rgba(0,0,0,0.5)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  texturaSombra = new THREE.CanvasTexture(c);
  return texturaSombra;
}

function medir(caminho: Vec2[]) {
  const acum = [0];
  for (let i = 1; i < caminho.length; i++) acum.push(acum[i - 1] + Math.hypot(caminho[i][0] - caminho[i - 1][0], caminho[i][1] - caminho[i - 1][1]));
  return acum;
}
function pontoEm(c: Vec2[], a: number[], d: number): { x: number; z: number; dx: number; dz: number } {
  const dd = Math.max(0, Math.min(a[a.length - 1], d));
  let i = 1;
  while (i < a.length - 1 && a[i] < dd) i++;
  const t = (dd - a[i - 1]) / (a[i] - a[i - 1] || 1);
  return { x: c[i - 1][0] + (c[i][0] - c[i - 1][0]) * t, z: c[i - 1][1] + (c[i][1] - c[i - 1][1]) * t, dx: c[i][0] - c[i - 1][0], dz: c[i][1] - c[i - 1][1] };
}
const girarPara = (atual: number, alvo: number, k: number) => atual + Math.atan2(Math.sin(alvo - atual), Math.cos(alvo - atual)) * k;

function semente(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

type Robo = {
  id: string;
  s: number;
  temMesa: boolean;
  casa: Vec2;
  giroCasa: number;
  fase: Fase;
  dist: number;
  pausa: number;
  caminho: Vec2[];
  acum: number[];
  viagem: Viagem | null;
  viagemFeita: string | null;
  reuniao: LugarReuniao | null;
  proximaPausa: number | null;
  pausas: number;
  x: number;
  z: number;
  giro: number;
  corLuz: string;
};

const SEM_ESCALA = new THREE.Matrix4().makeScale(0, 0, 0);

export const Frota = memo(function Frota({ agentes, estados, filas, lugares, selecionado, falando, registro, onClick, onViagemFim }: {
  agentes: AgenteInfo[];
  estados: Record<string, EstadoAgente>;
  filas: Record<string, Viagem[]>;
  lugares: Record<string, LugarReuniao>;
  selecionado: string | null;
  falando: string | null;
  registro: Registro;
  onClick: (id: string) => void;
  onViagemFim: (agente: string, viagem: string) => void;
}) {
  const n = agentes.length;
  const geos = useMemo(() => ({ corpo: GEO.corpo(), cabeca: GEO.cabeca(), braco: GEO.braco(), luzCorpo: GEO.luzCorpo(), luzCabeca: GEO.luzCabeca(), halo: GEO.halo() }), []);
  useEffect(() => () => { Object.values(geos).forEach((g) => g.dispose()); }, [geos]);
  const geoSombra = useMemo(() => new THREE.PlaneGeometry(1.2, 1.2).rotateX(-Math.PI / 2), []);
  const matSombra = useMemo(() => new THREE.MeshBasicMaterial({ map: sombraRobo(), transparent: true, depthWrite: false }), []);

  const corpo = useRef<THREE.InstancedMesh>(null);
  const cabeca = useRef<THREE.InstancedMesh>(null);
  const braco = useRef<THREE.InstancedMesh>(null);
  const luzCorpo = useRef<THREE.InstancedMesh>(null);
  const luzCabeca = useRef<THREE.InstancedMesh>(null);
  const halo = useRef<THREE.InstancedMesh>(null);
  const sombra = useRef<THREE.InstancedMesh>(null);
  const alvo = useRef<THREE.InstancedMesh>(null);
  const anel = useRef<THREE.Mesh>(null);

  const robos = useRef<Robo[]>([]);
  useMemo(() => {
    const antes = new Map(robos.current.map((r) => [r.id, r]));
    robos.current = agentes.map((a) => antes.get(a.id) ?? {
      id: a.id, s: semente(a.id), temMesa: !!POSTOS[a.id], casa: casa(a.id), giroCasa: giroDoPosto(a.id),
      fase: "sentado" as Fase, dist: 0, pausa: 0, caminho: [], acum: [0], viagem: null, viagemFeita: null, reuniao: null, proximaPausa: null, pausas: 0,
      x: casa(a.id)[0], z: casa(a.id)[1], giro: giroDoPosto(a.id), corLuz: "",
    });
  }, [agentes]);

  // cor da casca: a do setor, clareada para o robô não ficar escuro no fundo escuro
  useEffect(() => {
    const c = new THREE.Color();
    const branco = new THREE.Color("#ffffff");
    agentes.forEach((a, i) => {
      c.set(SETOR_COR[POSTOS[a.id]?.setor ?? a.setor ?? ""] ?? "#94a3b8").lerp(branco, 0.5);
      corpo.current?.setColorAt(i, c);
      cabeca.current?.setColorAt(i, c);
      braco.current?.setColorAt(i * 2, c);
      braco.current?.setColorAt(i * 2 + 1, c);
    });
    for (const m of [corpo.current, cabeca.current, braco.current]) if (m?.instanceColor) m.instanceColor.needsUpdate = true;
    if (alvo.current) alvo.current.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, -3), 60);
  }, [agentes]);

  // as props mais recentes, lidas dentro do useFrame
  const props = useRef({ estados, filas, lugares, selecionado, falando, onViagemFim });
  props.current = { estados, filas, lugares, selecionado, falando, onViagemFim };
  const parado = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  const aux = useMemo(() => ({
    base: new THREE.Matrix4(), m: new THREE.Matrix4(), l: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(),
    p: new THREE.Vector3(), um: new THREE.Vector3(1, 1, 1), cor: new THREE.Color(), haloQ: new THREE.Quaternion(), y: new THREE.Vector3(0, 1, 0),
  }), []);

  const comporLocal = (x: number, y: number, z: number, rx: number, ry: number, rz = 0) => {
    aux.e.set(rx, ry, rz, "YXZ");
    aux.q.setFromEuler(aux.e);
    aux.p.set(x, y, z);
    aux.l.compose(aux.p, aux.q, aux.um);
    return aux.m.multiplyMatrices(aux.base, aux.l);
  };

  useFrame(({ clock }, dtBruto) => {
    if (!corpo.current || !cabeca.current || !braco.current || !luzCorpo.current || !luzCabeca.current || !halo.current || !sombra.current || !alvo.current) return;
    const dt = Math.min(dtBruto, 0.15);
    const agora = clock.elapsedTime;
    const { estados: est, filas: fil, lugares: lug, selecionado: sel, falando: fal, onViagemFim: fim } = props.current;
    let algumMovendo = false;

    robos.current.forEach((r, i) => {
      const estado = est[r.id];
      const t = parado ? 0 : agora + (r.s % 100) * 0.13;
      const trabalhando = estado?.status === "trabalhando";
      const comecar = (fase: Fase, rota: Vec2[], legenda: string) => {
        r.fase = fase;
        r.caminho = rota;
        r.acum = medir(rota);
        r.dist = 0;
        registro.legendas.set(r.id, legenda);
        registro.mudou();
      };
      const sentar = () => {
        r.fase = "sentado";
        r.viagem = null;
        r.reuniao = null;
        if (registro.legendas.delete(r.id)) registro.mudou();
      };

      if (r.fase === "sentado") {
        const reuniao = lug[r.id];
        const v = fil[r.id]?.[0];
        if (reuniao && reuniao.caminho.length > 1) {
          r.reuniao = reuniao;
          comecar("indoReuniao", reuniao.caminho, `em reunião: ${reuniao.titulo}`);
        } else if (v && v.id !== r.viagemFeita && v.caminho.length > 1) {
          r.viagem = v;
          comecar("indo", v.caminho, v.rotulo);
        } else if (r.temMesa && estado?.status === "disponivel" && (r.proximaPausa ??= agora + 45 + (r.s % 280)) < agora) {
          r.proximaPausa = agora + 240 + (r.s % 300);
          const pausa = viagemPausa(r.id, r.s + r.pausas++);
          r.viagem = pausa;
          comecar("indo", pausa.caminho, pausa.rotulo);
        }
      }

      // pose: braços e cabeça
      let bracoE = 0;
      let bracoD = 0;
      let cabecaY = 0;
      let cabecaX = 0;
      let inclina = 0;
      let visivel = r.temMesa;
      let levando = false;
      const total = r.acum[r.acum.length - 1];

      if (r.fase === "sentado") {
        r.x = r.casa[0];
        r.z = r.casa[1];
        r.giro = r.giroCasa;
        if (trabalhando) {
          // digitando e, de vez em quando, olhando a outra tela
          bracoE = -0.05 + Math.sin(t * 11) * 0.09;
          bracoD = -0.05 + Math.sin(t * 11 + 2.1) * 0.09;
          cabecaX = 0.1 + Math.sin(t * 0.7) * 0.03;
          cabecaY = (r.s + Math.floor(t / 9)) % 4 === 0 ? 0.32 : Math.sin(t * 0.4) * 0.05;
        } else {
          bracoE = 0.55;
          bracoD = 0.55;
          cabecaY = Math.sin(t * 0.35 + r.s) * 0.28;
          cabecaX = -0.04;
        }
      } else if (r.fase === "indoReuniao" || r.fase === "naReuniao" || r.fase === "voltandoReuniao") {
        visivel = true;
        const lugarAgora = lug[r.id];
        const mesma = !!lugarAgora && !!r.reuniao && lugarAgora.chave === r.reuniao.chave;
        if (r.fase !== "voltandoReuniao" && !mesma) {
          if (r.fase === "naReuniao") r.dist = total;
          r.fase = "voltandoReuniao";
          registro.legendas.set(r.id, "voltando da reunião");
          registro.mudou();
        } else if (r.fase === "voltandoReuniao" && mesma) {
          r.fase = "indoReuniao";
          registro.legendas.set(r.id, `em reunião: ${r.reuniao!.titulo}`);
          registro.mudou();
        }
        if (r.fase === "naReuniao" && r.reuniao) {
          r.x = r.reuniao.assento[0];
          r.z = r.reuniao.assento[1];
          r.giro = girarPara(r.giro, r.reuniao.rotacao, 1 - Math.exp(-GIRO * dt));
          if (fal === r.id) {
            bracoD = -0.6 + Math.sin(t * 4.2) * 0.3;
            bracoE = 0.3 + Math.sin(t * 3.1) * 0.12;
            cabecaY = Math.sin(t * 1.4) * 0.2;
            cabecaX = Math.sin(t * 3.3) * 0.08;
          } else {
            bracoE = bracoD = 0.25;
            cabecaY = Math.sin(t * 0.5 + r.s) * 0.2;
          }
        } else if (r.fase === "indoReuniao") {
          r.dist += VELOCIDADE * dt;
          if (r.dist >= total) { r.dist = total; r.fase = "naReuniao"; }
        } else if (r.fase === "voltandoReuniao") {
          r.dist -= VELOCIDADE * dt;
          if (r.dist <= 0) sentar();
        }
      } else if (r.viagem) {
        visivel = true;
        if (r.fase === "indo") {
          r.dist += VELOCIDADE * dt;
          if (r.dist >= total) { r.dist = total; r.fase = "pausa"; r.pausa = 0; }
        } else if (r.fase === "pausa") {
          r.pausa += dt;
          if (r.pausa >= (r.viagem.espera ?? PAUSA_DESTINO)) r.fase = "voltando";
          bracoE = bracoD = 0.4;
          cabecaY = Math.sin(t * 0.8) * 0.2;
        } else if (r.fase === "voltando") {
          r.dist -= VELOCIDADE * dt;
          if (r.dist <= 0) {
            const id = r.viagem.id;
            r.viagemFeita = id;
            sentar();
            fim(r.id, id);
          }
        }
        levando = !!r.viagem && ((r.viagem.tipo !== "buscar" && r.viagem.tipo !== "pausa" && r.fase === "indo") || (r.viagem.tipo === "buscar" && r.fase === "voltando"));
      } else {
        sentar();
      }

      // deslizando pelo caminho
      const emMovimento = r.fase === "indo" || r.fase === "voltando" || r.fase === "indoReuniao" || r.fase === "voltandoReuniao";
      if (emMovimento || r.fase === "pausa") {
        const q = pontoEm(r.caminho, r.acum, r.dist);
        r.x = q.x;
        r.z = q.z;
        if (emMovimento && (q.dx || q.dz)) {
          const sentido = r.fase === "voltando" || r.fase === "voltandoReuniao" ? -1 : 1;
          r.giro = girarPara(r.giro, Math.atan2(q.dx * sentido, q.dz * sentido), 1 - Math.exp(-GIRO * dt));
          bracoE = levando ? -0.5 : 0.75 + Math.sin(t * 5) * 0.08;
          bracoD = levando ? -0.5 : 0.75 - Math.sin(t * 5) * 0.08;
          inclina = 0.12;
        }
      }
      if (emMovimento) algumMovendo = true;

      // matrizes
      const flutua = emMovimento ? Math.sin(t * 6) * 0.015 : Math.sin(t * 1.6) * 0.006;
      registro.pos.set(r.id, { x: r.x, z: r.z, visivel });
      if (!visivel) {
        corpo.current!.setMatrixAt(i, SEM_ESCALA);
        cabeca.current!.setMatrixAt(i, SEM_ESCALA);
        braco.current!.setMatrixAt(i * 2, SEM_ESCALA);
        braco.current!.setMatrixAt(i * 2 + 1, SEM_ESCALA);
        luzCorpo.current!.setMatrixAt(i, SEM_ESCALA);
        luzCabeca.current!.setMatrixAt(i, SEM_ESCALA);
        halo.current!.setMatrixAt(i, SEM_ESCALA);
        sombra.current!.setMatrixAt(i, SEM_ESCALA);
        alvo.current!.setMatrixAt(i, SEM_ESCALA);
        return;
      }
      aux.e.set(inclina, r.giro, 0, "YXZ");
      aux.q.setFromEuler(aux.e);
      aux.p.set(r.x, flutua, r.z);
      aux.base.compose(aux.p, aux.q, aux.um);
      corpo.current!.setMatrixAt(i, aux.base);
      luzCorpo.current!.setMatrixAt(i, aux.base);
      alvo.current!.setMatrixAt(i, aux.base);
      comporLocal(0, 1.17, 0, cabecaX, cabecaY);
      cabeca.current!.setMatrixAt(i, aux.m);
      luzCabeca.current!.setMatrixAt(i, aux.m);
      comporLocal(0.33, 1.0, 0, bracoE, 0, 0.1);
      braco.current!.setMatrixAt(i * 2, aux.m);
      comporLocal(-0.33, 1.0, 0, bracoD, 0, -0.1);
      braco.current!.setMatrixAt(i * 2 + 1, aux.m);

      // aro sobre a cabeça: gira quando o robô está trabalhando
      aux.p.set(r.x, 1.96 + flutua, r.z);
      aux.haloQ.setFromAxisAngle(aux.y, trabalhando && !parado ? t * 2.6 : r.giro);
      aux.l.compose(aux.p, aux.haloQ, aux.um);
      halo.current!.setMatrixAt(i, aux.l);
      aux.q.identity();
      aux.p.set(r.x, 0.012, r.z);
      aux.l.compose(aux.p, aux.q, aux.um);
      sombra.current!.setMatrixAt(i, aux.l);

      // luzes na cor do status
      const emReuniao = r.fase === "naReuniao" || r.fase === "indoReuniao";
      const naRecarga = r.viagem?.tipo === "pausa" && r.fase !== "sentado";
      const sit = situacaoDe(estado, emReuniao, emMovimento && !naRecarga, !!naRecarga);
      const cor = COR_STATUS[sit.tipo];
      if (cor !== r.corLuz) {
        r.corLuz = cor;
        aux.cor.set(cor);
        luzCorpo.current!.setColorAt(i, aux.cor);
        luzCabeca.current!.setColorAt(i, aux.cor);
        halo.current!.setColorAt(i, aux.cor);
        for (const m of [luzCorpo.current!, luzCabeca.current!, halo.current!]) if (m.instanceColor) m.instanceColor.needsUpdate = true;
      }
    });

    registro.movendo = algumMovendo;
    for (const m of [corpo.current, cabeca.current, braco.current, luzCorpo.current, luzCabeca.current, halo.current, sombra.current, alvo.current]) m.instanceMatrix.needsUpdate = true;

    // anel de quem está selecionado
    if (anel.current) {
      const p = sel ? registro.pos.get(sel) : null;
      anel.current.visible = !!p?.visivel;
      if (p) anel.current.position.set(p.x, 0.02, p.z);
    }
  });

  if (n === 0) return null;
  return (
    <group key={n}>
      <instancedMesh ref={corpo} args={[geos.corpo, MAT_CASCA, n]} frustumCulled={false} raycast={() => null} />
      <instancedMesh ref={cabeca} args={[geos.cabeca, MAT_CASCA, n]} frustumCulled={false} raycast={() => null} />
      <instancedMesh ref={braco} args={[geos.braco, MAT_CASCA, n * 2]} frustumCulled={false} raycast={() => null} />
      <instancedMesh ref={luzCorpo} args={[geos.luzCorpo, MAT_LUZ, n]} frustumCulled={false} raycast={() => null} />
      <instancedMesh ref={luzCabeca} args={[geos.luzCabeca, MAT_LUZ, n]} frustumCulled={false} raycast={() => null} />
      <instancedMesh ref={halo} args={[geos.halo, MAT_LUZ, n]} frustumCulled={false} raycast={() => null} />
      <instancedMesh ref={sombra} args={[geoSombra, matSombra, n]} frustumCulled={false} renderOrder={1} raycast={() => null} />
      <instancedMesh ref={alvo} args={[GEO_ALVO, MAT_ALVO, n]} frustumCulled={false}
        onClick={(e) => { e.stopPropagation(); if (e.instanceId != null && agentes[e.instanceId]) onClick(agentes[e.instanceId].id); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { document.body.style.cursor = ""; }} />
      <mesh ref={anel} rotation-x={-Math.PI / 2} visible={false} raycast={() => null}>
        <ringGeometry args={[0.56, 0.66, 48]} />
        <meshBasicMaterial color="#3dd6f5" transparent opacity={0.95} toneMapped={false} />
      </mesh>
    </group>
  );
});
