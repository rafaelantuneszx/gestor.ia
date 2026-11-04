// Painéis de LED do escritório: desenhados em canvas com os números reais (ver lib/escritorio/indicadores.ts).
import type { Fracao, Indicadores } from "@/lib/escritorio/indicadores";

const FONTE = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const CIANO = "#22d3ee";
const AZUL = "#3b82f6";
const VERDE = "#34d399";
const AMBAR = "#fbbf24";
const VIOLETA = "#a78bfa";
const TEXTO = "#f1f5f9";
const SUAVE = "#94a3b8";

const HORA = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const hora = (iso: string) => HORA.format(new Date(iso));
const NUM = new Intl.NumberFormat("pt-BR");
const pct = (f: Fracao | null) => (f?.pct === null || f === null ? "—" : `${f.pct}%`);

// Marca do Gestor.IA em canvas (mesmo desenho do LogoGestor.tsx, numa grade de 64).
export function desenharMarca(ctx: CanvasRenderingContext2D, x: number, y: number, tamanho: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(tamanho / 64, tamanho / 64);
  const g = ctx.createLinearGradient(8, 4, 56, 60);
  g.addColorStop(0, CIANO);
  g.addColorStop(1, "#2563eb");
  ctx.strokeStyle = g;
  ctx.fillStyle = g;
  ctx.lineWidth = 4.5;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke(new Path2D("M32 4 56 18v28L32 60 8 46V18Z"));
  ctx.stroke(new Path2D("M43.5 24.5a14 14 0 1 0 2.3 11.5H33"));
  ctx.beginPath();
  ctx.arc(33, 36, 4.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function desenharNome(ctx: CanvasRenderingContext2D, x: number, y: number, px: number, centro = false) {
  ctx.font = `700 ${px}px ${FONTE}`;
  const a = ctx.measureText("Gestor").width;
  const b = ctx.measureText(".IA").width;
  const x0 = centro ? x - (a + b) / 2 : x;
  const alinhamento = ctx.textAlign;
  ctx.textAlign = "left";
  ctx.fillStyle = TEXTO;
  ctx.fillText("Gestor", x0, y);
  ctx.fillStyle = CIANO;
  ctx.fillText(".IA", x0 + a, y);
  ctx.textAlign = alinhamento;
}

function fundoLed(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#050b16");
  g.addColorStop(1, "#0b1730");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // trama fina de LED
  ctx.fillStyle = "rgba(255,255,255,0.018)";
  for (let y = 0; y < h; y += 6) ctx.fillRect(0, y, w, 2);
  ctx.strokeStyle = "rgba(34,211,238,0.35)";
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
}

function numero(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, rotulo: string, valor: string, cor: string, px = 96) {
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = cor;
  ctx.shadowColor = cor;
  ctx.shadowBlur = 18;
  ctx.font = `700 ${px}px ${FONTE}`;
  ctx.fillText(valor, x + w / 2, y + px, w - 10);
  ctx.shadowBlur = 0;
  ctx.fillStyle = SUAVE;
  ctx.font = `500 ${Math.round(px * 0.3)}px ${FONTE}`;
  ctx.fillText(rotulo, x + w / 2, y + px + Math.round(px * 0.42), w - 10);
  ctx.textAlign = "left";
}

export type DadosLed = { ind: Indicadores; trabalhando: number; emReuniao: number; total: number };

// Letreiro suspenso sobre o prédio.
export function desenharSuspenso(ctx: CanvasRenderingContext2D, w: number, h: number, d: DadosLed) {
  fundoLed(ctx, w, h);
  desenharMarca(ctx, 34, (h - 150) / 2, 150);
  ctx.textBaseline = "alphabetic";
  desenharNome(ctx, 204, h / 2 + 8, 84);
  ctx.fillStyle = CIANO;
  ctx.font = `600 30px ${FONTE}`;
  ctx.fillText("OPERAÇÃO 24 HORAS", 208, h / 2 + 58);
  const itens: [string, string, string][] = [
    ["trabalhando agora", `${d.trabalhando}/${d.total}`, CIANO],
    ["a fazer", NUM.format(d.ind.aFazer), AMBAR],
    ["feitas", NUM.format(d.ind.feitas), VERDE],
    ["entregues", NUM.format(d.ind.entregues), VIOLETA],
    ["eventos em 24 h", NUM.format(d.ind.eventos24h), AZUL],
  ];
  const x0 = 760;
  const cw = (w - x0 - 24) / itens.length;
  itens.forEach(([r, v, c], i) => numero(ctx, x0 + i * cw, h / 2 - 84, cw, r, v, c, 104));
}

// Tela sobre os servidores: integração automática e atividade, tudo medido.
export function desenharServidores(ctx: CanvasRenderingContext2D, w: number, h: number, d: DadosLed) {
  fundoLed(ctx, w, h);
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = TEXTO;
  ctx.font = `700 44px ${FONTE}`;
  ctx.fillText("Data center", 36, 66);
  ctx.fillStyle = SUAVE;
  ctx.font = `500 26px ${FONTE}`;
  ctx.fillText("PaviMax ERP · FPAV Financeiro · FPAV RH · Gestor.IA", 36, 106);
  const s = d.ind.sincronizacoes;
  const itens: [string, string, string][] = [
    ["sincronizações sem erro (30 dias)", pct(s), s && (s.pct ?? 0) >= 90 ? VERDE : AMBAR],
    ["última sincronização", d.ind.ultimaSincronizacao ? hora(d.ind.ultimaSincronizacao) : "—", CIANO],
    ["rotinas concluídas (30 dias)", NUM.format(d.ind.rotinasConcluidas), AZUL],
    ["eventos em 24 h", NUM.format(d.ind.eventos24h), VIOLETA],
  ];
  const cw = (w - 40) / itens.length;
  itens.forEach(([r, v, c], i) => numero(ctx, 20 + i * cw, 128, cw, r, v, c, 82));
}

// Parede de resultados: a contagem do trabalho.
export function desenharResultados(ctx: CanvasRenderingContext2D, w: number, h: number, d: DadosLed) {
  fundoLed(ctx, w, h);
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = TEXTO;
  ctx.font = `700 50px ${FONTE}`;
  ctx.fillText("Resultados da equipe", 44, 78);
  const cards: [string, number, string][] = [
    ["atualizadas hoje", d.ind.atualizadasHoje, CIANO],
    ["entregues", d.ind.entregues, VIOLETA],
    ["feitas", d.ind.feitas, VERDE],
    ["a fazer", d.ind.aFazer, AMBAR],
    ["rotinas criadas", d.ind.rotinasCriadas, AZUL],
  ];
  const gap = 18;
  const cw = (w - 88 - gap * (cards.length - 1)) / cards.length;
  cards.forEach(([r, v, c], i) => {
    const x = 44 + i * (cw + gap);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.beginPath();
    ctx.roundRect(x, 112, cw, h - 150, 18);
    ctx.fill();
    ctx.fillStyle = c;
    ctx.fillRect(x, 112, cw, 6);
    numero(ctx, x, (h - 150) / 2 - 10, cw, r, NUM.format(v), c, 108);
  });
}

function barra(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, rotulo: string, detalhe: string, f: Fracao | null, cor: string) {
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillStyle = TEXTO;
  ctx.font = `600 32px ${FONTE}`;
  ctx.fillText(rotulo, x, y);
  ctx.fillStyle = SUAVE;
  ctx.font = `400 24px ${FONTE}`;
  ctx.fillText(detalhe, x, y + 34, w - 190);
  ctx.textAlign = "right";
  ctx.fillStyle = cor;
  ctx.font = `700 62px ${FONTE}`;
  ctx.fillText(pct(f), x + w, y + 22);
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.beginPath();
  ctx.roundRect(x, y + 50, w, 16, 8);
  ctx.fill();
  if (f?.pct) {
    ctx.fillStyle = cor;
    ctx.shadowColor = cor;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.roundRect(x, y + 50, Math.max(16, (w * f.pct) / 100), 16, 8);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

// Parede de independência: quanto anda sem depender do Rafael.
export function desenharIndependencia(ctx: CanvasRenderingContext2D, w: number, h: number, d: DadosLed) {
  fundoLed(ctx, w, h);
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = TEXTO;
  ctx.font = `700 50px ${FONTE}`;
  ctx.fillText("Independência", 44, 78);
  const s = d.ind.sincronizacoes;
  const a = d.ind.agentesSemVoce;
  const r = d.ind.rotinasSemErro;
  const passo = (h - 130) / 3;
  barra(ctx, 44, 136, w - 88, "Agentes resolvem sem você", `${a.feitos} de ${a.total} demandas feitas sem a sua decisão`, a, CIANO);
  barra(ctx, 44, 136 + passo, w - 88, "Rotinas terminam sem erro", `${r.feitos} de ${r.total} nos últimos 30 dias`, r, VERDE);
  barra(ctx, 44, 136 + passo * 2, w - 88, "Sistemas sincronizam sozinhos",
    s ? `${s.feitos} de ${s.total} sem erro em 30 dias` : "sem acesso ao registro de integração", s, AZUL);
}

// Faixa sobre cada fileira de servidores.
export function desenharFaixaSistema(ctx: CanvasRenderingContext2D, w: number, h: number, nome: string) {
  ctx.fillStyle = "#050b16";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = CIANO;
  ctx.fillRect(0, h - 5, w, 5);
  ctx.fillStyle = TEXTO;
  ctx.font = `600 ${Math.round(h * 0.52)}px ${FONTE}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(nome, w / 2, h / 2 - 2, w - 12);
  ctx.textAlign = "left";
}
