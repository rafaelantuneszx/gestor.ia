// Dados fictícios só para ver o escritório funcionando sem login (página /escritorio/demo, só em
// desenvolvimento). Nada daqui vai para o banco.
import type { AgenteInfo, DemandaResumo, EventoCentral, SetorInfo } from "./modelo";
import type { Reuniao } from "../reunioes";
import { falaDoEvento, type Fala } from "../falas";

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
  { id: "davi-faturas", nome: "Davi", cargo: "Monitor de Faturas e Boletos", grupo: "Equipe de rotinas", setor: "financeiro" },
  { id: "igor-folha-financeiro", nome: "Igor", cargo: "Analista RH × Financeiro", grupo: "Equipe de rotinas", setor: "financeiro" },
  { id: "beatriz-fiscal", nome: "Beatriz", cargo: "Assistente Fiscal", grupo: "Equipe de rotinas", setor: "financeiro" },
  { id: "henrique-analise-custos", nome: "Henrique", cargo: "Analista de Acompanhamento de Custos", grupo: "Equipe de rotinas", setor: "custos" },
  { id: "laura-calculos-custos", nome: "Laura", cargo: "Calculista de Custos e Orçamento", grupo: "Equipe de rotinas", setor: "custos" },
];

export const DEMO_SETORES: SetorInfo[] = [
  { id: "direcao", nome: "Direção" },
  { id: "financeiro", nome: "Financeiro" },
  { id: "custos", nome: "Custos e Contratos" },
  { id: "frota-rh", nome: "Frota e RH" },
  { id: "suprimentos", nome: "Suprimentos" },
  { id: "sistemas", nome: "Sistemas" },
  { id: "agenda", nome: "Agenda e e-mails" },
  { id: "reunioes", nome: "Reuniões" },
];

export const DEMO_CONTAGEM: Record<string, number> = {
  direcao: 6, financeiro: 9, custos: 14, "frota-rh": 7, suprimentos: 4, sistemas: 11, agenda: 5, reunioes: 1,
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
  [82, "nota", "helena", "reuniao#2", "agendada · Alinhamento da semana"],
  [80, "inicio", "ricardo-diretor-sistemas", "triagem-sistemas", "Triagem das 7h30"],
  [79.5, "nota", "helena", "reuniao#2", "em_andamento · Alinhamento da semana"],
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
  [61, "nota", "helena", "reuniao#2", "encerrada · Alinhamento da semana"],
  [60, "inicio", "sofia-adm-rh-frota", "km-revisoes", "Conferindo a frota"],
  [60, "inicio", "marina-custos", "conferencia-rdo", "Conferindo os RDOs"],
  [59, "inicio", "davi-faturas", "faturas-boletos", "Faturas e boletos que vencem na semana"],
  [58, "passo", "sofia-adm-rh-frota", "km-revisoes", "SELECT placa, km_atual, km_proxima_revisao FROM frota_veiculos"],
  [57, "passo", "marina-custos", "conferencia-rdo", "rdo_relatorios: 12 obras, 3 sem RDO ontem"],
  [56, "passo", "davi-faturas", "faturas-boletos", "4 faturas de energia sem lançamento"],
  [55, "passo", "sofia-adm-rh-frota", "km-revisoes", "2 revisões vencidas, 1 multa com prazo em 5 dias"],
  [53, "demanda", "sofia-adm-rh-frota", "criou a demanda #101 para rafael", "Aprovar 2 revisões vencidas"],
  [52, "fim", "sofia-adm-rh-frota", "km-revisoes", "3 itens para esta semana", { status: "alerta", alertas: 3, documento_id: "d4" }],
  [50, "passo", "marina-custos", "conferencia-rdo", "v_avanco_item_contrato: OBRA038 em 132% do contratado"],
  [48, "demanda", "marina-custos", "criou a demanda #102 para bruno-financeiro", "Conferir lançamentos da OBRA057"],
  [47, "fim", "davi-faturas", "faturas-boletos", "4 faturas sem lançamento, 2 boletos vencem sexta", { status: "alerta", alertas: 2 }],
  [46, "fim", "marina-custos", "conferencia-rdo", "5 alertas, maior: OBRA038 acima do contratado", { status: "alerta", alertas: 5, documento_id: "d5" }],
  [40, "inicio", "henrique-analise-custos", "acompanhamento-custos", "Custo realizado x orçado por obra"],
  [38, "passo", "henrique-analise-custos", "acompanhamento-custos", "OBRA038: custo 12% acima do orçado"],
  [35, "fim", "henrique-analise-custos", "acompanhamento-custos", "2 obras acima do orçado", { status: "alerta", alertas: 2, documento_id: "d6" }],
  [33, "inicio", "igor-folha-financeiro", "folha-x-financeiro", "Folha de outubro contra o Financeiro"],
  [31, "fim", "igor-folha-financeiro", "folha-x-financeiro", "Provisões batem, falta a competência de outubro", { status: "alerta", alertas: 1 }],
  [30, "inicio", "caio-suprimentos", "pedidos-parados", "Pedidos parados e EPI abaixo do mínimo"],
  [28, "passo", "caio-suprimentos", "pedidos-parados", "cmp_pedidos sem NF há mais de 10 dias: 4"],
  [26, "demanda", "caio-suprimentos", "criou a demanda #104 para rafael", "Liberar pagamento de fornecedor de EPI"],
  [20, "inicio", "bruno-financeiro", "demanda-102", "Conferindo lançamentos da OBRA057"],
  [19, "passo", "bruno-financeiro", "demanda-102", "SELECT * FROM movimentacoes WHERE centro_id = 57"],
  [16, "nota", "bruno-financeiro", "reuniao#1", "agendada · Faturas e boletos de outubro"],
  [14, "nota", "clara-assistente", "reuniao#3", "agendada · Folha × Financeiro: provisões de novembro"],
  [12, "inicio", "marina-custos", "producao-receita", "Produção x Receita da semana"],
  [10, "passo", "marina-custos", "producao-receita", "v_receita_realizada_mes por obra"],
  [9, "nota", "bruno-financeiro", "reuniao#1", "em_andamento · Faturas e boletos de outubro"],
  [8, "inicio", "laura-calculos-custos", "orcamento", "Orçamento da OBRA061"],
  [7, "inicio", "beatriz-fiscal", "notas-fiscais", "Notas fiscais de entrada do mês"],
  [6, "passo", "caio-suprimentos", "pedidos-parados", "v_est_saldo_item: luvas e botinas abaixo do mínimo"],
  [4, "passo", "laura-calculos-custos", "orcamento", "Composição de CBUQ: R$ 412/t com frete"],
  [3, "passo", "bruno-financeiro", "demanda-102", "Centro 57 sem lançamentos desde 01/10"],
  [2, "passo", "beatriz-fiscal", "notas-fiscais", "38 notas, 3 sem XML no Financeiro"],
  [1, "passo", "marina-custos", "producao-receita", "OBRA039: produzido R$ 210 mil, medido R$ 160 mil"],
];

