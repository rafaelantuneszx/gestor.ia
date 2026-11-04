// Materiais e texturas do escritório. Tudo é gerado em canvas (sem baixar imagens) e reaproveitado:
// o mesmo material serve a todas as peças da mesma cor, o que mantém a cena leve.
import * as THREE from "three";
import type { Piso } from "@/lib/escritorio/modelo";
import { svgIcone } from "@/lib/escritorio/icones";
import { fonteMarca } from "./paineis";

const materiais = new Map<string, THREE.Material>();

export function mat(cor: string, aspereza = 0.7, metal = 0): THREE.MeshStandardMaterial {
  const k = `${cor}|${aspereza}|${metal}`;
  let m = materiais.get(k) as THREE.MeshStandardMaterial | undefined;
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: cor, roughness: aspereza, metalness: metal });
    materiais.set(k, m);
  }
  return m;
}

export function emissivo(cor: string, intensidade = 1): THREE.MeshStandardMaterial {
  const k = `emissivo|${cor}|${intensidade}`;
  let m = materiais.get(k) as THREE.MeshStandardMaterial | undefined;
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: cor, emissive: cor, emissiveIntensity: intensidade, toneMapped: false });
    materiais.set(k, m);
  }
  return m;
}

function unico<T extends THREE.Material>(k: string, criar: () => T): T {
  let m = materiais.get(k) as T | undefined;
  if (!m) {
    m = criar();
    materiais.set(k, m);
  }
  return m;
}

export const vidro = () => unico("vidro", () => new THREE.MeshStandardMaterial({
  color: "#7dd3fc", transparent: true, opacity: 0.1, roughness: 0.03, metalness: 0.5,
  depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.4,
}));

export const vidroFosco = () => unico("vidro-fosco", () => new THREE.MeshStandardMaterial({
  color: "#1e3a5f", transparent: true, opacity: 0.55, roughness: 0.5, depthWrite: false, side: THREE.DoubleSide,
}));

export const aluminio = () => mat("#5b6675", 0.32, 0.9);
export const acoPreto = () => mat("#2a2d31", 0.45, 0.6);
export const parede = () => mat("#161d29", 0.72, 0.15);
export const madeiraClara = () => mat("#2b3445", 0.4, 0.3);
export const madeiraEscura = () => mat("#1a2230", 0.45, 0.3);
export const brancoFosco = () => mat("#232b39", 0.45, 0.35);

// ---------- texturas em canvas ----------

function sorteio(semente: number) {
  let s = semente >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function novoCanvas(w: number, h: number, desenhar: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (ctx) desenhar(ctx, w, h);
  return c;
}

// Piso de madeira: 2 x 2 m, réguas de 25 cm com veios e juntas.
function desenharMadeira(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // piso elevado técnico: placas escuras de 50 cm com a junta iluminada de leve
  const r = sorteio(7);
  ctx.fillStyle = "#121824";
  ctx.fillRect(0, 0, w, h);
  const n = 4;
  const t = w / n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      ctx.fillStyle = `rgba(148,163,184,${0.012 + r() * 0.03})`;
      ctx.fillRect(i * t, j * t, t, t);
    }
  }
  ctx.fillStyle = "rgba(61,214,245,0.16)";
  for (let i = 0; i <= n; i++) {
    ctx.fillRect(i * t - 1, 0, 2, h);
    ctx.fillRect(0, i * t - 1, w, 2);
  }
}

