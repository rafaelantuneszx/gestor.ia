// Modelo do escritório 3D: planta da central, rotas, câmeras e como os eventos do banco viram estado
// (quem está trabalhando, o que aparece no monitor) e viagens (quem leva o quê para onde).

export type Vec2 = [number, number]; // [x, z] no chão, em metros

export type EventoCentral = {
  id: number;
  ts: string;
  tipo: "inicio" | "passo" | "fim" | "nota" | "demanda";
  agente: string;
  rotina: string;
  resumo: string;
  status: string | null;
  alertas: number | null;
  documento_id: string | null;
};

export type DemandaResumo = { id: number; de: string; para: string; estado: string; titulo: string; prioridade: string };
export type AgenteInfo = { id: string; nome: string; cargo: string; grupo: string; setor: string | null };
export type SetorInfo = { id: string; nome: string };

export type LinhaTerminal = { hora: string; texto: string; tipo: "cmd" | "passo" | "ok" | "erro" | "demanda" | "nota" };

export type EstadoAgente = {
  status: "trabalhando" | "disponivel" | "erro";
  rotina: string | null;
  passo: string | null;
  desde: string | null;
  linhas: LinhaTerminal[];
};

export type Viagem = {
  id: string;
  agente: string;
  caminho: Vec2[]; // da cadeira até o destino; a volta é o caminho invertido
  rotulo: string;
  tipo: "documento" | "demanda" | "buscar" | "pausa";
  espera?: number; // segundos parado no destino
};

// ---------- planta ----------
// Central aberta, sem salas. As mesas formam dois arcos virados para a parede de telas (no fundo, z negativo):
//   fileira 1: Frota, Suprimentos, Direção e Sistemas;
//   sua mesa: no centro, entre as duas fileiras, a poucos metros de toda a equipe;
//   fileira 2: Financeiro e Custos.
// Nas laterais ficam a mesa de reunião, o arquivo, a recarga dos robôs e os servidores.

export const GRUPO_COR: Record<string, string> = {
  "Direção": "#7F77DD",
  "Equipe de rotinas": "#1D9E75",
  "Sistemas": "#D85A30",
};

export { COR_SETOR as SETOR_COR } from "@/lib/pessoas";
import { ID_GESTOR, semNomeDoGestor } from "@/lib/banco";

export const PREDIO = { x0: -26, x1: 26, z0: -17, z1: 10 };

// O centro dos arcos fica na parede de telas: toda mesa olha para ela.
export const FOCO: Vec2 = [0, -16];
const graus = (g: number) => (g * Math.PI) / 180;
export function polar(r: number, angulo: number): Vec2 {
  return [FOCO[0] + r * Math.sin(angulo), FOCO[1] + r * Math.cos(angulo)];
}
function paraPolar(p: Vec2): { r: number; a: number } {
  return { r: Math.hypot(p[0] - FOCO[0], p[1] - FOCO[1]), a: Math.atan2(p[0] - FOCO[0], p[1] - FOCO[1]) };
}

export const FILEIRA_1 = 12;
export const FILEIRA_2 = 20;
export const ANEL_1 = 13.6; // corredor atrás da fileira 1
export const ANEL_2 = 21.9; // corredor atrás da fileira 2
const LIGACAO = graus(42); // onde os dois corredores se ligam
const SAIDA = graus(58); // onde o corredor 1 abre para as laterais

export type Kit = "direcao" | "sistemas" | "financeiro" | "custos" | "frota" | "rh" | "suprimentos";
export type Posto = { r: number; angulo: number; telas: 1 | 2 | 3; kit: Kit; setor: string };

const fileira = (r: number, inicio: number, passo: number, itens: [string, 1 | 2 | 3, Kit, string][]) =>
  itens.map(([id, telas, kit, setor], i) => [id, { r, angulo: graus(inicio + i * passo), telas, kit, setor }] as const);

