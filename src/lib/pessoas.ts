// Quem é quem no Gestor.IA: aparência (avatar e boneco 3D), voz, ícone da função e o tom de cada um nas reuniões.
// São tabelas editáveis à mão, por id de agente. Nada aqui é deduzido do nome ou do cargo.

export type Genero = "f" | "m";
export type EstiloCabelo = "curto" | "longo" | "coque" | "raspado" | "ondulado";

export type Aparencia = {
  pele: string;
  cabelo: string;
  estilo: EstiloCabelo;
  camisa: string;
  calca: string;
  sapato: string;
  terno?: boolean; // paletó e gravata (o Rafael)
};

// Aparência de cada um. É só visual: troque cores e estilos à vontade.
export const APARENCIA: Record<string, Partial<Aparencia>> = {
  rafael: { pele: "#e2b08a", cabelo: "#241a14", estilo: "curto", camisa: "#1f2a44", calca: "#1f2a44", sapato: "#16120f", terno: true },
  helena: { pele: "#e8b896", cabelo: "#3b2418", estilo: "longo", calca: "#2a2f3a" },
  "clara-assistente": { pele: "#f1c7a5", cabelo: "#8a5a2b", estilo: "coque", calca: "#3d3a4a" },
  "ricardo-diretor-sistemas": { pele: "#c68a62", cabelo: "#1a1410", estilo: "curto", calca: "#2f3542" },
  "otavio-pavimax": { pele: "#e0ac84", cabelo: "#5b5b5b", estilo: "curto", calca: "#4a4136" },
  "lucia-financeiro": { pele: "#b97a56", cabelo: "#1d1410", estilo: "ondulado", calca: "#2a2f3a" },
  "paulo-rh": { pele: "#f1c7a5", cabelo: "#4a3020", estilo: "curto", calca: "#3a3f4a" },
  "marina-custos": { pele: "#d9a37c", cabelo: "#2b1d14", estilo: "longo", calca: "#33384a" },
  "sofia-adm-rh-frota": { pele: "#f5d3b8", cabelo: "#b07a3c", estilo: "ondulado", calca: "#4b5563" },
  "bruno-financeiro": { pele: "#e0ac84", cabelo: "#3a2618", estilo: "curto", calca: "#5b4a3a" },
  "caio-suprimentos": { pele: "#8d5a3b", cabelo: "#151515", estilo: "raspado", calca: "#2f3640" },
  "davi-faturas": { pele: "#c99470", cabelo: "#2a1c12", estilo: "curto", calca: "#36404d" },
  "igor-folha-financeiro": { pele: "#f0c9a8", cabelo: "#6b4a2b", estilo: "ondulado", calca: "#2f3542" },
  "beatriz-fiscal": { pele: "#a86b4a", cabelo: "#140e0a", estilo: "coque", calca: "#3b3446" },
  "henrique-analise-custos": { pele: "#e6b48e", cabelo: "#8a8a8a", estilo: "curto", calca: "#2b3340" },
  "laura-calculos-custos": { pele: "#f3cfb2", cabelo: "#5a3a22", estilo: "longo", calca: "#40384a" },
};

// Voz de cada um: feminina ou masculina. Tabela fixa por id; quem não está aqui usa qualquer voz em português.
export const VOZ_GENERO: Record<string, Genero> = {
  rafael: "m",
  helena: "f",
  "clara-assistente": "f",
  "ricardo-diretor-sistemas": "m",
  "otavio-pavimax": "m",
  "lucia-financeiro": "f",
  "paulo-rh": "m",
  "bruno-financeiro": "m",
  "davi-faturas": "m",
  "igor-folha-financeiro": "m",
  "beatriz-fiscal": "f",
  "marina-custos": "f",
  "henrique-analise-custos": "m",
  "laura-calculos-custos": "f",
  "sofia-adm-rh-frota": "f",
  "caio-suprimentos": "m",
};

// Ícone da função de cada agente (nomes de ícones do lucide, ver components/Avatar.tsx).
export type IconeFuncao =
  | "compass" | "calendar" | "network" | "hardhat" | "landmark" | "users" | "calculator" | "receipt"
  | "arrows" | "filecheck" | "sheet" | "chart" | "sigma" | "truck" | "package" | "crown" | "user";

