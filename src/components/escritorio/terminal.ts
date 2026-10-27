import type { EstadoAgente } from "@/lib/escritorio/modelo";

// Desenha a "tela do terminal" de um agente num canvas, usado como textura do monitor 3D.
export const TELA_W = 640;
export const TELA_H = 400;

const COR = {
  fundo: "#0d1117",
  barra: "#161b22",
  texto: "#c9d1d9",
  hora: "#6e7681",
  cmd: "#58a6ff",
  passo: "#e3b341",
  ok: "#3fb950",
  erro: "#f85149",
  demanda: "#d2a8ff",
  nota: "#8b949e",
};

export function desenharTerminal(
  ctx: CanvasRenderingContext2D,
  nome: string,
  estado: EstadoAgente,
  cursorVisivel: boolean,
) {
  ctx.fillStyle = COR.fundo;
  ctx.fillRect(0, 0, TELA_W, TELA_H);

  // barra de título
  ctx.fillStyle = COR.barra;
  ctx.fillRect(0, 0, TELA_W, 44);
  ["#ff5f56", "#ffbd2e", "#27c93f"].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(22 + i * 22, 22, 7, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.font = "600 20px ui-monospace, Menlo, monospace";
  ctx.fillStyle = COR.texto;
  ctx.fillText(`${nome.toLowerCase()}@gestor.ia`, 96, 29);
  const rotulo = estado.status === "trabalhando" ? "TRABALHANDO" : estado.status === "erro" ? "ATENÇÃO" : "DISPONÍVEL";
  const corStatus = estado.status === "trabalhando" ? COR.cmd : estado.status === "erro" ? COR.erro : COR.ok;
  ctx.font = "700 16px ui-monospace, Menlo, monospace";
  const w = ctx.measureText(rotulo).width;
  ctx.fillStyle = corStatus;
  ctx.fillText(rotulo, TELA_W - w - 18, 28);

  // linhas (as mais recentes embaixo)
  ctx.font = "18px ui-monospace, Menlo, monospace";
  const altura = 25;
  const cabem = Math.floor((TELA_H - 60) / altura) - 1;
  const linhas = estado.linhas.slice(-cabem);
  let y = 72;
  if (linhas.length === 0) {
    ctx.fillStyle = COR.nota;
    ctx.fillText("aguardando a próxima rotina…", 16, y);
    y += altura;
  }
  for (const l of linhas) {
    ctx.fillStyle = COR.hora;
    ctx.fillText(l.hora, 14, y);
    ctx.fillStyle = COR[l.tipo];
    ctx.fillText(cortar(ctx, l.texto, TELA_W - 90), 78, y);
    y += altura;
  }
  // prompt com cursor
  ctx.fillStyle = COR.ok;
  ctx.fillText("❯", 14, y);
  if (estado.status === "trabalhando" && estado.passo) {
    ctx.fillStyle = COR.passo;
    ctx.fillText(cortar(ctx, estado.passo, TELA_W - 70), 38, y);
  }
  if (cursorVisivel) {
    const x = estado.status === "trabalhando" && estado.passo
      ? 38 + Math.min(ctx.measureText(estado.passo).width, TELA_W - 70) + 4
      : 38;
    ctx.fillStyle = COR.texto;
    ctx.fillRect(x, y - 16, 10, 20);
  }
}

function cortar(ctx: CanvasRenderingContext2D, texto: string, max: number) {
  if (ctx.measureText(texto).width <= max) return texto;
  let t = texto;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t}…`;
}
