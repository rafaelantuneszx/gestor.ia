// Modelo do escritório 3D: planta, rotas de caminhada e como os eventos do banco viram estado
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
// Prédio de 42 x 22 m visto de frente, em corte (sem a fachada da frente). Fileira do fundo: as salas
// de trabalho, com as mesas encostadas no fundo e o agente de costas para a câmera, olhando o monitor.
// No meio, o corredor. Na frente: a sua sala, a sala de reunião, o arquivo e a copa.

export const GRUPO_COR: Record<string, string> = {
  "Direção": "#7F77DD",
  "Equipe de rotinas": "#1D9E75",
  "Sistemas": "#D85A30",
};

export const SETOR_COR: Record<string, string> = {
  direcao: "#7F77DD",
  financeiro: "#1D9E75",
  custos: "#378ADD",
  "frota-rh": "#BA7517",
  suprimentos: "#D4537E",
  sistemas: "#D85A30",
  agenda: "#639922",
  reunioes: "#64748b",
};

export const PREDIO = { x0: -18, x1: 24, z0: -11, z1: 11 };
export const CORREDOR = { z0: -4, z1: 3 };
export const CORREDOR_Z = -0.5; // linha por onde se anda no corredor
export const ALTURA_PAREDE = 2.9;

export type Piso = "madeira" | "carpete" | "carpete-quente" | "porcelanato";

export type Sala = {
  id: string;
  nome: string;
  cor: string;
  fileira: "fundo" | "frente";
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  porta: number; // x do centro da porta, na parede do corredor
  faixa: number; // z da faixa livre dentro da sala, por onde se anda
  piso: Piso;
};

const FUNDO = { z0: PREDIO.z0, z1: CORREDOR.z0, faixa: -6 };
const FRENTE = { z0: CORREDOR.z1, z1: PREDIO.z1 };

export const SALAS: Sala[] = [
  { id: "direcao", nome: "Direção", cor: SETOR_COR.direcao, fileira: "fundo", x0: -18, x1: -10, ...FUNDO, porta: -10.9, piso: "madeira" },
  { id: "sistemas", nome: "Sistemas", cor: SETOR_COR.sistemas, fileira: "fundo", x0: -10, x1: 0, ...FUNDO, porta: -0.9, piso: "madeira" },
  { id: "financeiro", nome: "Financeiro", cor: SETOR_COR.financeiro, fileira: "fundo", x0: 0, x1: 9.2, ...FUNDO, porta: 8.3, piso: "madeira" },
  { id: "custos", nome: "Custos e Contratos", cor: SETOR_COR.custos, fileira: "fundo", x0: 9.2, x1: 16, ...FUNDO, porta: 15.1, piso: "madeira" },
  { id: "frota-rh", nome: "Frota e RH", cor: SETOR_COR["frota-rh"], fileira: "fundo", x0: 16, x1: 20, ...FUNDO, porta: 19.1, piso: "madeira" },
  { id: "suprimentos", nome: "Suprimentos", cor: SETOR_COR.suprimentos, fileira: "fundo", x0: 20, x1: 24, ...FUNDO, porta: 23.1, piso: "madeira" },
  { id: "rafael", nome: "Sala do Rafael", cor: "#b8875a", fileira: "frente", x0: -18, x1: -8, ...FRENTE, porta: -9.0, faixa: 7.4, piso: "carpete-quente" },
  { id: "reuniao", nome: "Sala de reunião", cor: "#4b5563", fileira: "frente", x0: -8, x1: 4, ...FRENTE, porta: -7.1, faixa: 9.6, piso: "carpete" },
  { id: "arquivo", nome: "Arquivo", cor: "#888780", fileira: "frente", x0: 4, x1: 16, ...FRENTE, porta: 4.8, faixa: 5.3, piso: "madeira" },
  { id: "copa", nome: "Copa", cor: "#0f766e", fileira: "frente", x0: 16, x1: 24, ...FRENTE, porta: 16.9, faixa: 5.0, piso: "porcelanato" },
];

export const SALA = Object.fromEntries(SALAS.map((s) => [s.id, s])) as Record<string, Sala>;

// Mesa de cada agente: centro da mesa no chão. A cadeira fica 0,7 m à frente (z maior) e o agente
// olha para o monitor (para -z), de costas para a câmera; o monitor fica de frente para quem olha.
const MESA_Z = -9.6;
export const MESAS: Record<string, Vec2> = {
  helena: [-15.6, MESA_Z],
  "clara-assistente": [-12.9, MESA_Z],
  "ricardo-diretor-sistemas": [-8.4, MESA_Z],
  "otavio-pavimax": [-6.2, MESA_Z],
  "lucia-financeiro": [-4.0, MESA_Z],
  "paulo-rh": [-1.8, MESA_Z],
  "bruno-financeiro": [1.3, MESA_Z],
  "davi-faturas": [3.5, MESA_Z],
  "igor-folha-financeiro": [5.7, MESA_Z],
  "beatriz-fiscal": [7.9, MESA_Z],
  "marina-custos": [10.4, MESA_Z],
  "henrique-analise-custos": [12.6, MESA_Z],
  "laura-calculos-custos": [14.8, MESA_Z],
  "sofia-adm-rh-frota": [17.9, MESA_Z],
  "caio-suprimentos": [21.9, MESA_Z],
};

