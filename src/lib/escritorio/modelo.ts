// Modelo do escritório 3D: planta, rotas de caminhada, câmeras e como os eventos do banco viram estado
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
  tipo: "documento" | "demanda" | "buscar";
};

// ---------- planta ----------
// Andar corporativo de 52 x 36 m visto de frente, em corte (sem a fachada da frente e sem o teto visto de cima).
// Três faixas de salas e dois corredores largos, ligados por um hall ("espinha") no meio:
//   fundo (z -19 a -8): Direção, Sistemas, Financeiro e Custos, com janelões para a cidade;
//   corredor 1 (z -8 a -4);
//   meio (z -4 a 6): Frota e RH, Suprimentos, sala de reunião, hall, Arquivo e copa;
//   corredor 2 (z 6 a 10);
//   frente (z 10 a 17): a sala do Rafael e a recepção aberta, com balcão, logo e sofás.
// Os agentes sentam de costas para a câmera, olhando o monitor; o Rafael senta de frente.

export const GRUPO_COR: Record<string, string> = {
  "Direção": "#7F77DD",
  "Equipe de rotinas": "#1D9E75",
  "Sistemas": "#D85A30",
};

export { COR_SETOR as SETOR_COR } from "@/lib/pessoas";
import { COR_SETOR } from "@/lib/pessoas";

export const PREDIO = { x0: -26, x1: 26, z0: -19, z1: 17 };
export const ALTURA_PAREDE = 2.9;
export const CORREDORES = {
  c1: { z0: -8, z1: -4, faixa: -6 },
  c2: { z0: 6, z1: 10, faixa: 8 },
} as const;
export type Corredor = keyof typeof CORREDORES;
export const ESPINHA = { x0: 3, x1: 7, faixa: 5, z0: -4, z1: 6 };

export type Piso = "madeira" | "carpete" | "carpete-quente" | "porcelanato" | "concreto";

export type Sala = {
  id: string;
  nome: string;
  cor: string;
  icone: string; // chave em icones.ts
  fileira: "fundo" | "meio" | "frente";
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  corredor: Corredor; // corredor para onde abre a porta
  porta: number; // x do centro da porta
  faixa: number; // z da faixa livre dentro da sala, por onde se anda
  piso: Piso;
  aberta?: boolean; // sem parede para o corredor (recepção)
};

const A = { fileira: "fundo" as const, z0: -19, z1: -8, corredor: "c1" as const, faixa: -14 };
export const SALAS: Sala[] = [
  { id: "direcao", nome: "Direção", cor: COR_SETOR.direcao, icone: "direcao", ...A, x0: -26, x1: -14, porta: -15.0, piso: "madeira" },
  { id: "sistemas", nome: "Sistemas", cor: COR_SETOR.sistemas, icone: "sistemas", ...A, x0: -14, x1: 0, porta: -1.0, piso: "madeira" },
  { id: "financeiro", nome: "Financeiro", cor: COR_SETOR.financeiro, icone: "financeiro", ...A, x0: 0, x1: 14, porta: 13.0, piso: "madeira" },
  { id: "custos", nome: "Custos e Contratos", cor: COR_SETOR.custos, icone: "custos", ...A, x0: 14, x1: 26, porta: 25.0, piso: "madeira" },
  { id: "frota-rh", nome: "Frota e RH", cor: COR_SETOR["frota-rh"], icone: "frota-rh", fileira: "meio", x0: -26, x1: -19, z0: -4, z1: 6, corredor: "c1", porta: -19.9, faixa: 0.9, piso: "madeira" },
  { id: "suprimentos", nome: "Suprimentos", cor: COR_SETOR.suprimentos, icone: "suprimentos", fileira: "meio", x0: -19, x1: -12, z0: -4, z1: 6, corredor: "c1", porta: -12.9, faixa: 0.9, piso: "madeira" },
  { id: "reuniao", nome: "Sala de reunião", cor: "#475569", icone: "reuniao", fileira: "meio", x0: -12, x1: 3, z0: -4, z1: 6, corredor: "c2", porta: -11.0, faixa: 4.3, piso: "carpete" },
  { id: "arquivo", nome: "Arquivo", cor: "#78716c", icone: "arquivo", fileira: "meio", x0: 7, x1: 17, z0: -4, z1: 6, corredor: "c2", porta: 7.9, faixa: -1.9, piso: "madeira" },
  { id: "copa", nome: "Copa", cor: "#0f766e", icone: "copa", fileira: "meio", x0: 17, x1: 26, z0: -4, z1: 6, corredor: "c2", porta: 17.9, faixa: 3.6, piso: "porcelanato" },
  { id: "rafael", nome: "Sala do Rafael", cor: "#b8875a", icone: "rafael", fileira: "frente", x0: -26, x1: -10, z0: 10, z1: 17, corredor: "c2", porta: -11.0, faixa: 11.2, piso: "carpete-quente" },
  { id: "recepcao", nome: "Recepção", cor: "#1f2937", icone: "recepcao", fileira: "frente", x0: -10, x1: 26, z0: 10, z1: 17, corredor: "c2", porta: 8.5, faixa: 15.8, piso: "porcelanato", aberta: true },
];