// Porcelanato: placas de 1,2 m (2 x 2 no canvas), com manchas suaves e rejunte.
function desenharPorcelanato(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const r = sorteio(11);
  ctx.fillStyle = "#0d121b";
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 1200; i++) {
    ctx.fillStyle = `rgba(148,163,184,${r() * 0.02})`;
    ctx.beginPath();
    ctx.ellipse(r() * w, r() * h, 4 + r() * 30, 2 + r() * 14, r() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(61,214,245,0.1)";
  for (let i = 0; i <= 2; i++) {
    ctx.fillRect((i * w) / 2 - 1, 0, 2, h);
    ctx.fillRect(0, (i * h) / 2 - 1, w, 2);
  }
}

// Carpete em placas de 50 cm, com a fibra alternando de direção (placa sim, placa não) e pontilhado.
function desenharCarpete(base: string) {
  return (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const r = sorteio(23);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    const n = 2;
    const t = w / n;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x0 = i * t;
        const y0 = j * t;
        const horizontal = (i + j) % 2 === 0;
        ctx.fillStyle = horizontal ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.035)";
        ctx.fillRect(x0, y0, t, t);
        for (let k = 0; k < 90; k++) {
          ctx.strokeStyle = `rgba(${r() < 0.5 ? "255,255,255" : "0,0,0"},${0.03 + r() * 0.05})`;
          ctx.lineWidth = 1 + r() * 1.5;
          ctx.beginPath();
          const p = r() * t;
          if (horizontal) { ctx.moveTo(x0, y0 + p); ctx.lineTo(x0 + t, y0 + p + (r() - 0.5) * 4); }
          else { ctx.moveTo(x0 + p, y0); ctx.lineTo(x0 + p + (r() - 0.5) * 4, y0 + t); }
          ctx.stroke();
        }
      }
    }
    for (let i = 0; i < 22000; i++) {
      ctx.fillStyle = r() < 0.5 ? `rgba(255,255,255,${0.03 + r() * 0.05})` : `rgba(0,0,0,${0.05 + r() * 0.06})`;
      ctx.fillRect(r() * w, r() * h, 1.5, 1.5);
    }
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    for (let i = 0; i <= n; i++) {
      ctx.fillRect(i * t - 1, 0, 2, h);
      ctx.fillRect(0, i * t - 1, w, 2);
    }
  };
}

// Cimento queimado (hall e áreas técnicas).
function desenharConcreto(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // piso do data center: placas perfuradas de 60 cm
  ctx.fillStyle = "#0a0f17";
  ctx.fillRect(0, 0, w, h);
  const n = 5;
  const t = w / n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      ctx.fillStyle = "#101722";
      ctx.fillRect(i * t + 3, j * t + 3, t - 6, t - 6);
      ctx.fillStyle = "rgba(61,214,245,0.12)";
      for (let a = 1; a < 7; a++) for (let b = 1; b < 7; b++) ctx.fillRect(i * t + (a * t) / 7 - 1, j * t + (b * t) / 7 - 1, 3, 3);
    }
  }
}

const PISO_CANVAS: Record<Piso, { metros: number; px: number; desenhar: (ctx: CanvasRenderingContext2D, w: number, h: number) => void }> = {
  madeira: { metros: 2, px: 1024, desenhar: desenharMadeira },
  porcelanato: { metros: 2.4, px: 1024, desenhar: desenharPorcelanato },
  carpete: { metros: 1, px: 512, desenhar: desenharCarpete("#1a2333") },
  "carpete-quente": { metros: 1, px: 512, desenhar: desenharCarpete("#20283a") },
  concreto: { metros: 3, px: 1024, desenhar: desenharConcreto },
};

const canvasPiso = new Map<Piso, HTMLCanvasElement>();
const texturas = new Map<string, THREE.Texture>();