// Sua sala: a mesa fica de frente para a câmera; você senta atrás dela (z menor), olhando para nós.
export const MESA_RAFAEL: Vec2 = [-13, 6.7];
export const CADEIRA_RAFAEL: Vec2 = [MESA_RAFAEL[0], MESA_RAFAEL[1] - 0.85];
const VISITA_RAFAEL: Vec2 = [-10.8, SALA.rafael.faixa]; // onde quem traz uma demanda para, ao lado da mesa

// Arquivo: uma estante por setor, encostada na parede do corredor e aberta para a frente.
export const ARQUIVO_X0 = 5.9;
export const ARQUIVO_PASSO = 1.1;
export const ARQUIVO_Z = 3.45;

// Sala de reunião: a TV fica na parede do corredor, virada para a mesa.
export const TV = { x: -2, y: 1.55, z: 3.09, largura: 2.1, altura: 1.18 };
export const MESA_REUNIAO: Vec2 = [-2, 7.1];

export function cadeira(agente: string): Vec2 {
  const m = MESAS[agente] ?? [0, 0];
  return [m[0], m[1] + 0.7];
}

// Uma estante por setor, com o passo normal enquanto couber; com setores demais, elas estreitam para caber na sala.
const ARQUIVO_LIVRE: [number, number] = [ARQUIVO_X0 - 0.5, SALA.arquivo.x1 - 1.0];
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

// Caminho pelas faixas livres e portas, sem atravessar mesas nem paredes: sai para a faixa da sua
// sala, passa pela porta, anda pelo corredor, entra pela porta do destino e vai pela faixa até lá.
// Dentro da mesma sala, só pela faixa.
export function rota(de: Vec2, para: Vec2): Vec2[] {
  const a = salaDoPonto(de);
  const b = salaDoPonto(para);
  const pts: Vec2[] = [de];
  if (a && b && a.id === b.id) {
    pts.push([de[0], a.faixa], [para[0], a.faixa]);
  } else {
    if (a) pts.push([de[0], a.faixa], [a.porta, a.faixa], [a.porta, CORREDOR_Z]);
    else pts.push([de[0], CORREDOR_Z]);
    if (b) pts.push([b.porta, CORREDOR_Z], [b.porta, b.faixa], [para[0], b.faixa]);
    else pts.push([para[0], CORREDOR_Z]);
  }
  pts.push(para);
  // remove pontos repetidos seguidos
  return pts.filter((p, i) => i === 0 || p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1]);
}

function destinoAgente(id: string): Vec2 {
  if (id === "rafael") return VISITA_RAFAEL;
  const c = cadeira(id);
  return [c[0] + 0.85, c[1] + 0.15]; // ao lado da cadeira do colega
}

// ---------- reuniões ----------
// Cadeiras da mesa de reunião (no chão) e para onde o boneco fica virado ao sentar (rotação y do boneco:
// 0 olha para +z, π para -z). A primeira é a cabeceira perto da porta, para quem convocou.
const [RX, RZ] = MESA_REUNIAO;
const LADO_A = RZ - 1.0; // lado da TV
const LADO_B = RZ + 1.0; // lado de quem olha a TV
export const ASSENTOS_REUNIAO: { p: Vec2; rotacao: number }[] = [
  { p: [RX - 2.85, RZ], rotacao: Math.PI / 2 },
  ...[-1.65, -0.55, 0.55, 1.65].flatMap((dx) => [
    { p: [RX + dx, LADO_B] as Vec2, rotacao: Math.PI },
    { p: [RX + dx, LADO_A] as Vec2, rotacao: 0 },
  ]),
  { p: [RX + 2.85, RZ], rotacao: -Math.PI / 2 },
];
const PASSAGEM_TV = 5.2; // entre o aparador da TV e as cadeiras do lado A

// Quem não tem mesa no escritório (agentes novos) chega pelo fim do corredor.
export const ENTRADA: Vec2 = [PREDIO.x1 - 0.6, CORREDOR_Z];
export function casa(agente: string): Vec2 {
  return MESAS[agente] ? cadeira(agente) : ENTRADA;
}

// Da mesa até a cadeira da reunião: sai pela porta, anda no corredor, entra na sala de reunião e
// contorna a mesa pela passagem do lado certo (lado A pela frente da TV, lado B pelo fundo).
export function rotaReuniao(de: Vec2, assento: Vec2): Vec2[] {
  const sala = SALA.reuniao;
  const ate = rota(de, [sala.porta, CORREDOR_Z]);
  const faixa = assento[1] > RZ ? sala.faixa : PASSAGEM_TV;
  const pts: Vec2[] = [...ate, [sala.porta, faixa], [assento[0], faixa], assento];
  return pts.filter((p, i) => i === 0 || p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1]);
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
      caminho: rota(cadeira(ev.agente), [prateleira(setores, setor)[0], ARQUIVO_Z + 0.95]),
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