// Falas fictícias. Reunião 2 (encerrada): conversa inteira. Reunião 1 (em andamento): parte já falada e o resto
// chegando a cada 7 s depois que a página abre (minAtras negativo = no futuro), para ver o modo ao vivo.
type FalaDemo = [minAtras: number, reuniao: number, agente: string, texto: string];
const FALAS_2: [string, string][] = [
  ["helena", "Bom dia. Três pontos hoje: a agenda do Rafael até sexta, os pedidos parados em Suprimentos e as revisões da frota. Clara, começa pela agenda?"],
  ["clara-assistente", "Claro. O Rafael tem três compromissos: quarta às 10h com a obra 039, quinta às 14h com a contabilidade e sexta às 9h a visita na 056."],
  ["clara-assistente", "Deixei pronto o rascunho do e-mail para a obra 039. Ele só precisa dizer sim para eu mandar."],
  ["helena", "Ótimo. Caio, e os pedidos?"],
  ["caio-suprimentos", "São quatro pedidos sem nota fiscal há mais de dez dias. O maior é o de EPI, de R$ 18,4 mil."],
  ["caio-suprimentos", "E luvas e botinas estão abaixo do mínimo no almoxarifado central. Se não comprar até quinta, falta na 040."],
  ["helena", "O fornecedor de EPI está esperando pagamento?"],
  ["caio-suprimentos", "Está. A liberação do pagamento é com o Rafael, então eu abro a demanda para ele aprovar."],
  ["helena", "Combinado. Cobra as notas dos quatro pedidos até quinta; essa eu aprovo como diretora."],
  ["clara-assistente", "Coloco um lembrete na agenda do Rafael para olhar a demanda do EPI amanhã cedo."],
  ["helena", "Último ponto: a Sofia achou duas revisões vencidas na frota. Ela leva a demanda para o Rafael ainda hoje."],
  ["helena", "Resumindo: Caio cobra as notas, a liberação do EPI vai para o Rafael e a Clara manda o e-mail da 039 com o ok dele. Obrigada, pessoal."],
];
const FALAS_1: [string, string][] = [
  ["bruno-financeiro", "Pessoal, chamei por causa de três coisas: boletos que vencem até sexta, faturas sem lançamento e o centro 57 parado."],
  ["davi-faturas", "Vencem até sexta dois boletos: R$ 7,2 mil de locação de equipamento e R$ 3,1 mil de combustível."],
  ["davi-faturas", "E tem quatro faturas de energia das obras que ainda não foram lançadas no Financeiro."],
  ["lucia-financeiro", "As de energia eu quero lançadas hoje. Davi, você tem os valores certos de cada uma?"],
  ["davi-faturas", "Tenho. Somam R$ 5,8 mil; a maior é a da 040, com R$ 2,3 mil."],
  ["bruno-financeiro", "Sobre o centro 57: não tem lançamento nenhum desde primeiro de outubro, e a obra está rodando."],
  ["lucia-financeiro", "Isso é sinal de lançamento no centro errado. Bruno, confere se não caiu tudo no 42."],
  ["bruno-financeiro", "Conferi agora: são onze lançamentos no 42 que são do 57, R$ 46 mil no total."],
  ["lucia-financeiro", "Então preparo o ajuste com o SQL pronto e levo para o Rafael aprovar. Não mexo sem o ok dele."],
  ["davi-faturas", "Enquanto isso eu lanço as quatro faturas de energia e aviso quando terminar."],
  ["bruno-financeiro", "E os dois boletos de sexta já estão com previsão no caixa, então não precisam de decisão."],
  ["lucia-financeiro", "Perfeito. Fechando: Davi lança as faturas, eu preparo o ajuste do centro 57 para o Rafael, e o Bruno acompanha os boletos."],
  ["bruno-financeiro", "Registro a ata e as decisões agora. Obrigado, Lúcia; obrigado, Davi."],
];
const FALAS_DEMO: FalaDemo[] = [
  ...FALAS_2.map(([a, t], i) => [79 - i * 1.4, 2, a, t] as FalaDemo),
  ...FALAS_1.map(([a, t], i) => [(i < 6 ? 8.5 - i * 1.3 : -(0.12 + (i - 6) * 0.12)), 1, a, t] as FalaDemo),
];