export const POSTOS: Record<string, Posto> = Object.fromEntries([
  ...fileira(FILEIRA_1, -48, 16, [
    ["sofia-adm-rh-frota", 2, "frota", "frota-rh"],
    ["caio-suprimentos", 2, "suprimentos", "suprimentos"],
    ["clara-assistente", 2, "direcao", "direcao"],
    ["helena", 3, "direcao", "direcao"],
    ["ricardo-diretor-sistemas", 3, "sistemas", "sistemas"],
    ["otavio-pavimax", 2, "sistemas", "sistemas"],
    ["paulo-rh", 1, "rh", "sistemas"],
  ]),
  ...fileira(FILEIRA_2, -35, 10, [
    ["lucia-financeiro", 2, "financeiro", "sistemas"],
    ["bruno-financeiro", 3, "financeiro", "financeiro"],
    ["davi-faturas", 2, "financeiro", "financeiro"],
    ["igor-folha-financeiro", 2, "financeiro", "financeiro"],
    ["beatriz-fiscal", 2, "financeiro", "financeiro"],
    ["marina-custos", 3, "custos", "custos"],
    ["henrique-analise-custos", 2, "custos", "custos"],
    ["laura-calculos-custos", 1, "custos", "custos"],
  ]),
]);

// Centro da mesa de cada agente. O robô fica atrás dela, olhando para o monitor e para a parede de telas.
export const MESAS: Record<string, Vec2> = Object.fromEntries(Object.entries(POSTOS).map(([id, p]) => [id, polar(p.r, p.angulo)]));

export function cadeira(agente: string): Vec2 {
  const p = POSTOS[agente];
  return p ? polar(p.r + 0.85, p.angulo) : ENTRADA;
}
// Rotação do robô sentado: de frente para o foco.
export const giroDoPosto = (agente: string) => (POSTOS[agente]?.angulo ?? 0) + Math.PI;

// Sua mesa: no centro da central, sobre uma plataforma baixa.
export const RAIO_GESTOR = 16.2;
export const PLATAFORMA_GESTOR = 2.1;
export const MESA_GESTOR: Vec2 = polar(RAIO_GESTOR, 0);
export const CADEIRA_GESTOR: Vec2 = [MESA_GESTOR[0], MESA_GESTOR[1] + 0.85];
const VISITA_GESTOR: Vec2 = [MESA_GESTOR[0] + 2.0, MESA_GESTOR[1] + 0.5]; // onde quem traz uma demanda para

// Zonas de apoio, sem paredes.
export type Zona = { id: string; nome: string; cor: string; x0: number; x1: number; z0: number; z1: number };
export const ZONAS: Zona[] = [
  { id: "reuniao", nome: "Mesa de reunião", cor: "#fbbf24", x0: -25, x1: -14.5, z0: -12.5, z1: -0.5 },
  { id: "arquivo", nome: "Arquivo", cor: "#a78bfa", x0: 15, x1: 25.4, z0: -15.4, z1: -1 },
  { id: "recarga", nome: "Recarga", cor: "#34d399", x0: -25, x1: -15, z0: 2, z1: 9 },
  { id: "datacenter", nome: "Servidores", cor: "#3dd6f5", x0: 15, x1: 25, z0: 2, z1: 9 },
];
export const ZONA = Object.fromEntries(ZONAS.map((z) => [z.id, z])) as Record<string, Zona>;

// Arquivo: uma estante por setor, na parede da direita, com a frente para o centro.
export const ARQUIVO_X = 24.6;
const ARQUIVO_Z0 = -14;
const ARQUIVO_PASSO = 1.9;
export const estanteZ = (i: number, n: number) => ARQUIVO_Z0 + i * Math.min(ARQUIVO_PASSO, 12.4 / Math.max(n, 1));
export function prateleira(setores: SetorInfo[], setor: string): Vec2 {
  const i = Math.max(0, setores.findIndex((s) => s.id === setor));
  return [ARQUIVO_X - 1.5, estanteZ(i, setores.length)];
}

