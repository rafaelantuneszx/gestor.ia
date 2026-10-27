// Dados fictícios só para ver o escritório funcionando sem login (página /escritorio/demo, só em
// desenvolvimento). Nada daqui vai para o banco.
import type { AgenteInfo, DemandaResumo, EventoCentral, SetorInfo } from "./modelo";

export const DEMO_AGENTES: AgenteInfo[] = [
  { id: "helena", nome: "Helena", cargo: "Diretora de Operações", grupo: "Direção", setor: "direcao" },
  { id: "ricardo-diretor-sistemas", nome: "Ricardo", cargo: "Diretor de Sistemas do Grupo", grupo: "Direção", setor: "sistemas" },
  { id: "clara-assistente", nome: "Clara", cargo: "Assistente Executiva", grupo: "Direção", setor: "agenda" },
  { id: "marina-custos", nome: "Marina", cargo: "Analista de Custos e Contratos", grupo: "Equipe de rotinas", setor: "custos" },
  { id: "sofia-adm-rh-frota", nome: "Sofia", cargo: "Assistente Administrativa, RH e Frota", grupo: "Equipe de rotinas", setor: "frota-rh" },
  { id: "bruno-financeiro", nome: "Bruno", cargo: "Assistente Financeiro", grupo: "Equipe de rotinas", setor: "financeiro" },
  { id: "caio-suprimentos", nome: "Caio", cargo: "Suprimentos e Logística", grupo: "Equipe de rotinas", setor: "suprimentos" },
  { id: "otavio-pavimax", nome: "Otávio", cargo: "Diretor do PaviMax ERP", grupo: "Sistemas", setor: "sistemas" },
  { id: "lucia-financeiro", nome: "Lúcia", cargo: "Diretora do FPAV Financeiro", grupo: "Sistemas", setor: "financeiro" },
  { id: "paulo-rh", nome: "Paulo", cargo: "Diretor do FPAV RH", grupo: "Sistemas", setor: "frota-rh" },
];

export const DEMO_SETORES: SetorInfo[] = [
  { id: "direcao", nome: "Direção" },
  { id: "financeiro", nome: "Financeiro" },
  { id: "custos", nome: "Custos e Contratos" },
  { id: "frota-rh", nome: "Frota e RH" },
  { id: "suprimentos", nome: "Suprimentos" },
  { id: "sistemas", nome: "Sistemas" },
  { id: "agenda", nome: "Agenda e e-mails" },
];

export const DEMO_CONTAGEM: Record<string, number> = {
  direcao: 6, financeiro: 9, custos: 14, "frota-rh": 7, suprimentos: 4, sistemas: 11, agenda: 5,
};

export const DEMO_DEMANDAS: DemandaResumo[] = [
  { id: 101, de: "sofia-adm-rh-frota", para: "rafael", estado: "aguardando-rafael", titulo: "Aprovar 2 revisões vencidas", prioridade: "alta" },
  { id: 102, de: "marina-custos", para: "bruno-financeiro", estado: "aberta", titulo: "Conferir lançamentos da OBRA057", prioridade: "media" },
  { id: 103, de: "ricardo-diretor-sistemas", para: "otavio-pavimax", estado: "andamento", titulo: "Views ainda leem o espelho do Conta Azul", prioridade: "media" },
  { id: 104, de: "caio-suprimentos", para: "rafael", estado: "aguardando-rafael", titulo: "Liberar pagamento de fornecedor de EPI", prioridade: "media" },
];

type Passo = [minAtras: number, tipo: EventoCentral["tipo"], agente: string, rotina: string, resumo?: string, extra?: Partial<EventoCentral>];