export const FUNCAO_ICONE: Record<string, IconeFuncao> = {
  rafael: "crown",
  helena: "compass",
  "clara-assistente": "calendar",
  "ricardo-diretor-sistemas": "network",
  "otavio-pavimax": "hardhat",
  "lucia-financeiro": "landmark",
  "paulo-rh": "users",
  "bruno-financeiro": "calculator",
  "davi-faturas": "receipt",
  "igor-folha-financeiro": "arrows",
  "beatriz-fiscal": "filecheck",
  "marina-custos": "sheet",
  "henrique-analise-custos": "chart",
  "laura-calculos-custos": "sigma",
  "sofia-adm-rh-frota": "truck",
  "caio-suprimentos": "package",
};

export const COR_SETOR: Record<string, string> = {
  direcao: "#7F77DD",
  financeiro: "#1D9E75",
  custos: "#378ADD",
  "frota-rh": "#BA7517",
  suprimentos: "#D4537E",
  sistemas: "#D85A30",
  agenda: "#639922",
  reunioes: "#64748b",
};
export const COR_RAFAEL = "#b8875a";

export function corDoAgente(id: string, setor: string | null | undefined) {
  if (id === "rafael") return COR_RAFAEL;
  return (setor && COR_SETOR[setor]) || "#888780";
}

// Como cada um fala nas reuniões (vai no contexto da IA da sala de reunião).
export const PERSONA: Record<string, { area: string; tom: string }> = {
  helena: { area: "Operações e rotinas; conduz as reuniões", tom: "calma, organiza a pauta, resume e distribui os próximos passos" },
  "clara-assistente": { area: "Agenda, pautas e e-mails do Rafael", tom: "cordial, objetiva, confirma datas e prepara rascunhos" },
  "ricardo-diretor-sistemas": { area: "Sistemas do grupo e integrações", tom: "direto, técnico sem jargão, prioriza e confere se os números batem" },
  "otavio-pavimax": { area: "PaviMax ERP: obras, medições, compras, estoque, frota", tom: "pragmático, cita tela e tabela do ERP" },
  "lucia-financeiro": { area: "FPAV Financeiro e finanças do grupo", tom: "precisa, fala de caixa, vencimentos e valores com fonte" },
  "paulo-rh": { area: "FPAV RH: folha, ponto, custo de mão de obra", tom: "cuidadoso, nunca cita salário individual" },
  "bruno-financeiro": { area: "Lançamentos, conciliação, reembolsos e NFs", tom: "prestativo, confere no sistema antes de afirmar" },
  "davi-faturas": { area: "Faturas e boletos", tom: "curto, lista o que vence e o que está sem lançamento" },
  "igor-folha-financeiro": { area: "Folha × Financeiro, FGTS e DARF", tom: "fala só de totais, com datas" },
  "beatriz-fiscal": { area: "Fiscal: guias e impostos", tom: "atenta a prazos, diz o que falta pedir à contabilidade" },
  "marina-custos": { area: "Custos e contratos das obras", tom: "analítica, compara produção, receita e contrato" },
  "henrique-analise-custos": { area: "Acompanhamento de custos por obra", tom: "objetivo, fala de previsto × realizado × projeção" },
  "laura-calculos-custos": { area: "Cálculos de custo e orçamento", tom: "exata, traz o número e como chegou nele" },
  "sofia-adm-rh-frota": { area: "Administrativo, RH e frota", tom: "prática, fala de revisões, multas e prazos" },
  "caio-suprimentos": { area: "Suprimentos e logística", tom: "rápido, fala de pedidos, EPIs e fornecedores" },
};

// Participantes padrão de uma reunião convocada pelo Rafael.
export const PADRAO_REUNIAO_RAFAEL = ["helena", "ricardo-diretor-sistemas", "otavio-pavimax", "lucia-financeiro", "paulo-rh"];

export function iniciais(nome: string) {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

// Mistura uma cor com outra (0 = a, 1 = b), em hex. Sem dependências, serve no servidor e no navegador.
export function misturar(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const c = [16, 8, 0].map((s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