// Mesa de reunião, aberta, na lateral esquerda.
export const MESA_REUNIAO: Vec2 = [-19.8, -6.5];

// Servidores: duas fileiras viradas para a frente.
export const RACKS: Vec2[] = [4.2, 7.0].flatMap((z) => Array.from({ length: 8 }, (_, i) => [16.7 + i * 0.95, z] as Vec2));

// Docas de recarga: quem está livre há um tempo vai para uma delas.
export const PONTOS_RECARGA: Vec2[] = [[-22.8, 5.5], [-20.8, 5.5], [-18.8, 5.5], [-16.8, 5.5]];

export const ENTRADA: Vec2 = [0, PREDIO.z1 - 0.4];
export function casa(agente: string): Vec2 {
  return MESAS[agente] ? cadeira(agente) : ENTRADA;
}

const semRepetir = (pts: Vec2[]) =>
  pts.filter((p, i) => i === 0 || Math.abs(p[0] - pts[i - 1][0]) > 1e-3 || Math.abs(p[1] - pts[i - 1][1]) > 1e-3);

function arco(r: number, de: number, para: number): Vec2[] {
  const n = Math.max(1, Math.ceil(Math.abs(para - de) / graus(6)));
  return Array.from({ length: n + 1 }, (_, i) => polar(r, de + ((para - de) * i) / n));
}

// Em qual corredor um ponto desemboca. As zonas laterais entram pela saída do corredor 1.
type Acesso = { anel: number; a: number; lateral: boolean };
function acessoDe(p: Vec2): Acesso {
  const { r, a } = paraPolar(p);
  if (r >= 19 && Math.abs(a) <= graus(40)) return { anel: ANEL_2, a, lateral: false };
  if (r >= 14 && r < 19 && Math.abs(a) <= graus(15)) return { anel: ANEL_1, a, lateral: false };
  if (r < 14.5 && Math.abs(a) <= graus(55)) return { anel: ANEL_1, a, lateral: false };
  return { anel: ANEL_1, a: Math.sign(p[0] || 1) * SAIDA, lateral: true };
}

// Caminho pelos corredores, sem atravessar mesas: sai para o corredor, segue o arco e entra no destino.
export function rota(de: Vec2, para: Vec2): Vec2[] {
  const a = acessoDe(de);
  const b = acessoDe(para);
  // na mesma lateral, vai direto
  if (a.lateral && b.lateral && a.a === b.a) return semRepetir([de, para]);
  const meio: Vec2[] = [];
  if (a.anel === b.anel) {
    meio.push(...arco(a.anel, a.a, b.a));
  } else {
    const lado = Math.sign(a.a + b.a || 1) * LIGACAO;
    meio.push(...arco(a.anel, a.a, lado), ...arco(b.anel, lado, b.a));
  }
  return semRepetir([de, ...meio, para]);
}

function destinoAgente(id: string): Vec2 {
  if (id === ID_GESTOR) return VISITA_GESTOR;
  const p = POSTOS[id];
  if (!p) return ENTRADA;
  return polar(p.r + 1.5, p.angulo + 0.07); // ao lado do colega, no corredor
}

// ---------- reuniões ----------
// Cadeiras da mesa de reunião e para onde o robô fica virado (rotação y: 0 olha para +z, π para -z).
// A primeira é a cabeceira perto do centro, para quem convocou.
const [RX, RZ] = MESA_REUNIAO;
const LADO_A = RZ - 1.55;
const LADO_B = RZ + 1.55;
export const ASSENTOS_REUNIAO: { p: Vec2; rotacao: number }[] = [
  { p: [RX + 3.9, RZ], rotacao: -Math.PI / 2 },
  ...[-2.6, -1.3, 0, 1.3, 2.6].flatMap((dx) => [
    { p: [RX + dx, LADO_B] as Vec2, rotacao: Math.PI },
    { p: [RX + dx, LADO_A] as Vec2, rotacao: 0 },
  ]),
  { p: [RX - 3.9, RZ], rotacao: Math.PI / 2 },
];