export const SALA = Object.fromEntries(SALAS.map((s) => [s.id, s])) as Record<string, Sala>;

// Mesa de cada agente: centro da mesa (em L, com o retorno à esquerda) no chão. A cadeira fica 0,7 m à frente
// (z maior) e o agente olha para o monitor (para -z), de costas para a câmera.
export const MESA_Z_FUNDO = -16.4;
export const MESA_Z_MEIO = -2.4;
export const MESAS: Record<string, Vec2> = {
  helena: [-22.0, MESA_Z_FUNDO],
  "clara-assistente": [-18.0, MESA_Z_FUNDO],
  "ricardo-diretor-sistemas": [-11.4, MESA_Z_FUNDO],
  "otavio-pavimax": [-8.4, MESA_Z_FUNDO],
  "lucia-financeiro": [-5.4, MESA_Z_FUNDO],
  "paulo-rh": [-2.4, MESA_Z_FUNDO],
  "bruno-financeiro": [2.4, MESA_Z_FUNDO],
  "davi-faturas": [5.4, MESA_Z_FUNDO],
  "igor-folha-financeiro": [8.4, MESA_Z_FUNDO],
  "beatriz-fiscal": [11.4, MESA_Z_FUNDO],
  "marina-custos": [17.0, MESA_Z_FUNDO],
  "henrique-analise-custos": [20.0, MESA_Z_FUNDO],
  "laura-calculos-custos": [23.0, MESA_Z_FUNDO],
  "sofia-adm-rh-frota": [-22.8, MESA_Z_MEIO],
  "caio-suprimentos": [-15.8, MESA_Z_MEIO],
};

// Sala do Rafael: a mesa fica de frente para a câmera; ele senta atrás dela (z menor), olhando para nós.
export const MESA_RAFAEL: Vec2 = [-19, 13.4];
export const CADEIRA_RAFAEL: Vec2 = [MESA_RAFAEL[0], MESA_RAFAEL[1] - 0.85];
const VISITA_RAFAEL: Vec2 = [-16.9, 13.2]; // onde quem traz uma demanda para, ao lado da mesa

// Arquivo: uma estante por setor, encostada na parede do fundo da sala e aberta para a frente (para a câmera).
export const ARQUIVO_X0 = 8.2;
export const ARQUIVO_PASSO = 1.1;
export const ARQUIVO_Z = -3.6;
export const ARQUIVO_FRENTE = -2.75; // onde se para para guardar o relatório

// Sala de reunião: a TV fica na parede do fundo (z = -4), virada para a mesa e para a câmera.
export const MESA_REUNIAO: Vec2 = [-4.5, 1.0];
export const TV = { x: -4.5, y: 1.62, z: -4 + 0.09, largura: 2.6, altura: 1.46 };

export function cadeira(agente: string): Vec2 {
  const m = MESAS[agente] ?? [0, 0];
  return [m[0], m[1] + 0.7];
}

// Uma estante por setor, com o passo normal enquanto couber; com setores demais, elas estreitam para caber na sala.
const ARQUIVO_LIVRE: [number, number] = [ARQUIVO_X0 - 0.5, SALA.arquivo.x1 - 0.6];
const ARQUIVO_CABEM = Math.floor((ARQUIVO_LIVRE[1] - ARQUIVO_LIVRE[0] + 0.1) / ARQUIVO_PASSO);
export function estante(i: number, n: number): { x: number; escala: number } {
  if (n <= ARQUIVO_CABEM) return { x: ARQUIVO_X0 + i * ARQUIVO_PASSO, escala: 1 };
  const passo = (ARQUIVO_LIVRE[1] - ARQUIVO_LIVRE[0]) / n;
  return { x: ARQUIVO_LIVRE[0] + passo * (i + 0.5), escala: Math.min(1, passo - 0.08) };
}

export function prateleira(setores: SetorInfo[], setor: string): Vec2 {
  const i = Math.max(0, setores.findIndex((s) => s.id === setor));
  return [estante(i, setores.length).x, ARQUIVO_Z];
}

export function salaDoPonto(p: Vec2): Sala | null {
  return SALAS.find((s) => p[0] >= s.x0 && p[0] <= s.x1 && p[1] >= s.z0 && p[1] <= s.z1) ?? null;
}