// Todos os eventos da demonstração, inclusive os que ainda vão acontecer (ts no futuro), com ids na ordem do tempo.
function todosEventosDemo(agora: number): EventoCentral[] {
  const base = (min: number) => new Date(agora - min * 60_000).toISOString();
  const lista: Omit<EventoCentral, "id">[] = [
    ...ROTEIRO.map(([min, tipo, agente, rotina, resumo, extra]) => ({
      ts: base(min), tipo, agente, rotina, resumo: resumo ?? "", status: null, alertas: null, documento_id: null, ...extra,
    })),
    ...FALAS_DEMO.map(([min, r, agente, texto]) => ({
      ts: base(min), tipo: "nota" as const, agente, rotina: `reuniao#${r}`, resumo: `fala: ${texto}`,
      status: null, alertas: null, documento_id: null,
    })),
  ];
  return lista.sort((a, b) => a.ts.localeCompare(b.ts)).map((e, i) => ({ ...e, id: i + 1 }));
}

// Eventos que já aconteceram em `agora`, com a linha do tempo fixada em `base` (o momento em que a página abriu).
export function demoEventos(base = Date.now(), agora = base): EventoCentral[] {
  const limite = new Date(agora).toISOString();
  return todosEventosDemo(base).filter((e) => e.ts <= limite);
}