// Da mesa até a cadeira da reunião: chega pela lateral e contorna a mesa pela faixa livre do lado certo.
export function rotaReuniao(de: Vec2, assento: Vec2): Vec2[] {
  const faixa = assento[1] < RZ - 0.5 ? RZ - 3.0 : assento[1] > RZ + 0.5 ? RZ + 3.0 : RZ;
  const entrada: Vec2 = [-15, faixa];
  return semRepetir([...rota(de, entrada), [assento[0], faixa], assento]);
}

export type LugarReuniao = {
  chave: string; // reunião + cadeira: se mudar, o robô volta e vai de novo
  reuniaoId: number;
  titulo: string;
  assento: Vec2;
  rotacao: number;
  caminho: Vec2[];
};

// Distribui as cadeiras entre quem está em reunião agora (uma cadeira por agente, quem convocou primeiro).
export function lugaresReuniao(
  reunioes: { id: number; titulo: string; convocada_por: string; participantes: string[] }[],
  existe: (agente: string) => boolean,
): Record<string, LugarReuniao> {
  const out: Record<string, LugarReuniao> = {};
  let k = 0;
  for (const r of reunioes) {
    for (const a of [r.convocada_por, ...(r.participantes ?? [])]) {
      if (out[a] || !existe(a) || k >= ASSENTOS_REUNIAO.length) continue;
      const lugar = ASSENTOS_REUNIAO[k++];
      out[a] = {
        chave: `${r.id}:${k}`,
        reuniaoId: r.id,
        titulo: r.titulo,
        assento: lugar.p,
        rotacao: lugar.rotacao,
        caminho: rotaReuniao(casa(a), lugar.p),
      };
    }
  }
  return out;
}

// ---------- câmeras ----------
export type Vista = [number, number, number, number, number, number]; // posição e para onde olha
export type Camera = { id: string; nome: string; atalho?: string; icone: string; vista: Vista };

// Atrás de um trecho do arco, olhando para as mesas e a parede de telas.
function vistaDoArco(r: number, graus_: number): Vista {
  const a = graus(graus_);
  const [x, z] = polar(r + 5.2, a);
  const [tx, tz] = polar(r - 1, a);
  return [x, 3.6, z, tx, 0.95, tz];
}

// Foca o monitor de um agente, com espaço para o painel lateral.
export function vistaDoPosto(id: string, largo: boolean): Vista | null {
  const p = POSTOS[id];
  if (!p) return null;
  const [mx, mz] = polar(p.r, p.angulo);
  const [cx, cz] = polar(p.r + 4.5, p.angulo);
  // tela larga: o painel fica à direita, então o monitor vai para a esquerda do centro
  const dx = largo ? Math.cos(p.angulo) * 0.9 : 0;
  const dz = largo ? -Math.sin(p.angulo) * 0.9 : 0;
  return [cx + dx, 3.1, cz + dz, mx + dx, largo ? 1.15 : 0.7, mz + dz];
}

// Pausa na recarga, para quem está livre há um tempo. Não é trabalho e não conta em nenhum número.
export function viagemPausa(agente: string, n: number): Viagem {
  const ponto = PONTOS_RECARGA[Math.abs(n) % PONTOS_RECARGA.length];
  return { id: `pausa-${agente}-${n}`, agente, caminho: rota(cadeira(agente), ponto), rotulo: "recarregando", tipo: "pausa", espera: 14 };
}

