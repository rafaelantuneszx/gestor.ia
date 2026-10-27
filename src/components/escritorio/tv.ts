// Desenha o painel do dia na TV da sala de reunião (um canvas usado como textura).
export const TV_W = 1280;
export const TV_H = 720;

export type PainelTV = {
  trabalhando: { nome: string; texto: string }[];
  pendentes: number;
  abertas: number;
  documentos: number;
  eventos: { hora: string; nome: string; texto: string; tipo: string }[];
};

const FONTE = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const DIA = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
const HORA = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

function cortar(ctx: CanvasRenderingContext2D, texto: string, max: number) {
  if (ctx.measureText(texto).width <= max) return texto;
  let t = texto;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t}…`;
}

function cartao(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 18);
  ctx.fill();
}

export function desenharTV(ctx: CanvasRenderingContext2D, p: PainelTV, agora = new Date()) {
  const fundo = ctx.createLinearGradient(0, 0, TV_W, TV_H);
  fundo.addColorStop(0, "#0b1220");
  fundo.addColorStop(1, "#13203a");
  ctx.fillStyle = fundo;
  ctx.fillRect(0, 0, TV_W, TV_H);

  // cabeçalho
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#f5f5f4";
  ctx.font = `700 46px ${FONTE}`;
  ctx.fillText("Gestor", 56, 84);
  const lg = ctx.measureText("Gestor").width;
  ctx.fillStyle = "#e3b341";
  ctx.fillText(".IA", 56 + lg, 84);
  ctx.fillStyle = "#94a3b8";
  ctx.font = `500 26px ${FONTE}`;
  ctx.fillText("Painel do dia · Rafael Enterprises", 56, 122);
  ctx.textAlign = "right";
  ctx.fillStyle = "#f5f5f4";
  ctx.font = `600 64px ${FONTE}`;
  ctx.fillText(HORA.format(agora), TV_W - 56, 90);
  ctx.fillStyle = "#94a3b8";
  ctx.font = `500 24px ${FONTE}`;
  ctx.fillText(DIA.format(agora), TV_W - 56, 124);
  ctx.textAlign = "left";

  // indicadores
  const kpis: [string, number, string][] = [
    ["Trabalhando agora", p.trabalhando.length, "#60a5fa"],
    ["Aguardando você", p.pendentes, "#fbbf24"],
    ["Demandas abertas", p.abertas, "#c084fc"],
    ["Relatórios no arquivo", p.documentos, "#4ade80"],
  ];
  const kw = (TV_W - 112 - 3 * 24) / 4;
  kpis.forEach(([rotulo, valor, cor], i) => {
    const x = 56 + i * (kw + 24);
    cartao(ctx, x, 158, kw, 132);
    ctx.fillStyle = cor;
    ctx.fillRect(x, 158, 6, 132);
    ctx.fillStyle = "#f8fafc";
    ctx.font = `700 64px ${FONTE}`;
    ctx.fillText(String(valor), x + 28, 236);
    ctx.fillStyle = "#cbd5e1";
    ctx.font = `500 24px ${FONTE}`;
    ctx.fillText(rotulo, x + 28, 272);
  });

  // agora
  const colW = (TV_W - 112 - 24) / 2;
  cartao(ctx, 56, 314, colW, 340);
  ctx.fillStyle = "#e2e8f0";
  ctx.font = `600 28px ${FONTE}`;
  ctx.fillText("Agora", 84, 360);
  ctx.font = `500 24px ${FONTE}`;
  if (p.trabalhando.length === 0) {
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("Equipe disponível, sem rotina rodando.", 84, 406);
  }
  p.trabalhando.slice(0, 6).forEach((t, i) => {
    const y = 406 + i * 42;
    ctx.fillStyle = "#60a5fa";
    ctx.beginPath();
    ctx.arc(92, y - 8, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f8fafc";
    ctx.font = `600 24px ${FONTE}`;
    ctx.fillText(t.nome, 110, y);
    const nw = ctx.measureText(t.nome).width;
    ctx.fillStyle = "#cbd5e1";
    ctx.font = `400 22px ${FONTE}`;
    ctx.fillText(cortar(ctx, t.texto, colW - 80 - nw), 122 + nw, y);
  });

  // últimos eventos
  const x2 = 56 + colW + 24;
  cartao(ctx, x2, 314, colW, 340);
  ctx.fillStyle = "#e2e8f0";
  ctx.font = `600 28px ${FONTE}`;
  ctx.fillText("Últimos acontecimentos", x2 + 28, 360);
  const corTipo: Record<string, string> = { inicio: "#60a5fa", fim: "#4ade80", demanda: "#c084fc", passo: "#fbbf24", nota: "#94a3b8" };
  if (p.eventos.length === 0) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = `400 22px ${FONTE}`;
    ctx.fillText("Nada registrado nas últimas 24 h.", x2 + 28, 406);
  }
  p.eventos.slice(-6).reverse().forEach((e, i) => {
    const y = 406 + i * 42;
    ctx.fillStyle = "#64748b";
    ctx.font = `500 22px ${FONTE}`;
    ctx.fillText(e.hora, x2 + 28, y);
    ctx.fillStyle = corTipo[e.tipo] ?? "#cbd5e1";
    ctx.font = `600 22px ${FONTE}`;
    ctx.fillText(e.nome, x2 + 104, y);
    const nw = ctx.measureText(e.nome).width;
    ctx.fillStyle = "#cbd5e1";
    ctx.font = `400 22px ${FONTE}`;
    ctx.fillText(cortar(ctx, e.texto, colW - 150 - nw), x2 + 114 + nw, y);
  });

  ctx.fillStyle = "#475569";
  ctx.font = `500 20px ${FONTE}`;
  ctx.fillText("Atualiza sozinho · as decisões ficam na Mesa de aprovações", 56, 694);
}
