// Materiais e texturas do escritório. Tudo é gerado em canvas (sem baixar imagens) e reaproveitado:
// o mesmo material serve a todas as peças da mesma cor, o que mantém a cena leve.
import * as THREE from "three";
import type { Piso } from "@/lib/escritorio/modelo";
import { svgIcone } from "@/lib/escritorio/icones";

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
  color: "#cfe3ee", transparent: true, opacity: 0.14, roughness: 0.03, metalness: 0.4,
  depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.4,
}));

export const vidroFosco = () => unico("vidro-fosco", () => new THREE.MeshStandardMaterial({
  color: "#f4f7f9", transparent: true, opacity: 0.55, roughness: 0.6, depthWrite: false, side: THREE.DoubleSide,
}));

export const aluminio = () => mat("#9aa1a8", 0.35, 0.85);
export const acoPreto = () => mat("#2a2d31", 0.45, 0.6);
export const parede = () => mat("#f3f1ed", 0.92);
export const madeiraClara = () => mat("#c9a77c", 0.5);
export const madeiraEscura = () => mat("#4a3426", 0.5);
export const brancoFosco = () => mat("#f1efea", 0.55);

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
  const r = sorteio(41);
  ctx.fillStyle = "#c9c6c0";
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 1800; i++) {
    const tom = 170 + Math.floor(r() * 60);
    ctx.fillStyle = `rgba(${tom},${tom - 2},${tom - 6},0.08)`;
    ctx.beginPath();
    ctx.ellipse(r() * w, r() * h, 6 + r() * 60, 4 + r() * 30, r() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(90,85,78,0.35)";
  ctx.fillRect(0, 0, w, 2);
  ctx.fillRect(0, 0, 2, h);
}

const PISO_CANVAS: Record<Piso, { metros: number; px: number; desenhar: (ctx: CanvasRenderingContext2D, w: number, h: number) => void }> = {
  madeira: { metros: 2, px: 1024, desenhar: desenharMadeira },
  porcelanato: { metros: 2.4, px: 1024, desenhar: desenharPorcelanato },
  carpete: { metros: 1, px: 512, desenhar: desenharCarpete("#5d6673") },
  "carpete-quente": { metros: 1, px: 512, desenhar: desenharCarpete("#8a7d6c") },
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
      roughness: piso === "porcelanato" ? 0.2 : piso === "madeira" ? 0.42 : piso === "concreto" ? 0.6 : 0.96,
      metalness: 0,
      envMapIntensity: piso === "porcelanato" ? 1.0 : piso === "madeira" ? 0.7 : 0.4,
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
    const ceu = ctx.createLinearGradient(0, 0, 0, h * 0.7);
    ceu.addColorStop(0, "#5b9bd8");
    ceu.addColorStop(0.55, "#a9cdee");
    ceu.addColorStop(1, "#f3e9da");
    ctx.fillStyle = ceu;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 30; i++) {
      const cx = r() * w;
      const cy = h * (0.08 + r() * 0.3);
      for (let j = 0; j < 7; j++) {
        const rr = 14 + r() * 34;
        const g = ctx.createRadialGradient(cx + j * 20, cy + r() * 8, 1, cx + j * 20, cy, rr);
        g.addColorStop(0, "rgba(255,255,255,0.8)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx + j * 20, cy, rr, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const base = h * 0.72;
    const camadas: [string, number, string, number][] = [
      ["#c3cfdb", 0.42, "#dbe4ec", 0.25],
      ["#9fb0c2", 0.32, "#e8eef3", 0.4],
      ["#7a8da3", 0.2, "#f6e7b8", 0.5],
    ];
    for (const [cor, alturaMax, janela, acesas] of camadas) {
      let x = -20;
      while (x < w) {
        const bw = 40 + r() * 110;
        const bh = h * (0.06 + r() * alturaMax);
        ctx.fillStyle = cor;
        ctx.fillRect(x, base - bh, bw, bh);
        if (r() < 0.25) ctx.fillRect(x + bw * 0.4, base - bh - 18, 3, 18); // antena
        for (let wy = base - bh + 7; wy < base - 6; wy += 10) {
          for (let wx = x + 6; wx < x + bw - 6; wx += 9) {
            if (r() < acesas) {
              ctx.fillStyle = janela;
              ctx.fillRect(wx, wy, 5, 6);
            }
          }
        }
        x += bw + r() * 14;
      }
    }
    ctx.fillStyle = "#5f7a55";
    for (let x = 0; x < w; x += 12) {
      ctx.beginPath();
      ctx.arc(x, base + 5, 9 + r() * 9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#7f8f78";
    ctx.fillRect(0, base + 10, w, h - base);
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
    const fundo = `#${c.clone().lerp(new THREE.Color("#f4f1ec"), 0.72).getHexString()}`;
    const tinta = `#${c.clone().lerp(new THREE.Color("#1b1f24"), 0.15).getHexString()}`;
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
      ctx.fillText("Rafael Enterprises", 334, h * 0.56 + 56);
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
      ["#f4efe6", "#1f3a5f", "#e0a458", "#c8553d", "#588b8b"],
      ["#efe9e1", "#2d3142", "#bfc0c0", "#ef8354", "#4f5d75"],
      ["#f6f1e7", "#264653", "#2a9d8f", "#e9c46a", "#e76f51"],
      ["#ece7df", "#3d405b", "#81b29a", "#f2cc8f", "#e07a5f"],
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
    ctx.fillStyle = "#f2f1ee";
    ctx.fillRect(0, 0, w, h);
    const r = sorteio(3);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `rgba(0,0,0,${r() * 0.04})`;
      ctx.fillRect(r() * w, r() * h, 2, 2);
    }
    ctx.fillStyle = "#d4d2cd";
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

// Logo da recepção: "Rafael Enterprises" com o Gestor.IA embaixo, sobre ripado de madeira escura.
export function texturaLogoRecepcao() {
  return texturaCanvas("logo-recepcao", 2048, 1024, (ctx, w, h) => {
    const r = sorteio(77);
    // ripado
    for (let x = 0; x < w; x += 48) {
      const l = 22 + r() * 6;
      ctx.fillStyle = `hsl(26, 32%, ${l}%)`;
      ctx.fillRect(x, 0, 44, h);
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(x + 44, 0, 4, h);
    }
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(0,0,0,0.25)");
    g.addColorStop(0.5, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#f3e2c0";
    ctx.shadowColor = "rgba(255,210,140,0.55)";
    ctx.shadowBlur = 30;
    ctx.font = "300 170px system-ui, -apple-system, 'Segoe UI', sans-serif";
    ctx.fillText("RAFAEL ENTERPRISES", w / 2, h * 0.47);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#e3b341";
    ctx.fillRect(w / 2 - 160, h * 0.54, 320, 6);
    ctx.font = "700 120px system-ui, -apple-system, 'Segoe UI', sans-serif";
    const gl = ctx.measureText("Gestor").width;
    const total = gl + ctx.measureText(".IA").width;
    ctx.textAlign = "left";
    ctx.fillStyle = "#f5f5f4";
    ctx.fillText("Gestor", w / 2 - total / 2, h * 0.74);
    ctx.fillStyle = "#e3b341";
    ctx.fillText(".IA", w / 2 - total / 2 + gl, h * 0.74);
    ctx.fillStyle = "rgba(245,245,244,0.6)";
    ctx.font = "500 46px system-ui, -apple-system, 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("FPAV · BRACTOS · PAVIMAX", w / 2, h * 0.86);
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