export const CAMERAS: Camera[] = [
  { id: "geral", nome: "Visão geral", atalho: "1", icone: "geral", vista: [0, 21, 33, 0, 4.9, -6] },
  { id: "frente", nome: "De frente para a equipe", atalho: "F", icone: "geral", vista: [0, 5, -13.6, 0, 0.7, -1] },
  { id: "gestor", nome: "Sua mesa", atalho: "2", icone: "gestor", vista: [0, 3.9, 7, 0, 1.7, -5] },
  { id: "direcao", nome: "Direção", atalho: "3", icone: "direcao", vista: vistaDoArco(FILEIRA_1, -8) },
  { id: "sistemas", nome: "Sistemas", atalho: "4", icone: "sistemas", vista: vistaDoArco(FILEIRA_1, 24) },
  { id: "financeiro", nome: "Financeiro", atalho: "5", icone: "financeiro", vista: vistaDoArco(FILEIRA_2, -15) },
  { id: "custos", nome: "Custos", atalho: "6", icone: "custos", vista: vistaDoArco(FILEIRA_2, 25) },
  { id: "frota-rh", nome: "Frota e RH", atalho: "7", icone: "frota-rh", vista: vistaDoArco(FILEIRA_1, -48) },
  { id: "suprimentos", nome: "Suprimentos", atalho: "8", icone: "suprimentos", vista: vistaDoArco(FILEIRA_1, -32) },
  { id: "reuniao", nome: "Mesa de reunião", atalho: "9", icone: "reuniao", vista: [-12.6, 3.6, -1.2, -20, 0.7, -7] },
  { id: "arquivo", nome: "Arquivo", atalho: "A", icone: "arquivo", vista: [15.5, 3.2, -8, 24.6, 1.1, -8] },
  { id: "recarga", nome: "Recarga", atalho: "R", icone: "copa", vista: [-14.5, 3.0, 9.5, -20, 0.8, 5] },
  { id: "datacenter", nome: "Servidores", atalho: "D", icone: "sistemas", vista: [13.6, 3.0, 9.8, 21, 1.2, 4.5] },
  { id: "parede", nome: "Parede de telas", atalho: "P", icone: "reuniao", vista: [0, 3.2, 6, 0, 4.2, -16] },
  { id: "cima", nome: "Vista de cima", atalho: "0", icone: "cima", vista: [0, 50, -3.49, 0, 0, -3.5] },
];
export const CAMERA = Object.fromEntries(CAMERAS.map((c) => [c.id, c])) as Record<string, Camera>;

// Visões do mosaico (CFTV): 6 em tela larga, 4 no celular.
export const MOSAICO = ["gestor", "direcao", "financeiro", "sistemas", "custos", "reuniao"];

// ---------- eventos → estado e viagens ----------

const HORA = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
export const hora = (iso: string) => HORA.format(new Date(iso));

export function estadoVazio(): EstadoAgente {
  return { status: "disponivel", rotina: null, passo: null, desde: null, linhas: [] };
}

const MAX_LINHAS = 60;
const ABERTA_DEMAIS_MS = 2 * 3600 * 1000;

// Aplica um evento ao estado do agente dono dele (imutável). `agora` permite reproduzir o dia.
export function aplicarEvento(estado: EstadoAgente, bruto: EventoCentral): EstadoAgente {
  const ev = { ...bruto, rotina: semNomeDoGestor(bruto.rotina), resumo: semNomeDoGestor(bruto.resumo) };
  const h = hora(ev.ts);
  const linhas = [...estado.linhas];
  let { status, rotina, passo, desde } = estado;
  if (ev.tipo === "inicio") {
    linhas.push({ hora: h, texto: `$ rotina ${ev.rotina}`, tipo: "cmd" });
    if (ev.resumo) linhas.push({ hora: h, texto: `  ${ev.resumo}`, tipo: "nota" });
    status = "trabalhando";
    rotina = ev.rotina;
    passo = ev.resumo || null;
    desde = ev.ts;
  } else if (ev.tipo === "passo") {
    linhas.push({ hora: h, texto: `> ${ev.resumo}`, tipo: "passo" });
    passo = ev.resumo;
    if (status !== "trabalhando") {
      status = "trabalhando";
      rotina = ev.rotina;
      desde = ev.ts;
    }
  } else if (ev.tipo === "fim") {
    const erro = ev.status === "erro";
    const alertas = ev.alertas ? ` · ${ev.alertas} alerta(s)` : "";
    linhas.push({ hora: h, texto: `${erro ? "✗" : "✓"} ${ev.rotina} ${erro ? "com erro" : "concluída"}${alertas}`, tipo: erro ? "erro" : "ok" });
    if (ev.resumo) linhas.push({ hora: h, texto: `  ${ev.resumo}`, tipo: "nota" });
    status = erro ? "erro" : "disponivel";
    rotina = null;
    passo = null;
    desde = null;
  } else if (ev.tipo === "demanda") {
    linhas.push({ hora: h, texto: `→ ${ev.rotina}`, tipo: "demanda" });
    if (ev.resumo) linhas.push({ hora: h, texto: `  ${ev.resumo}`, tipo: "nota" });
  } else {
    linhas.push({ hora: h, texto: `# ${ev.rotina}${ev.resumo ? ` · ${ev.resumo}` : ""}`, tipo: "nota" });
  }
  return { status, rotina, passo, desde, linhas: linhas.slice(-MAX_LINHAS) };
}