// Linha do tempo: minutos atrás em relação a agora. Os últimos ficam "em andamento".
const ROTEIRO: Passo[] = [
  [95, "inicio", "helena", "plantao", "Abertura do dia"],
  [94, "passo", "helena", "plantao", "Lendo os relatórios dos últimos 7 dias"],
  [92, "fim", "helena", "plantao", "4 itens precisam de você hoje", { status: "alerta", alertas: 4, documento_id: "d1" }],
  [88, "inicio", "clara-assistente", "agenda-do-dia", "Agenda de hoje e amanhã"],
  [87, "passo", "clara-assistente", "agenda-do-dia", "Consultando o Google Agenda"],
  [85, "fim", "clara-assistente", "agenda-do-dia", "3 compromissos hoje, 1 rascunho pronto", { status: "ok", documento_id: "d2" }],
  [80, "inicio", "ricardo-diretor-sistemas", "triagem-sistemas", "Triagem das 7h30"],
  [79, "inicio", "otavio-pavimax", "triagem-sistemas", "Saúde do PaviMax"],
  [79, "inicio", "lucia-financeiro", "triagem-sistemas", "Saúde do Financeiro"],
  [79, "inicio", "paulo-rh", "triagem-sistemas", "Saúde do RH"],
  [78, "passo", "otavio-pavimax", "triagem-sistemas", "SELECT * FROM int_sync_log ORDER BY criado_em DESC"],
  [78, "passo", "lucia-financeiro", "triagem-sistemas", "GET /api/v1/obras → 401 (ok, sem token)"],
  [77, "passo", "paulo-rh", "triagem-sistemas", "Competências em aberto: 2"],
  [76, "fim", "lucia-financeiro", "triagem-sistemas", "API ok, nova tentativa funcionando", { status: "ok" }],
  [75, "fim", "paulo-rh", "triagem-sistemas", "Outubro sem competência criada", { status: "alerta", alertas: 1 }],
  [74, "fim", "otavio-pavimax", "triagem-sistemas", "Sincronizações sem falha desde 22h40", { status: "ok" }],
  [73, "demanda", "ricardo-diretor-sistemas", "criou a demanda #103 para otavio-pavimax", "Views ainda leem o espelho do Conta Azul"],
  [72, "fim", "ricardo-diretor-sistemas", "triagem-sistemas", "PaviMax ok · Financeiro ok · RH atenção", { status: "alerta", alertas: 1, documento_id: "d3" }],
  [60, "inicio", "sofia-adm-rh-frota", "km-revisoes", "Conferindo a frota"],
  [60, "inicio", "marina-custos", "conferencia-rdo", "Conferindo os RDOs"],
  [58, "passo", "sofia-adm-rh-frota", "km-revisoes", "SELECT placa, km_atual, km_proxima_revisao FROM frota_veiculos"],
  [57, "passo", "marina-custos", "conferencia-rdo", "rdo_relatorios: 12 obras, 3 sem RDO ontem"],
  [55, "passo", "sofia-adm-rh-frota", "km-revisoes", "2 revisões vencidas, 1 multa com prazo em 5 dias"],
  [53, "demanda", "sofia-adm-rh-frota", "criou a demanda #101 para rafael", "Aprovar 2 revisões vencidas"],
  [52, "fim", "sofia-adm-rh-frota", "km-revisoes", "3 itens para esta semana", { status: "alerta", alertas: 3, documento_id: "d4" }],
  [50, "passo", "marina-custos", "conferencia-rdo", "v_avanco_item_contrato: OBRA038 em 132% do contratado"],
  [48, "demanda", "marina-custos", "criou a demanda #102 para bruno-financeiro", "Conferir lançamentos da OBRA057"],
  [46, "fim", "marina-custos", "conferencia-rdo", "5 alertas, maior: OBRA038 acima do contratado", { status: "alerta", alertas: 5, documento_id: "d5" }],
  [30, "inicio", "caio-suprimentos", "pedidos-parados", "Pedidos parados e EPI abaixo do mínimo"],
  [28, "passo", "caio-suprimentos", "pedidos-parados", "cmp_pedidos sem NF há mais de 10 dias: 4"],
  [26, "demanda", "caio-suprimentos", "criou a demanda #104 para rafael", "Liberar pagamento de fornecedor de EPI"],
  [20, "inicio", "bruno-financeiro", "demanda-102", "Conferindo lançamentos da OBRA057"],
  [19, "passo", "bruno-financeiro", "demanda-102", "SELECT * FROM movimentacoes WHERE centro_id = 57"],
  [12, "inicio", "marina-custos", "producao-receita", "Produção x Receita da semana"],
  [10, "passo", "marina-custos", "producao-receita", "v_receita_realizada_mes por obra"],
  [6, "passo", "caio-suprimentos", "pedidos-parados", "v_est_saldo_item: luvas e botinas abaixo do mínimo"],
  [3, "passo", "bruno-financeiro", "demanda-102", "Centro 57 sem lançamentos desde 01/10"],
  [1, "passo", "marina-custos", "producao-receita", "OBRA039: produzido R$ 210 mil, medido R$ 160 mil"],
];

export function demoEventos(agora = Date.now()): EventoCentral[] {
  return ROTEIRO.map(([min, tipo, agente, rotina, resumo, extra], i) => ({
    id: i + 1,
    ts: new Date(agora - min * 60_000).toISOString(),
    tipo,
    agente,
    rotina,
    resumo: resumo ?? "",
    status: null,
    alertas: null,
    documento_id: null,
    ...extra,
  }));
}