export function materialPiso(piso: Piso, largura: number, profundidade: number) {
  const k = `piso|${piso}|${largura}|${profundidade}`;
  return unico(k, () => {
    const def = PISO_CANVAS[piso];
    let c = canvasPiso.get(piso);
    if (!c) {
      c = novoCanvas(def.px, def.px, def.desenhar);
      canvasPiso.set(piso, c);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(largura / def.metros, profundidade / def.metros);
    t.anisotropy = 8;
    return new THREE.MeshStandardMaterial({
      map: t,
      roughness: piso === "porcelanato" ? 0.16 : piso === "madeira" ? 0.28 : piso === "concreto" ? 0.35 : 0.9,
      metalness: 0.2,
      envMapIntensity: piso === "porcelanato" ? 1.3 : piso === "madeira" ? 0.9 : 0.5,
    });
  });
}

function texturaCanvas(k: string, w: number, h: number, desenhar: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  let t = texturas.get(k);
  if (!t) {
    t = new THREE.CanvasTexture(novoCanvas(w, h, desenhar));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    texturas.set(k, t);
  }
  return t;
}

// Vista das janelas: céu em degradê, nuvens e a cidade em três planos (perspectiva aérea), com janelas acesas.
// O plano tem 3 m de altura e as janelas vão de 0,5 a 2,6 m, então a linha dos prédios fica perto de 1 m.
export function texturaCeu() {
  return texturaCanvas("ceu", 4096, 420, (ctx, w, h) => {
    const r = sorteio(5);
    const ceu = ctx.createLinearGradient(0, 0, 0, h * 0.75);
    ceu.addColorStop(0, "#030712");
    ceu.addColorStop(0.6, "#0b1b3a");
    ceu.addColorStop(1, "#1d3a6e");
    ctx.fillStyle = ceu;
    ctx.fillRect(0, 0, w, h);
    const base = h * 0.8;
    const camadas: [string, number, string[], number][] = [
      ["#0b1630", 0.46, ["#1e3a8a"], 0.25],
      ["#070f22", 0.36, ["#38bdf8", "#1e40af"], 0.3],
      ["#040914", 0.24, ["#fde68a", "#3dd6f5", "#93c5fd"], 0.42],
    ];
    for (const [cor, alturaMax, janelas, acesas] of camadas) {
      let x = -20;
      while (x < w) {
        const bw = 40 + r() * 110;
        const bh = h * (0.08 + r() * alturaMax);
        ctx.fillStyle = cor;
        ctx.fillRect(x, base - bh, bw, bh);
        if (r() < 0.3) {
          ctx.fillRect(x + bw * 0.4, base - bh - 18, 3, 18);
          ctx.fillStyle = "#ef4444";
          ctx.fillRect(x + bw * 0.4 - 1, base - bh - 21, 5, 4);
        }
        for (let wy = base - bh + 7; wy < base - 6; wy += 10) {
          for (let wx = x + 6; wx < x + bw - 6; wx += 9) {
            if (r() < acesas) {
              ctx.fillStyle = janelas[Math.floor(r() * janelas.length)];
              ctx.fillRect(wx, wy, 5, 6);
            }
          }
        }
        x += bw + r() * 14;
      }
    }
    ctx.fillStyle = "#02050c";
    ctx.fillRect(0, base, w, h - base);
  });
}

// Quadro branco da sala de Sistemas: um kanban desenhado a caneta.
export function texturaQuadro() {
  return texturaCanvas("quadro", 1024, 600, (ctx, w, h) => {
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 4;
    ctx.font = "600 44px system-ui";
    ctx.fillStyle = "#e2e8f0";
    ctx.fillText("Sistemas · semana", 40, 70);
    const cols = ["A fazer", "Fazendo", "Feito"];
    cols.forEach((c, i) => {
      const x = 40 + i * 320;
      ctx.font = "500 32px system-ui";
      ctx.fillStyle = ["#fbbf24", "#3dd6f5", "#34d399"][i];
      ctx.fillText(c, x, 140);
      ctx.beginPath();
      ctx.moveTo(x, 155);
      ctx.lineTo(x + 260, 155);
      ctx.stroke();
      const notas = [3, 2, 4][i];
      for (let n = 0; n < notas; n++) {
        ctx.fillStyle = ["#1e293b", "#172554", "#134e4a", "#312e81"][(i + n) % 4];
        const nx = x + (n % 2) * 130;
        const ny = 180 + Math.floor(n / 2) * 140;
        ctx.save();
        ctx.translate(nx + 55, ny + 55);
        ctx.rotate(((n * 7) % 5 - 2) * 0.03);
        ctx.fillRect(-55, -55, 110, 110);
        ctx.fillStyle = "rgba(226,232,240,0.5)";
        for (let k = 0; k < 3; k++) ctx.fillRect(-42, -32 + k * 22, 60 + ((n + k) % 3) * 12, 4);
        ctx.restore();
      }
    });
    ctx.strokeStyle = "#3dd6f5";
    ctx.lineWidth = 6;
    ctx.strokeRect(5, 5, w - 10, h - 10);
  });
}

// Desenha um ícone (SVG de icones.ts) no canvas quando a imagem carregar.
function comIcone(t: THREE.CanvasTexture, chave: string, cor: string, x: number, y: number, tam: number, espessura = 2) {
  const img = new Image();
  img.onload = () => {
    const ctx = (t.image as HTMLCanvasElement).getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, x, y, tam, tam);
    t.needsUpdate = true;
  };
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgIcone(chave, cor, espessura))}`;
}

// Placa de sala: ícone do setor num quadrado colorido e o nome.
export function texturaPlaca(nome: string, cor: string, icone: string) {
  const k = `placa|${nome}|${cor}|${icone}`;
  let t = texturas.get(k) as THREE.CanvasTexture | undefined;
  if (!t) {
    t = new THREE.CanvasTexture(novoCanvas(768, 160, (ctx, w, h) => {
      ctx.fillStyle = "#1d2127";
      ctx.beginPath();
      ctx.roundRect(0, 0, w, h, 26);
      ctx.fill();
      ctx.fillStyle = cor;
      ctx.beginPath();
      ctx.roundRect(18, 18, h - 36, h - 36, 20);
      ctx.fill();
      ctx.fillStyle = "#f5f5f4";
      ctx.font = "600 58px system-ui, -apple-system, 'Segoe UI', sans-serif";
      ctx.textBaseline = "middle";
      ctx.fillText(nome, h + 14, h / 2 + 2, w - h - 30);
    }));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    texturas.set(k, t);
    comIcone(t, icone, "#ffffff", 36, 36, 160 - 72, 2.2);
  }
  return t;
}

// Parede de destaque de cada sala: cor do setor esmaecida, ícone grande e o nome (supergráfico).
export function texturaParedeSetor(nome: string, cor: string, icone: string) {
  const k = `parede|${nome}|${cor}`;
  let t = texturas.get(k) as THREE.CanvasTexture | undefined;
  if (!t) {
    const c = new THREE.Color(cor);
    const fundo = `#${c.clone().lerp(new THREE.Color("#0b1220"), 0.86).getHexString()}`;
    const tinta = `#${c.clone().lerp(new THREE.Color("#ffffff"), 0.35).getHexString()}`;
    t = new THREE.CanvasTexture(novoCanvas(1024, 512, (ctx, w, h) => {
      ctx.fillStyle = fundo;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = tinta;
      ctx.globalAlpha = 0.9;
      ctx.font = "700 92px system-ui, -apple-system, 'Segoe UI', sans-serif";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(nome, 330, h * 0.56, w - 360);
      ctx.globalAlpha = 0.55;
      ctx.font = "500 34px system-ui, -apple-system, 'Segoe UI', sans-serif";
      ctx.fillText("Gestor.IA", 334, h * 0.56 + 56);
      ctx.globalAlpha = 1;
      ctx.fillRect(334, h * 0.56 + 80, 120, 8);
    }));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    texturas.set(k, t);
    comIcone(t, icone, tinta, 70, 140, 230, 1.6);
  }
  return t;
}

