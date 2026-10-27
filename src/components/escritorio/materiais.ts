// Materiais e texturas do escritório. Tudo é gerado em canvas (sem baixar imagens) e reaproveitado:
// o mesmo material serve a todas as peças da mesma cor, o que mantém a cena leve.
import * as THREE from "three";
import type { Piso } from "@/lib/escritorio/modelo";

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
  color: "#d6e6ef", transparent: true, opacity: 0.17, roughness: 0.04, metalness: 0.3,
  depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.4,
}));

export const vidroFosco = () => unico("vidro-fosco", () => new THREE.MeshStandardMaterial({
  color: "#f4f7f9", transparent: true, opacity: 0.55, roughness: 0.6, depthWrite: false, side: THREE.DoubleSide,
}));

export const aluminio = () => mat("#9aa1a8", 0.35, 0.85);
export const acoPreto = () => mat("#2a2d31", 0.45, 0.6);
export const parede = () => mat("#f3f1ed", 0.92);

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
  const r = sorteio(7);
  const linhas = 8;
  const alt = h / linhas;
  for (let l = 0; l < linhas; l++) {
    let x = -r() * 400;
    while (x < w) {
      const comp = 320 + r() * 380;
      const hue = 28 + r() * 7;
      const luz = 55 + r() * 9;
      ctx.fillStyle = `hsl(${hue}, ${36 + r() * 10}%, ${luz}%)`;
      ctx.fillRect(x, l * alt, comp, alt);
      // veios
      for (let v = 0; v < 12; v++) {
        ctx.strokeStyle = `rgba(90, 55, 25, ${0.05 + r() * 0.1})`;
        ctx.lineWidth = 0.6 + r() * 1.4;
        ctx.beginPath();
        const y0 = l * alt + 6 + r() * (alt - 12);
        const amp = 1 + r() * 3;
        const fase = r() * 6;
        for (let px = 0; px <= comp; px += 16) {
          const y = y0 + Math.sin(px / 60 + fase) * amp;
          if (px === 0) ctx.moveTo(x + px, y);
          else ctx.lineTo(x + px, y);
        }
        ctx.stroke();
      }
      // nó ocasional
      if (r() < 0.25) {
        const nx = x + r() * comp;
        const ny = l * alt + alt / 2;
        const g = ctx.createRadialGradient(nx, ny, 1, nx, ny, 10);
        g.addColorStop(0, "rgba(80,45,20,0.45)");
        g.addColorStop(1, "rgba(80,45,20,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(nx, ny, 14, 6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(60, 38, 18, 0.45)";
      ctx.fillRect(x, l * alt, 2, alt); // junta de topo
      x += comp;
    }
    ctx.fillStyle = "rgba(60, 38, 18, 0.5)";
    ctx.fillRect(0, l * alt, w, 2); // junta lateral
  }
}

// Porcelanato: placas de 1,2 m (2 x 2 no canvas), com manchas suaves e rejunte.
function desenharPorcelanato(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const r = sorteio(11);
  ctx.fillStyle = "#e4e1dc";
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) {
    const tom = 200 + Math.floor(r() * 40);
    ctx.fillStyle = `rgba(${tom}, ${tom - 3}, ${tom - 8}, 0.06)`;
    ctx.beginPath();
    ctx.ellipse(r() * w, r() * h, 4 + r() * 30, 2 + r() * 14, r() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#cbc6be";
  for (let i = 0; i <= 2; i++) {
    ctx.fillRect((i * w) / 2 - 2, 0, 4, h);
    ctx.fillRect(0, (i * h) / 2 - 2, w, 4);
  }
}

// Carpete: 1 x 1 m de fibra pontilhada.
function desenharCarpete(base: string) {
  return (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const r = sorteio(23);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 26000; i++) {
      const claro = r() < 0.5;
      ctx.fillStyle = claro ? `rgba(255,255,255,${0.04 + r() * 0.05})` : `rgba(0,0,0,${0.05 + r() * 0.06})`;
      ctx.fillRect(r() * w, r() * h, 1.5, 1.5);
    }
  };
}

const PISO_CANVAS: Record<Piso, { metros: number; px: number; desenhar: (ctx: CanvasRenderingContext2D, w: number, h: number) => void }> = {
  madeira: { metros: 2, px: 1024, desenhar: desenharMadeira },
  porcelanato: { metros: 2.4, px: 1024, desenhar: desenharPorcelanato },
  carpete: { metros: 1, px: 512, desenhar: desenharCarpete("#6c7581") },
  "carpete-quente": { metros: 1, px: 512, desenhar: desenharCarpete("#8a7e70") },
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
      roughness: piso === "porcelanato" ? 0.22 : piso === "madeira" ? 0.5 : 0.96,
      metalness: 0,
      envMapIntensity: piso === "porcelanato" ? 0.9 : 0.5,
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

// Vista das janelas: céu, nuvens e a cidade ao longe. O plano tem 2,9 m de altura e as janelas vão de
// 0,9 a 2,5 m, então a linha dos prédios fica perto de 1,1 m.
export function texturaCeu() {
  return texturaCanvas("ceu", 4096, 340, (ctx, w, h) => {
    const r = sorteio(5);
    const ceu = ctx.createLinearGradient(0, 0, 0, h * 0.62);
    ceu.addColorStop(0, "#7fb2e0");
    ceu.addColorStop(1, "#dcebf6");
    ctx.fillStyle = ceu;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      const cx = r() * w;
      const cy = h * (0.12 + r() * 0.25);
      for (let j = 0; j < 6; j++) {
        const rr = 18 + r() * 30;
        const g = ctx.createRadialGradient(cx + j * 22, cy + r() * 8, 1, cx + j * 22, cy, rr);
        g.addColorStop(0, "rgba(255,255,255,0.85)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx + j * 22, cy, rr, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const base = h * 0.62;
    // duas camadas de prédios: a de trás mais clara (perspectiva aérea)
    for (const [cor, alturaMax, janelas] of [["#b9c8d6", 0.32, "#d5e0ea"], ["#94a6b8", 0.24, "#c7d4df"]] as const) {
      let x = 0;
      while (x < w) {
        const bw = 30 + r() * 90;
        const bh = h * (0.06 + r() * alturaMax);
        ctx.fillStyle = cor;
        ctx.fillRect(x, base - bh, bw, bh);
        ctx.fillStyle = janelas;
        for (let wy = base - bh + 6; wy < base - 6; wy += 9) {
          for (let wx = x + 5; wx < x + bw - 6; wx += 9) if (r() < 0.55) ctx.fillRect(wx, wy, 4, 5);
        }
        x += bw + r() * 12;
      }
    }
    // árvores e chão
    ctx.fillStyle = "#6f8a62";
    for (let x = 0; x < w; x += 14) {
      ctx.beginPath();
      ctx.arc(x, base + 4, 10 + r() * 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#8a9a80";
    ctx.fillRect(0, base + 8, w, h - base);
  });
}

// Quadro branco da sala de Sistemas: um kanban desenhado a caneta.
export function texturaQuadro() {
  return texturaCanvas("quadro", 1024, 600, (ctx, w, h) => {
    ctx.fillStyle = "#fbfbf9";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#2b3a55";
    ctx.lineWidth = 4;
    ctx.font = "600 44px 'Comic Sans MS', 'Marker Felt', system-ui";
    ctx.fillStyle = "#2b3a55";
    ctx.fillText("Sistemas · semana", 40, 70);
    const cols = ["A fazer", "Fazendo", "Feito"];
    cols.forEach((c, i) => {
      const x = 40 + i * 320;
      ctx.font = "500 32px 'Marker Felt', system-ui";
      ctx.fillStyle = ["#b42318", "#1d4ed8", "#15803d"][i];
      ctx.fillText(c, x, 140);
      ctx.beginPath();
      ctx.moveTo(x, 155);
      ctx.lineTo(x + 260, 155);
      ctx.stroke();
      const notas = [3, 2, 4][i];
      for (let n = 0; n < notas; n++) {
        ctx.fillStyle = ["#fde68a", "#fbcfe8", "#bfdbfe", "#bbf7d0"][(i + n) % 4];
        const nx = x + (n % 2) * 130;
        const ny = 180 + Math.floor(n / 2) * 140;
        ctx.save();
        ctx.translate(nx + 55, ny + 55);
        ctx.rotate(((n * 7) % 5 - 2) * 0.03);
        ctx.fillRect(-55, -55, 110, 110);
        ctx.fillStyle = "rgba(40,40,40,0.55)";
        for (let k = 0; k < 3; k++) ctx.fillRect(-42, -32 + k * 22, 60 + ((n + k) % 3) * 12, 4);
        ctx.restore();
      }
    });
    ctx.strokeStyle = "#9aa1a8";
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, w - 10, h - 10);
  });
}

// Placa de sala: nome com uma faixa na cor do setor.
export function texturaPlaca(nome: string, cor: string) {
  return texturaCanvas(`placa|${nome}|${cor}`, 640, 128, (ctx, w, h) => {
    ctx.fillStyle = "#24272c";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = cor;
    ctx.fillRect(0, 0, 16, h);
    ctx.fillStyle = "#f5f5f4";
    ctx.font = "600 54px system-ui, -apple-system, 'Segoe UI', sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(nome, 44, h / 2 + 2);
  });
}

// Letreiro da recepção.
export function texturaLogo() {
  return texturaCanvas("logo", 1024, 256, (ctx, w, h) => {
    ctx.fillStyle = "#1c1f24";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#f5f5f4";
    ctx.font = "700 110px system-ui, -apple-system, 'Segoe UI', sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText("Gestor", 70, h / 2 - 18);
    const largura = ctx.measureText("Gestor").width;
    ctx.fillStyle = "#e3b341";
    ctx.fillText(".IA", 70 + largura, h / 2 - 18);
    ctx.fillStyle = "#9ca3af";
    ctx.font = "500 40px system-ui, -apple-system, 'Segoe UI', sans-serif";
    ctx.fillText("Rafael Enterprises · FPAV · BRACTOS · PAVIMAX", 72, h / 2 + 70);
  });
}

// Lombadas de livros numa textura só, para a estante da sua sala.
export function texturaLivros() {
  return texturaCanvas("livros", 512, 128, (ctx, w, h) => {
    const r = sorteio(31);
    const cores = ["#7c2d12", "#1e3a8a", "#14532d", "#78350f", "#334155", "#9f1239", "#e7e5e4", "#a16207"];
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