// Rotina aberta há mais de 2 h sem "fim" não fica piscando como trabalhando para sempre.
export function conferirTravadas(estados: Record<string, EstadoAgente>, agora = Date.now()) {
  const out: Record<string, EstadoAgente> = {};
  for (const [id, e] of Object.entries(estados)) {
    out[id] = e.status === "trabalhando" && e.desde && agora - new Date(e.desde).getTime() > ABERTA_DEMAIS_MS
      ? { ...e, status: "erro", passo: "parada sem terminar" }
      : e;
  }
  return out;
}

const RE_CRIOU = /criou a demanda #(\d+) para ([\w-]+)/;
const RE_REPASSOU = /demanda #(\d+):.*repassou de [\w-]+ para ([\w-]+)/;
const RE_DECISAO = /^demanda #(\d+): (aprovada|ajuste|recusada)$/;

// Que viagem um evento provoca. Só eventos novos (ao vivo ou na reprodução) geram viagens.
export function viagemDoEvento(
  ev: EventoCentral,
  setores: SetorInfo[],
  agentes: Map<string, AgenteInfo>,
  demandas: DemandaResumo[],
): Viagem | null {
  if (ev.tipo === "fim" && ev.documento_id && agentes.has(ev.agente)) {
    const setor = agentes.get(ev.agente)?.setor ?? "direcao";
    return {
      id: `doc-${ev.id}`,
      agente: ev.agente,
      caminho: rota(cadeira(ev.agente), prateleira(setores, setor)),
      rotulo: "levando o relatório ao arquivo",
      tipo: "documento",
    };
  }
  if (ev.tipo !== "demanda") return null;
  const criou = RE_CRIOU.exec(ev.rotina) ?? RE_REPASSOU.exec(ev.rotina);
  if (criou && agentes.has(ev.agente)) {
    const para = criou[2];
    if (para !== ID_GESTOR && !agentes.has(para)) return null;
    return {
      id: `dem-${ev.id}`,
      agente: ev.agente,
      caminho: rota(cadeira(ev.agente), destinoAgente(para)),
      rotulo: para === ID_GESTOR ? `levando a demanda #${criou[1]} para a sua mesa` : `entregando a demanda #${criou[1]}`,
      tipo: "demanda",
    };
  }
  const decisao = RE_DECISAO.exec(ev.rotina);
  if (decisao) {
    // Você decidiu: quem pediu vai até a sua mesa buscar a resposta.
    const d = demandas.find((x) => x.id === Number(decisao[1]));
    const quem = d && agentes.has(d.para) ? d.para : d && agentes.has(d.de) ? d.de : null;
    if (!quem) return null;
    return {
      id: `dec-${ev.id}`,
      agente: quem,
      caminho: rota(cadeira(quem), destinoAgente(ID_GESTOR)),
      rotulo: `buscando a sua decisão da demanda #${decisao[1]}`,
      tipo: "buscar",
    };
  }
  return null;
}