function corredorDoPonto(p: Vec2): Corredor {
  return Math.abs(p[1] - CORREDORES.c1.faixa) <= Math.abs(p[1] - CORREDORES.c2.faixa) ? "c1" : "c2";
}

// Do ponto até a faixa do corredor: sai para a faixa da sala, vai até a porta e cruza para o corredor.
function saida(p: Vec2): { pts: Vec2[]; corredor: Corredor } {
  const s = salaDoPonto(p);
  if (s) {
    const fz = CORREDORES[s.corredor].faixa;
    if (s.aberta) return { pts: [[p[0], fz]], corredor: s.corredor };
    return { pts: [[p[0], s.faixa], [s.porta, s.faixa], [s.porta, fz]], corredor: s.corredor };
  }
  if (p[0] >= ESPINHA.x0 && p[0] <= ESPINHA.x1 && p[1] > CORREDORES.c1.z1 && p[1] < CORREDORES.c2.z0) {
    return { pts: [[ESPINHA.faixa, p[1]], [ESPINHA.faixa, CORREDORES.c1.faixa]], corredor: "c1" };
  }
  const c = corredorDoPonto(p);
  return { pts: [[p[0], CORREDORES[c].faixa]], corredor: c };
}

const semRepetir = (pts: Vec2[]) =>
  pts.filter((p, i) => i === 0 || Math.abs(p[0] - pts[i - 1][0]) > 1e-6 || Math.abs(p[1] - pts[i - 1][1]) > 1e-6);

// Caminho pelas faixas livres, portas e corredores, sem atravessar mesas nem paredes. Entre os dois corredores,
// passa pelo hall do meio. Dentro da mesma sala, só pela faixa.
export function rota(de: Vec2, para: Vec2): Vec2[] {
  const a = salaDoPonto(de);
  const b = salaDoPonto(para);
  if (a && b && a.id === b.id) return semRepetir([de, [de[0], a.faixa], [para[0], a.faixa], para]);
  const ida = saida(de);
  const volta = saida(para);
  const pts: Vec2[] = [de, ...ida.pts];
  if (ida.corredor !== volta.corredor) {
    pts.push([ESPINHA.faixa, CORREDORES[ida.corredor].faixa], [ESPINHA.faixa, CORREDORES[volta.corredor].faixa]);
  }
  pts.push(...[...volta.pts].reverse(), para);
  return semRepetir(pts);
}

function destinoAgente(id: string): Vec2 {
  if (id === "rafael") return VISITA_RAFAEL;
  const c = cadeira(id);
  return [c[0] + 1.15, c[1] + 0.2]; // ao lado da cadeira do colega (o retorno da mesa fica à esquerda)
}

// ---------- reuniões ----------
// Cadeiras da mesa de reunião e para onde o boneco fica virado ao sentar (rotação y: 0 olha para +z, π para -z).
// A primeira é a cabeceira perto da porta, para quem convocou.
const [RX, RZ] = MESA_REUNIAO;
const LADO_A = RZ - 1.55; // lado da TV
const LADO_B = RZ + 1.55; // lado da câmera
export const ASSENTOS_REUNIAO: { p: Vec2; rotacao: number }[] = [
  { p: [RX - 3.9, RZ], rotacao: Math.PI / 2 },
  ...[-2.6, -1.3, 0, 1.3, 2.6].flatMap((dx) => [
    { p: [RX + dx, LADO_B] as Vec2, rotacao: Math.PI },
    { p: [RX + dx, LADO_A] as Vec2, rotacao: 0 },
  ]),
  { p: [RX + 3.9, RZ], rotacao: -Math.PI / 2 },
];
const PASSAGEM_TV = -2.3; // entre o aparador da TV e as cadeiras do lado A

// Quem não tem mesa no escritório (agentes novos) chega pela porta da recepção.
export const ENTRADA: Vec2 = [SALA.recepcao.porta, PREDIO.z1 - 0.4];
export function casa(agente: string): Vec2 {
  return MESAS[agente] ? cadeira(agente) : ENTRADA;
}

// Da mesa até a cadeira da reunião: sai pela porta, corredores, entra na sala de reunião e contorna a mesa
// pela passagem do lado certo (lado A pela frente da TV, lado B e cabeceiras pela faixa da porta).
export function rotaReuniao(de: Vec2, assento: Vec2): Vec2[] {
  const sala = SALA.reuniao;
  const ate = rota(de, [sala.porta, CORREDORES.c2.faixa]);
  const faixa = assento[1] < RZ - 0.5 ? PASSAGEM_TV : sala.faixa;
  return semRepetir([...ate, [sala.porta, sala.z1], [sala.porta, faixa], [assento[0], faixa], assento]);
}