// Quadros abstratos para as paredes (formas e cores variando pela semente).
export function texturaArte(semente: number) {
  return texturaCanvas(`arte|${semente}`, 512, 384, (ctx, w, h) => {
    const r = sorteio(semente * 97 + 13);
    const paletas = [
      ["#070c16", "#0e7490", "#1d4ed8", "#3dd6f5", "#334155"],
      ["#080d18", "#312e81", "#4f46e5", "#38bdf8", "#1e293b"],
      ["#060b14", "#134e4a", "#0d9488", "#2dd4bf", "#1e3a5f"],
      ["#090e1a", "#1e40af", "#7c3aed", "#60a5fa", "#0f172a"],
    ];
    const p = paletas[semente % paletas.length];
    ctx.fillStyle = p[0];
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = p[1 + Math.floor(r() * 4)];
      ctx.globalAlpha = 0.85;
      const tipo = r();
      if (tipo < 0.4) {
        ctx.beginPath();
        ctx.arc(r() * w, r() * h, 30 + r() * 110, 0, Math.PI * (1 + Math.round(r())));
        ctx.fill();
      } else if (tipo < 0.75) {
        ctx.fillRect(r() * w * 0.8, r() * h * 0.8, 40 + r() * 180, 20 + r() * 140);
      } else {
        ctx.lineWidth = 6 + r() * 10;
        ctx.strokeStyle = p[1 + Math.floor(r() * 4)];
        ctx.beginPath();
        ctx.moveTo(r() * w, r() * h);
        ctx.bezierCurveTo(r() * w, r() * h, r() * w, r() * h, r() * w, r() * h);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  });
}

// Forro modular (placas de 62,5 cm) visto de baixo.
export function texturaForro() {
  return texturaCanvas("forro", 256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#1a212d";
    ctx.fillRect(0, 0, w, h);
    const r = sorteio(3);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `rgba(0,0,0,${r() * 0.04})`;
      ctx.fillRect(r() * w, r() * h, 2, 2);
    }
    ctx.fillStyle = "#0e131c";
    ctx.fillRect(0, 0, w, 4);
    ctx.fillRect(0, 0, 4, h);
  });
}