// Reuniões fictícias: uma em andamento (Bruno, Lúcia e Davi), uma encerrada hoje cedo e uma agendada.
export function demoReunioes(agora = Date.now()): Reuniao[] {
  const min = (m: number) => new Date(agora - m * 60_000).toISOString();
  return [
    {
      id: 1,
      titulo: "Faturas e boletos de outubro",
      convocada_por: "bruno-financeiro",
      participantes: ["lucia-financeiro", "davi-faturas"],
      pauta: [
        { texto: "Boletos que vencem até sexta" },
        { texto: "Faturas sem lançamento no Financeiro" },
        { texto: "Centro 57 sem lançamentos desde 01/10" },
      ],
      agendada_para: min(10),
      estado: "em_andamento",
      iniciada_em: min(9),
      encerrada_em: null,
      ata: null,
      decisoes: [
        { texto: "Lançar as 4 faturas de energia das obras", responsavel: "davi-faturas", aprovacao: null, aprovador: null, estado: "pendente" },
      ],
      demanda_id: 102,
      documento_id: null,
      criado_em: min(16),
      atualizado_em: min(9),
    },
    {
      id: 2,
      titulo: "Alinhamento da semana",
      convocada_por: "helena",
      participantes: ["clara-assistente", "caio-suprimentos"],
      pauta: [
        { texto: "Agenda do Rafael até sexta" },
        { texto: "Pedidos parados e EPI abaixo do mínimo" },
        { texto: "Revisões vencidas da frota" },
      ],
      agendada_para: min(80),
      estado: "encerrada",
      iniciada_em: min(79.5),
      encerrada_em: min(61),
      ata: [
        "## Resumo",
        "",
        "A semana tem **3 compromissos** do Rafael e dois pontos de atenção em Suprimentos.",
        "",
        "## Pontos discutidos",
        "",
        "1. **Agenda**: Clara confirma as reuniões de quarta e quinta e deixa o rascunho do e-mail para a obra 039.",
        "2. **Suprimentos**: 4 pedidos sem NF há mais de 10 dias; luvas e botinas abaixo do mínimo.",
        "3. **Frota**: 2 revisões vencidas; a Sofia leva a demanda ao Rafael.",
        "",
        "| Item | Responsável | Prazo |",
        "| --- | --- | --- |",
        "| Cobrar NF dos 4 pedidos | Caio | quinta |",
        "| Rascunho do e-mail da OBRA039 | Clara | hoje |",
      ].join("\n"),
      decisoes: [
        { texto: "Cobrar as NFs dos 4 pedidos parados", responsavel: "caio-suprimentos", aprovacao: "diretor", aprovador: "helena", estado: "aprovada" },
        { texto: "Liberar pagamento do fornecedor de EPI", responsavel: "caio-suprimentos", aprovacao: "rafael", aprovador: "rafael", estado: "pendente" },
        { texto: "Enviar o rascunho do e-mail da OBRA039", responsavel: "clara-assistente", aprovacao: null, aprovador: null, estado: "feita" },
      ],
      demanda_id: 104,
      documento_id: "d-ata-2",
      criado_em: min(82),
      atualizado_em: min(61),
    },
    {
      id: 3,
      titulo: "Folha × Financeiro: provisões de novembro",
      convocada_por: "clara-assistente",
      participantes: ["igor-folha-financeiro", "paulo-rh", "beatriz-fiscal"],
      pauta: [
        { texto: "Competência de outubro ainda não criada" },
        { texto: "Provisão de 13º e férias" },
        { texto: "Guias de DARF e FGTS do mês" },
      ],
      agendada_para: new Date(agora + 95 * 60_000).toISOString(),
      estado: "agendada",
      iniciada_em: null,
      encerrada_em: null,
      ata: null,
      decisoes: [],
      demanda_id: null,
      documento_id: null,
      criado_em: min(14),
      atualizado_em: min(14),
    },
  ];
}

// Falas de uma reunião da demonstração até `agora`.
export function demoFalas(reuniaoId: number, base = Date.now(), agora = base): Fala[] {
  return demoEventos(base, agora)
    .map(falaDoEvento)
    .filter((f): f is Fala => f !== null && f.reuniaoId === reuniaoId);
}

// Respostas fixas da sala de reunião na demonstração (sem chave da API): quem responde depende do assunto.
const RESPOSTAS_DEMO: { chaves: RegExp; agente: string; texto: string }[] = [
  { chaves: /custo|obra|or[cç]amento|estouro/i, agente: "marina-custos", texto: "Na demonstração eu não tenho os números reais, mas no acompanhamento a 033 é a obra mais crítica. Levanto o detalhe e trago na próxima rodada." },
  { chaves: /sistema|erp|pavimax|integra/i, agente: "ricardo-diretor-sistemas", texto: "Os três sistemas estão no ar. Se precisar de ajuste no banco, eu preparo o SQL e trago para a sua aprovação." },
  { chaves: /caixa|pag|boleto|fatura|financeiro/i, agente: "lucia-financeiro", texto: "Os boletos desta semana já têm previsão no caixa. Pagamento só sai com o seu ok, então eu preparo e trago para aprovar." },
  { chaves: /folha|rh|ponto|f[eé]rias/i, agente: "paulo-rh", texto: "A folha de outubro está em preparo; falta criar a competência. Faço hoje e aviso quando estiver conferida." },
];

export function respostasDemo(texto: string, participantes: string[]): { agente: string; texto: string }[] {
  const tem = (id: string) => participantes.includes(id);
  const quem = participantes.find((p) => p !== "rafael") ?? "helena";
  const conduz = tem("helena") ? "helena" : quem;
  if (!texto.trim()) {
    return [{ agente: conduz, texto: "Bom dia, Rafael. Estamos todos aqui. Qual é o primeiro assunto?" }];
  }
  const r = RESPOSTAS_DEMO.find((x) => x.chaves.test(texto) && tem(x.agente));
  const out = [r ? { agente: r.agente, texto: r.texto } : { agente: conduz, texto: "Entendido. Anoto como próximo passo e distribuo para quem é dono do assunto." }];
  if (conduz !== out[0].agente) out.push({ agente: conduz, texto: "Fica registrado na ata. Mais algum ponto, Rafael?" });
  return out;
}