export type LugarReuniao = {
  chave: string; // reunião + cadeira: se mudar, o boneco volta e vai de novo
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
// Posição da câmera e para onde ela olha. As das salas ficam no canto alto da frente, como câmeras de segurança.
export type Vista = [number, number, number, number, number, number];
export type Camera = { id: string; nome: string; atalho?: string; icone: string; vista: Vista };

function cameraDaSala(s: Sala, lado: "esq" | "dir" = "dir"): Vista {
  const w = s.x1 - s.x0;
  const d = s.z1 - s.z0;
  const cx = (s.x0 + s.x1) / 2;
  const sinal = lado === "dir" ? 1 : -1;
  return [lado === "dir" ? s.x1 - 0.45 : s.x0 + 0.45, 2.72, s.z1 - 0.35, cx - sinal * w * 0.08, 0.55, s.z0 + d * 0.36];
}

export const CAMERAS: Camera[] = [
  { id: "geral", nome: "Visão geral", atalho: "1", icone: "geral", vista: [0, 38, 47, 0, 0, -3.5] },
  { id: "direcao", nome: "Direção", atalho: "2", icone: "direcao", vista: cameraDaSala(SALA.direcao, "esq") },
  { id: "sistemas", nome: "Sistemas", atalho: "3", icone: "sistemas", vista: cameraDaSala(SALA.sistemas) },
  { id: "financeiro", nome: "Financeiro", atalho: "4", icone: "financeiro", vista: cameraDaSala(SALA.financeiro) },
  { id: "custos", nome: "Custos", atalho: "5", icone: "custos", vista: cameraDaSala(SALA.custos) },
  { id: "frota-rh", nome: "Frota e RH", atalho: "6", icone: "frota-rh", vista: cameraDaSala(SALA["frota-rh"]) },
  { id: "suprimentos", nome: "Suprimentos", atalho: "7", icone: "suprimentos", vista: cameraDaSala(SALA.suprimentos) },
  { id: "reuniao", nome: "Reunião", atalho: "8", icone: "reuniao", vista: [-0.6, 2.75, 5.6, -5.0, 0.95, -1.4] },
  { id: "rafael", nome: "Sala do Rafael", atalho: "9", icone: "rafael", vista: [-13.4, 2.9, 16.7, -19.6, 0.85, 12.2] },
  { id: "arquivo", nome: "Arquivo", atalho: "A", icone: "arquivo", vista: [16.5, 2.72, 5.6, 11.2, 0.9, -3.0] },
  { id: "recepcao", nome: "Recepção", atalho: "R", icone: "recepcao", vista: [24.6, 3.4, 16.7, 4.0, 0.6, 12.0] },
  { id: "cima", nome: "Vista de cima", atalho: "0", icone: "cima", vista: [0, 64, -0.99, 0, 0, -1] },
];
export const CAMERA = Object.fromEntries(CAMERAS.map((c) => [c.id, c])) as Record<string, Camera>;

// Visões do mosaico (CFTV): 6 em tela larga, 4 no celular.
export const MOSAICO = ["reuniao", "sistemas", "financeiro", "custos", "direcao", "rafael"];

// ---------- eventos → estado e viagens ----------

const HORA = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
export const hora = (iso: string) => HORA.format(new Date(iso));

export function estadoVazio(): EstadoAgente {
  return { status: "disponivel", rotina: null, passo: null, desde: null, linhas: [] };
}

const MAX_LINHAS = 60;
const ABERTA_DEMAIS_MS = 2 * 3600 * 1000;

// Aplica um evento ao estado do agente dono dele (imutável). `agora` permite reproduzir o dia.
export function aplicarEvento(estado: EstadoAgente, ev: EventoCentral): EstadoAgente {
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
      caminho: rota(cadeira(ev.agente), [prateleira(setores, setor)[0], ARQUIVO_FRENTE]),
      rotulo: "levando o relatório ao arquivo",
      tipo: "documento",
    };
  }
  if (ev.tipo !== "demanda") return null;
  const criou = RE_CRIOU.exec(ev.rotina) ?? RE_REPASSOU.exec(ev.rotina);
  if (criou && agentes.has(ev.agente)) {
    const para = criou[2];
    if (para !== "rafael" && !agentes.has(para)) return null;
    return {
      id: `dem-${ev.id}`,
      agente: ev.agente,
      caminho: rota(cadeira(ev.agente), destinoAgente(para)),
      rotulo: para === "rafael" ? `levando a demanda #${criou[1]} para a sua mesa` : `entregando a demanda #${criou[1]}`,
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
      caminho: rota(cadeira(quem), destinoAgente("rafael")),
      rotulo: `buscando a sua decisão da demanda #${decisao[1]}`,
      tipo: "buscar",
    };
  }
  return null;
}
