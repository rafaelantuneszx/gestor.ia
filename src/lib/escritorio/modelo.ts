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
};

// Mesa de cada agente: centro da mesa no chão. A cadeira fica 0,8 m à frente (z maior) e o agente
// olha para o monitor (para -z), de costas para a câmera, e o monitor fica de frente para quem olha.
export const MESAS: Record<string, Vec2> = {
  helena: [-10.5, -5],
  "ricardo-diretor-sistemas": [-7.5, -5],
  "clara-assistente": [-4.5, -5],
  "marina-custos": [2.5, -5],
  "sofia-adm-rh-frota": [5.5, -5],
  "bruno-financeiro": [8.5, -5],
  "caio-suprimentos": [11.5, -5],
  "otavio-pavimax": [-10.5, 1],
  "lucia-financeiro": [-7.5, 1],
  "paulo-rh": [-4.5, 1],
};

export const ZONAS = [
  { nome: "Direção", centro: [-7.5, -4.6] as Vec2, tamanho: [10, 4.4] as Vec2, cor: "#7F77DD" },
  { nome: "Equipe de rotinas", centro: [7, -4.6] as Vec2, tamanho: [13, 4.4] as Vec2, cor: "#1D9E75" },
  { nome: "Sistemas", centro: [-7.5, 1.4] as Vec2, tamanho: [10, 4.4] as Vec2, cor: "#D85A30" },
  { nome: "Arquivo", centro: [6.5, 6.9] as Vec2, tamanho: [11, 3] as Vec2, cor: "#888780" },
];

export const MESA_RAFAEL: Vec2 = [-6, 6.6];
export const ARQUIVO_X0 = 1.8; // primeira prateleira
export const ARQUIVO_PASSO = 1.55;
export const ARQUIVO_Z = 7.6;

const CORREDOR_FUNDOS = -2.4; // entre a fileira do fundo e a do meio
const CORREDOR_FRENTE = 3.9; // entre a fileira do meio e a frente (arquivo e sua mesa)
const CORREDOR_CENTRAL_X = 0.4;

export function cadeira(agente: string): Vec2 {
  const m = MESAS[agente] ?? [0, 0];
  return [m[0], m[1] + 0.8];
}

export function prateleira(setores: SetorInfo[], setor: string): Vec2 {
  const i = Math.max(0, setores.findIndex((s) => s.id === setor));
  return [ARQUIVO_X0 + i * ARQUIVO_PASSO, ARQUIVO_Z];
}

function corredorDe(z: number) {
  return z < -1 ? CORREDOR_FUNDOS : CORREDOR_FRENTE;
}

// Caminho em "L" pelos corredores, sem atravessar mesas: sai para o corredor da sua fileira,
// vai até o corredor central, troca de corredor se precisar e entra no destino.
export function rota(de: Vec2, para: Vec2): Vec2[] {
  const cz1 = corredorDe(de[1]);
  const cz2 = corredorDe(para[1]);
  const pts: Vec2[] = [de, [de[0], cz1]];
  if (cz1 !== cz2) {
    pts.push([CORREDOR_CENTRAL_X, cz1], [CORREDOR_CENTRAL_X, cz2]);
  }
  pts.push([para[0], cz2], para);
  // remove pontos repetidos seguidos
  return pts.filter((p, i) => i === 0 || p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1]);
}

function destinoAgente(id: string): Vec2 {
  if (id === "rafael") return [MESA_RAFAEL[0], MESA_RAFAEL[1] - 1.1];
  const c = cadeira(id);
  return [c[0] + 0.7, c[1]]; // ao lado da cadeira do colega
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
      caminho: rota(cadeira(ev.agente), [prateleira(setores, setor)[0], ARQUIVO_Z - 0.9]),
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
