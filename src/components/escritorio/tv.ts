// Desenha o painel do dia na TV da sala de reunião (um canvas usado como textura).
export const TV_W = 1280;
export const TV_H = 720;

export type PainelTV = {
  trabalhando: { nome: string; texto: string }[];
  pendentes: number;
  abertas: number;
  documentos: number;
  eventos: { hora: string; nome: string; texto: string; tipo: string }[];
  // reunião em andamento: a TV mostra a pauta e o cronômetro no lugar do painel do dia
  reuniao?: { titulo: string; pauta: string[]; participantes: string[]; desde: string | null; outras: number; fala?: { nome: string; texto: string } | null } | null;
  // só agendada: faixa "Próxima reunião HH:MM · título" no rodapé do painel do dia
  proxima?: { hora: string; titulo: string } | null;
  // na reprodução do dia, a hora do evento reproduzido (relógio e cronômetro seguem a reprodução)
  relogio?: string | null;
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

function cronometro(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const dd = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${dd(m)}:${dd(ss)}` : `${dd(m)}:${dd(ss)}`;
}

function cabecalho(ctx: CanvasRenderingContext2D, subtitulo: string, agora: Date) {
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#f5f5f4";
  ctx.font = `700 46px ${FONTE}`;
  ctx.fillText("Gestor", 56, 84);
  const lg = ctx.measureText("Gestor").width;
  ctx.fillStyle = "#e3b341";
  ctx.fillText(".IA", 56 + lg, 84);
  ctx.fillStyle = "#94a3b8";
  ctx.font = `500 26px ${FONTE}`;
  ctx.fillText(subtitulo, 56, 122);
  ctx.textAlign = "right";
  ctx.fillStyle = "#f5f5f4";
  ctx.font = `600 64px ${FONTE}`;
  ctx.fillText(HORA.format(agora), TV_W - 56, 90);
  ctx.fillStyle = "#94a3b8";
  ctx.font = `500 24px ${FONTE}`;
  ctx.fillText(DIA.format(agora), TV_W - 56, 124);
  ctx.textAlign = "left";
}

// Quebra o texto em até `maxLinhas` linhas que cabem em `largura`.
function linhas(ctx: CanvasRenderingContext2D, texto: string, largura: number, maxLinhas: number) {
  const out: string[] = [];
  let atual = "";
  for (const palavra of texto.split(/\s+/)) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (ctx.measureText(tentativa).width <= largura || !atual) atual = tentativa;
    else {
      out.push(atual);
      atual = palavra;
    }
  }
  if (atual) out.push(atual);
  if (out.length > maxLinhas) {
    const resto = out.slice(maxLinhas - 1).join(" ");
    return [...out.slice(0, maxLinhas - 1), cortar(ctx, resto, largura)];
  }
  return out;
}

function desenharReuniao(ctx: CanvasRenderingContext2D, r: NonNullable<PainelTV["reuniao"]>, agora: Date) {
  cabecalho(ctx, "Reunião em andamento", agora);

  // título e participantes
  cartao(ctx, 56, 158, TV_W - 112, 150);
  ctx.fillStyle = "#4ade80";
  ctx.fillRect(56, 158, 6, 150);
  ctx.fillStyle = "#4ade80";
  ctx.beginPath();
  ctx.arc(96, 204, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#86efac";
  ctx.font = `600 22px ${FONTE}`;
  ctx.fillText("AO VIVO", 116, 212);
  ctx.fillStyle = "#f8fafc";
  ctx.font = `700 44px ${FONTE}`;
  ctx.fillText(cortar(ctx, r.titulo, TV_W - 112 - 340), 84, 262);
  ctx.fillStyle = "#cbd5e1";
  ctx.font = `500 23px ${FONTE}`;
  ctx.fillText(cortar(ctx, r.participantes.join(" · "), TV_W - 112 - 340), 84, 294);

  // cronômetro
  ctx.textAlign = "right";
  ctx.fillStyle = "#94a3b8";
  ctx.font = `500 22px ${FONTE}`;
  ctx.fillText("tempo de reunião", TV_W - 88, 206);
  ctx.fillStyle = "#f8fafc";
  ctx.font = `700 72px ${FONTE}`;
  const decorrido = r.desde ? agora.getTime() - new Date(r.desde).getTime() : 0;
  ctx.fillText(cronometro(decorrido), TV_W - 88, 284);
  ctx.textAlign = "left";

  // quem está falando: legenda grande no lugar da pauta
  if (r.fala) {
    cartao(ctx, 56, 332, TV_W - 112, 322);
    ctx.fillStyle = "#e3b341";
    ctx.fillRect(56, 332, 6, 322);
    ctx.fillStyle = "#e3b341";
    ctx.font = `700 30px ${FONTE}`;
    ctx.fillText(`${r.fala.nome} está falando`, 88, 382);
    ctx.fillStyle = "#f8fafc";
    ctx.font = `500 38px ${FONTE}`;
    const ls = linhas(ctx, `“${r.fala.texto}”`, TV_W - 112 - 64, 5);
    ls.forEach((l, k) => ctx.fillText(l, 88, 440 + k * 48));
  } else {
  // pauta
  cartao(ctx, 56, 332, TV_W - 112, 322);
  ctx.fillStyle = "#e2e8f0";
  ctx.font = `600 28px ${FONTE}`;
  ctx.fillText("Pauta", 84, 378);
  if (r.pauta.length === 0) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = `400 24px ${FONTE}`;
    ctx.fillText("Sem pauta registrada.", 84, 426);
  }
  let y = 426;
  const largura = TV_W - 112 - 110;
  const max = Math.min(r.pauta.length, 6);
  for (let i = 0; i < max && y < 640; i++) {
    ctx.fillStyle = "#e3b341";
    ctx.font = `700 26px ${FONTE}`;
    ctx.fillText(`${i + 1}`, 92, y);
    ctx.fillStyle = "#f1f5f9";
    ctx.font = `500 25px ${FONTE}`;
    const ls = linhas(ctx, r.pauta[i], largura, 2);
    ls.forEach((l, k) => ctx.fillText(l, 132, y + k * 32));
    y += ls.length * 32 + 14;
  }
  if (r.pauta.length > max) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = `400 22px ${FONTE}`;
    ctx.fillText(`+ ${r.pauta.length - max} itens`, 132, Math.min(y, 640));
  }

  }
  ctx.fillStyle = "#475569";
  ctx.font = `500 20px ${FONTE}`;
  ctx.fillText(
    r.outras > 0 ? `Mais ${r.outras} reunião(ões) em andamento · a ata fica na aba Reuniões` : "A ata e as decisões ficam na aba Reuniões",
    56, 694,
  );
}

export function desenharTV(ctx: CanvasRenderingContext2D, p: PainelTV, agora = p.relogio ? new Date(p.relogio) : new Date()) {
  const fundo = ctx.createLinearGradient(0, 0, TV_W, TV_H);
  fundo.addColorStop(0, "#0b1220");
  fundo.addColorStop(1, "#13203a");
  ctx.fillStyle = fundo;
  ctx.fillRect(0, 0, TV_W, TV_H);

  if (p.reuniao) {
    desenharReuniao(ctx, p.reuniao, agora);
    return;
  }
  cabecalho(ctx, "Painel do dia · Rafael Enterprises", agora);

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

  if (p.proxima) {
    // faixa da próxima reunião no rodapé
    ctx.fillStyle = "rgba(227,179,65,0.16)";
    ctx.beginPath();
    ctx.roundRect(56, 664, TV_W - 112, 44, 12);
    ctx.fill();
    ctx.fillStyle = "#e3b341";
    ctx.font = `700 24px ${FONTE}`;
    const rot = `Próxima reunião ${p.proxima.hora}`;
    ctx.fillText(rot, 78, 694);
    const rw = ctx.measureText(rot).width;
    ctx.fillStyle = "#f1f5f9";
    ctx.font = `500 24px ${FONTE}`;
    ctx.fillText(cortar(ctx, `· ${p.proxima.titulo}`, TV_W - 112 - rw - 60), 90 + rw, 694);
    return;
  }
  ctx.fillStyle = "#475569";
  ctx.font = `500 20px ${FONTE}`;
  ctx.fillText("Atualiza sozinho · as decisões ficam na Mesa de aprovações", 56, 694);
}