// Mancha de sombra de contato (degradê radial), para móveis e bonecos.
export function texturaSombra() {
  return texturaCanvas("sombra", 128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(0,0,0,0.55)");
    g.addColorStop(0.5, "rgba(0,0,0,0.25)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

export const materialSombra = () => unico("sombra", () => new THREE.MeshBasicMaterial({
  map: texturaSombra(), transparent: true, depthWrite: false, opacity: 0.55, toneMapped: false,
  polygonOffset: true, polygonOffsetFactor: -2,
}));

// Parede da recepção: o logotipo oficial em negativo, sobre a cor noite da marca.
export function texturaLogoRecepcao() {
  const k = "logo-recepcao";
  let t = texturas.get(k) as THREE.CanvasTexture | undefined;
  if (t) return t;
  t = new THREE.CanvasTexture(novoCanvas(2048, 1024, (ctx, w, h) => {
    ctx.fillStyle = "#0a1424";
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#f1f5f9";
    ctx.font = `700 92px ${fonteMarca()}`;
    ctx.fillText("Seu escritório remoto 24 horas", w / 2, 720);
    ctx.fillStyle = "#6aa9f5";
    ctx.font = `500 44px ${fonteMarca()}`;
    ctx.fillText("Sua empresa e seu grupo em um só lugar", w / 2, 800);
  }));
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  texturas.set(k, t);
  const pronta = t;
  const img = new Image();
  img.onload = () => {
    const ctx = (pronta.image as HTMLCanvasElement).getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 1024 - 640, 210, 1280, 320);
    pronta.needsUpdate = true;
  };
  img.src = "/marca/gestor-ia-logo-negativo.svg";
  return t;
}

// Lombadas de livros numa textura só, para a estante da sua sala.
export function texturaLivros() {
  return texturaCanvas("livros", 512, 128, (ctx, w, h) => {
    const r = sorteio(31);
    const cores = ["#0f172a", "#1e3a8a", "#134e4a", "#1e293b", "#334155", "#312e81", "#475569", "#0e7490"];
    let x = 0;
    while (x < w) {
      const lw = 10 + r() * 16;
      const lh = h * (0.72 + r() * 0.28);
      ctx.fillStyle = cores[Math.floor(r() * cores.length)];
      ctx.fillRect(x, h - lh, lw - 1, lh);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(x + 2, h - lh + 10, lw - 5, 3);
      ctx.fillRect(x + 2, h - 18, lw - 5, 3);
      x += lw;
    }
  });
}
