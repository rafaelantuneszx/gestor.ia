// Funções do Rafael: quem prepara (agente), quem do escritório pode executar e onde o trabalho para nele.
// Fonte: rafael-enterprises/rotinas/funcoes-por-agente.md (as 68 funções de outubro/2026). As que não estão lá
// vieram de conhecimento/emails-assuntos.md e decisoes/registro.md (campo `fonte`).
// A coluna "pessoa" é proposta para o Rafael validar (reunião #5 de 30/10/2026, decisão 3). Só primeiro nome, sem dado pessoal.

// O último passo de cada função, quando é do Rafael. "ler" quer dizer que o agente entrega e ele só lê.
export type Passo = "ler" | "aprovar" | "pagar" | "enviar" | "lancar" | "dado" | "frota" | "negociar" | "sistemas" | "decidir";
export type Modo = "entrega" | "adianta" | "voce";
export type Status = "ativa" | "planejada" | "sob-demanda";

export type Funcao = {
  area: string;
  nome: string;
  agentes: string[]; // ids de central_agentes (ou de agentes ainda fora dela, ver NOME_AGENTE)
  modo: Modo | null;
  quando: string;
  status: Status;
  ultimo: string; // o que o Rafael faz hoje no fim
  passo: Passo;
  pessoas: string[];
  palavras: string[]; // trechos do título que ligam uma demanda a esta função (sem acento, minúsculo)
  fonte?: string; // só nas funções que não estão no mapa de funções por agente
};

// Agentes que trabalham mas ainda não estão em central_agentes (demanda #68).
export const NOME_AGENTE: Record<string, string> = {
  "tiago-logistica": "Tiago",
  "vitor-engenharia-producao": "Vítor",
  "julio-tesouraria": "Júlio",
};

export const AREAS = [
  "Financeiro",
  "Custos e orçamento de obras",
  "Operacional de obras",
  "Suprimentos e compras",
  "Frota",
  "RH e pessoal",
  "Contratos",
  "Sistemas e TI",
  "Fora do mapa (e-mails e decisões)",
] as const;

const f = (
  area: (typeof AREAS)[number], nome: string, agentes: string[], modo: Modo | null, quando: string, status: Status,
  ultimo: string, passo: Passo, pessoas: string[], palavras: string[] = [], fonte?: string,
): Funcao => ({ area, nome, agentes, modo, quando, status, ultimo, passo, pessoas, palavras, fonte });

const BRUNO = "bruno-financeiro", CLARA = "clara-assistente", MARINA = "marina-custos", CAIO = "caio-suprimentos",
  SOFIA = "sofia-adm-rh-frota", PAULO = "paulo-rh", LUCIA = "lucia-financeiro", OTAVIO = "otavio-pavimax",
  RICARDO = "ricardo-diretor-sistemas", HELENA = "helena", DAVI = "davi-faturas", IGOR = "igor-folha-financeiro",
  BEATRIZ = "beatriz-fiscal", HENRIQUE = "henrique-analise-custos", LAURA = "laura-calculos-custos",
  TIAGO = "tiago-logistica", VITOR = "vitor-engenharia-producao", JULIO = "julio-tesouraria";

const FIN = "Financeiro", CUS = "Custos e orçamento de obras", OPE = "Operacional de obras", SUP = "Suprimentos e compras",
  FRO = "Frota", RH = "RH e pessoal", CON = "Contratos", SIS = "Sistemas e TI", FORA = "Fora do mapa (e-mails e decisões)";

export const FUNCOES: Funcao[] = [
  // Financeiro
  f(FIN, "Lançamentos de fornecedores (NF e boleto)", [BRUNO], "adianta", "Seg a sex, 8h", "planejada", "Aprovar os rascunhos", "lancar", ["Erica"], ["lancadas"]),
  f(FIN, "Conciliação bancária FPAV e BRACTOS", [BRUNO], "adianta", "Ter e sex, 9h", "planejada", "Baixar o OFX dos bancos", "dado", ["Erica"], ["concilia"]),
  f(FIN, "Correção e alinhamento no Conta Azul", [BRUNO], "adianta", "Dia 6", "ativa", "Aprovar as correções", "aprovar", ["Erica"], ["conta azul"]),
  f(FIN, "Validação de NF e negociação prévia", [BRUNO], "adianta", "Sob demanda", "sob-demanda", "Negociar", "negociar", ["Erica"], ["validar nf"]),
  f(FIN, "Fechamento de reembolsos por obra", [BRUNO], "adianta", "Qui e sex, 10h", "planejada", "Aprovar e pagar", "pagar", ["Erica"], ["reembolso"]),
  f(FIN, "Rateio geral mensal (ADM)", [BRUNO, LUCIA], "entrega", "Dia 6, 8h", "ativa", "A Lúcia fecha o mês (decisão de 28/10)", "ler", ["Erica"], ["rateio"]),
  f(FIN, "Revisão de faturamento BRACTOS e FPAV", [BRUNO], "entrega", "Dia 28, 9h", "planejada", "Só ler", "ler", ["Erica"], ["faturamento"]),
  f(FIN, "Contratos e faturas para a contabilidade", [BRUNO, CLARA], "adianta", "Dia 28, 9h", "planejada", "Enviar o e-mail", "enviar", ["Erica"], ["contabilidade"]),
  f(FIN, "Solicitar e subir NFs emitidas", [BRUNO, CLARA], "adianta", "Sob demanda", "sob-demanda", "Enviar a cobrança", "enviar", ["Erica"], ["nfs emitidas"]),
  f(FIN, "Análise de categorias e despesas das obras", [BRUNO], "entrega", "Dia 6, 8h", "ativa", "Só ler", "ler", ["Erica"], ["categoria"]),
  f(FIN, "Produção × receita", [MARINA], "entrega", "Seg, 8h30", "ativa", "Só ler", "ler", ["Rogéria"]),
  f(FIN, "Lançamentos Caju", [BRUNO], "adianta", "Sob demanda", "sob-demanda", "Lançar e pagar no Caju", "pagar", ["Erica"], ["caju"]),
  f(FIN, "Conferência do mês anterior", [BRUNO], "entrega", "Dia 6, 8h", "ativa", "Só ler", "ler", ["Erica"], ["conferencia diaria"]),
  f(FIN, "Rateio pela % das obras na folha", [BRUNO], "entrega", "Dia 6, 8h", "ativa", "Aprovar o lançamento", "aprovar", ["Erica"]),
  f(FIN, "Monitor de faturas e boletos (previsto × real, vencidas)", [DAVI], "entrega", "Seg a sex, 8h30 e 14h", "ativa", "Só ler", "ler", ["Erica"], ["previsto", "vence", "sem previsao", "previsoes sem"]),
  f(FIN, "RH × Financeiro: folha prevista × calculada × paga", [IGOR], "entrega", "Seg, 9h e dias 5, 16 e 21", "ativa", "Só ler", "ler", ["Erica", "Nita"]),
  f(FIN, "FGTS e DARF da folha lançados e pagos nas datas", [IGOR], "entrega", "Dias 16 e 21, 9h", "ativa", "Aprovar mudança de data", "aprovar", ["Erica"], ["fgts", "darf"]),
  f(FIN, "Acompanhamento fiscal (guias e impostos)", [BEATRIZ], "entrega", "Dias 10, 15, 20 e 25 e sex", "ativa", "Só ler", "ler", ["Erica"], ["dctf", "imposto"]),
  f(FIN, "Pedido de guia que falta à contabilidade (7P)", [BEATRIZ, CLARA], "adianta", "Na rotina fiscal", "ativa", "Enviar o e-mail", "enviar", ["Erica"], ["guia", "7p"]),

  // Custos e orçamento de obras
  f(CUS, "Relatório de resultado por obra", [MARINA], "entrega", "Dia 6, 9h", "ativa", "Só ler", "ler", ["Rogéria"], ["resultado"]),
  f(CUS, "Atualização do orçamento de custo", [MARINA], "adianta", "Dia 6", "ativa", "Decidir os cenários", "decidir", ["Rogéria"], ["orcamento de custo"]),
  f(CUS, "Produção das medições × receita", [MARINA, VITOR], "entrega", "Seg, 8h30", "ativa", "Só ler", "ler", ["Rogéria"], ["medic", "previa"]),
  f(CUS, "Reprogramar despesas e receitas", [MARINA], "adianta", "Sob demanda", "sob-demanda", "Validar as premissas", "decidir", ["Erica"], ["reprogram", "receita prevista"]),
  f(CUS, "Conferência de contratos (GLP, locações)", [MARINA], "entrega", "Seg, 9h", "ativa", "Só ler", "ler", ["Rogéria"]),
  f(CUS, "Fornecedores fechados para os próximos meses", [CAIO], "adianta", "Dias 15 e 30, 9h", "planejada", "Confirmar", "aprovar", ["Rogéria"]),
  f(CUS, "Custo de viagem e mobilização", [MARINA], "entrega", "Sob demanda", "sob-demanda", "Só ler", "ler", ["Renan"]),
  f(CUS, "Planejamento × real (quinzenal)", [MARINA], "entrega", "Dia 6", "ativa", "Só ler", "ler", ["Rogéria"]),
  f(CUS, "Rateio de fechamento de posto", [BRUNO], "entrega", "Dia 6, 8h", "ativa", "Aprovar o lançamento", "aprovar", ["Erica"]),
  f(CUS, "Conferência PaviMax × FPAV Financeiro", [RICARDO, OTAVIO], "entrega", "Seg a sáb, 7h30 e 13h30", "ativa", "Só ler", "ler", ["Erica"], ["espelho", "financeiro x pavimax", "sem baixa", "diferentes do pavimax"]),
  f(CUS, "Análise mensal por obra", [MARINA], "entrega", "Dia 6, 9h", "ativa", "Só ler", "ler", ["Rogéria"]),
  f(CUS, "Acompanhamento de custos por obra (projeção e estouro)", [HENRIQUE, LAURA], "entrega", "Seg, 10h", "ativa", "Só ler", "ler", ["Rogéria"], ["projec", "custo das obras", "o prazo"]),
  f(CUS, "Proposta de aditivo quando a obra não fecha", [HENRIQUE, LAURA], "adianta", "Na rotina de segunda", "ativa", "Negociar com o cliente", "negociar", ["Rogéria"], ["aditivo"]),
  f(CUS, "Orçamento de Custo no PaviMax e planilhas de programação", [HENRIQUE, LAURA, OTAVIO], "adianta", "Na rotina de segunda", "ativa", "Aprovar a gravação", "aprovar", ["Rogéria"], ["orcamento de custo"]),

  // Operacional de obras
  f(OPE, "Passagens (mobilização e desmobilização)", [CAIO, TIAGO], "adianta", "Sob demanda", "sob-demanda", "Comprar", "pagar", ["Adrielle"], ["passage"]),
  f(OPE, "Desmobilização de equipes", [MARINA], "adianta", "Sob demanda", "sob-demanda", "Alinhar com o engenheiro", "negociar", ["Renan", "Evandro"], ["desmobiliz"]),
  f(OPE, "Logística e refeição na mobilização", [CAIO, TIAGO], "adianta", "Sob demanda", "sob-demanda", "Aprovar", "aprovar", ["Adrielle", "Evandro"], ["logistica"]),
  f(OPE, "Locação de alojamento", [CAIO], "adianta", "Sob demanda", "sob-demanda", "Negociar e assinar", "negociar", ["Renan"], ["alojamento"]),
  f(OPE, "Recebimento de contratos de máquinas", [MARINA], "entrega", "Seg, 9h", "ativa", "Só ler", "ler", ["Renan"]),
  f(OPE, "Liberação de fornecedores por obra", [CAIO], "entrega", "Qua, 10h", "ativa", "Só ler", "ler", ["Rogéria"]),
  f(OPE, "Fiscalização produção × receita", [MARINA], "entrega", "Seg, 8h30", "ativa", "Só ler", "ler", ["Rogéria"]),
  f(OPE, "Conferência de produção pelo RDO", [MARINA, VITOR], "entrega", "Seg, qua e sex, 8h", "ativa", "Só ler os alertas", "ler", ["Renan", "Evandro"], ["rdo"]),
  f(OPE, "Reunião de resultados (mensal)", [MARINA, CLARA], "voce", "Dia 6 (pauta pronta)", "ativa", "Conduzir a reunião", "decidir", []),
  f(OPE, "Encerramento de obra", [MARINA], "adianta", "Sob demanda", "sob-demanda", "Aprovar o encerramento", "aprovar", ["Rogéria", "Renan"], ["encerramento de obra", "encerrar"]),

  // Suprimentos e compras
  f(SUP, "Cotações de ferramentas e EPIs", [CAIO, CLARA], "adianta", "Dia 20, 9h", "planejada", "Enviar a cotação", "enviar", ["Adrielle"], ["cotacao"]),
  f(SUP, "Compra de EPIs e materiais", [CAIO], "adianta", "Sob demanda", "sob-demanda", "Aprovar e comprar", "pagar", ["Adrielle"], ["compra de epi"]),
  f(SUP, "Fechamento de refeição (quinzenal)", [CAIO], "entrega", "Dias 15 e 30, 9h", "planejada", "Aprovar o pagamento", "pagar", ["Erica"], ["refeicao"]),
  f(SUP, "Fornecedor de uniformes", [CAIO], "adianta", "Sob demanda", "sob-demanda", "Alinhar com o fornecedor", "negociar", ["Adrielle"], ["catalogo de uniformes"]),
  f(SUP, "Pedidos de compra (mobília, alojamento, equipamentos)", [CAIO], "adianta", "Sob demanda", "sob-demanda", "Aprovar", "aprovar", ["Rogéria"], ["pedidos de compra"]),
  f(SUP, "Orçamento de contratações por fase de obra", [CAIO], "adianta", "Sob demanda", "sob-demanda", "Validar", "decidir", ["Rogéria"]),
  f(SUP, "Liberação de faturamento de fornecedores", [CAIO], "entrega", "Qua, 10h", "ativa", "Só ler", "ler", ["Erica"], ["sem numero de nf", "nf_recebida"]),
  f(SUP, "Controle de pedidos no sistema", [CAIO], "entrega", "Qua, 10h", "ativa", "Só ler", "ler", ["Rogéria"], ["pedidos"]),

  // Frota
  f(FRO, "Conferência de KM e revisões", [SOFIA], "entrega", "Seg, 8h", "ativa", "Só ler", "ler", ["Renan"], ["revisao preventiva", "quilometr"]),
  f(FRO, "Agendamento de revisões", [SOFIA, CLARA], "adianta", "Seg, 8h", "ativa", "Enviar ou agendar", "enviar", ["Renan"]),
  f(FRO, "Recarga Ticket Log", [SOFIA], "adianta", "Sex, 9h", "planejada", "Exportar o relatório e fazer a recarga", "dado", ["Renan", "Erica"], ["ticket log"]),
  f(FRO, "Manutenção e aprovação de serviços", [SOFIA], "adianta", "Seg, 8h", "ativa", "Aprovar", "aprovar", ["Renan"], ["manutenc"]),
  f(FRO, "Locações de máquinas", [MARINA], "entrega", "Seg, 9h", "ativa", "Só ler", "ler", ["Renan"], ["locacao"]),
  f(FRO, "Inventário FPAV e BRACTOS", [SOFIA], "adianta", "Sob demanda", "sob-demanda", "Contagem física em campo", "dado", ["Evandro"], ["inventario"]),

  // RH e pessoal
  f(RH, "Correções no sistema RH", [PAULO], "adianta", "Triagem 7h30 e 13h30", "ativa", "Aprovar a publicação", "sistemas", []),
  f(RH, "Liberação da folha", [SOFIA, PAULO], "adianta", "Dia 1, 9h e triagem diária", "planejada", "Aprovar o fechamento", "aprovar", ["Nita"], ["folha", "quinzena"]),
  f(RH, "Rescisões", [SOFIA], "adianta", "Sob demanda", "sob-demanda", "Conferir com o contador", "aprovar", ["Nita"], ["rescis"]),
  f(RH, "Adiantamentos", [SOFIA], "adianta", "Sob demanda", "sob-demanda", "Aprovar", "aprovar", ["Nita"], ["adiantamento"]),
  f(RH, "FGTS", [SOFIA], "adianta", "Dia 1, 9h", "planejada", "Emitir a guia e pagar", "pagar", ["Nita", "Erica"], ["fgts"]),
  f(RH, "DARF", [SOFIA], "adianta", "Dia 1, 9h", "planejada", "Emitir e pagar", "pagar", ["Nita", "Erica"], ["darf"]),
  f(RH, "Comprovantes de seguro de vida", [SOFIA, CLARA], "adianta", "Dia 1, 9h", "planejada", "Enviar o comprovante", "enviar", ["Thalita"], ["seguro de vida"]),
  f(RH, "Tarefas do financeiro no Conta Azul", [BRUNO], "entrega", "Dia 6, 8h", "ativa", "Só ler", "ler", ["Erica"]),
  f(RH, "Cancelamento de benefícios (Caju, Ticket Log, estacionamento)", [SOFIA], "adianta", "Seg, 10h", "planejada", "Cancelar nas plataformas", "lancar", ["Thalita"], ["beneficio"]),
  f(RH, "Cadastro de obra nova", [OTAVIO, PAULO, LUCIA], "adianta", "Sob demanda", "sob-demanda", "Aprovar e mandar os documentos da obra", "aprovar", ["Adrielle", "Rogéria"], ["cadastro pavimax"]),
  f(RH, "Responsável pelo sistema RH", [PAULO], "entrega", "Triagem 7h30 e 13h30", "ativa", "Aprovar mudanças", "sistemas", []),

  // Contratos
  f(CON, "Elaboração e revisão de contratos de locação", [MARINA], "adianta", "Sob demanda", "sob-demanda", "Revisar e assinar", "negociar", ["Rogéria"], ["contrato de locacao"]),
  f(CON, "Conferência de contratos de fornecedores", [MARINA], "entrega", "Seg, 9h", "ativa", "Só ler", "ler", ["Rogéria"]),
  f(CON, "Liberação e faturamento de contratos", [MARINA], "entrega", "Seg, 9h", "ativa", "Só ler", "ler", ["Erica"]),
  f(CON, "Contratos de máquinas", [MARINA], "entrega", "Seg, 9h", "ativa", "Só ler", "ler", ["Renan"]),
  f(CON, "Contratos para o fechamento (contabilidade)", [BRUNO, CLARA], "adianta", "Dia 28, 9h", "planejada", "Enviar", "enviar", ["Erica"]),
  f(CON, "Vencimentos e renovações", [MARINA], "entrega", "Seg, 9h", "ativa", "Decidir renovar", "decidir", ["Rogéria"], ["renova"]),
  f(CON, "Negociação com fornecedores estratégicos", [CAIO, MARINA], "voce", "Sob demanda", "sob-demanda", "Negociar", "negociar", []),
  f(CON, "Fiscalização do cumprimento por obra", [MARINA], "entrega", "Seg, 9h", "ativa", "Só ler", "ler", ["Evandro"]),

  // Sistemas e TI
  f(SIS, "Manutenção do PaviMax, RH e Financeiro", [RICARDO, OTAVIO, LUCIA, PAULO], null, "Triagem seg a sáb, 7h30 e 13h30", "ativa", "Aprovar SQL, publicação e permissões", "sistemas", [], ["cadastro pavimax"]),
  f(SIS, "monday.com (cronograma e solicitações)", [HELENA], null, "Sob demanda", "sob-demanda", "Só ler", "ler", ["Adrielle"], ["monday", "registrar no gestor"]),
  f(SIS, "Google Ads (vagas)", [CLARA], null, "Sob demanda", "sob-demanda", "Publicar o anúncio", "enviar", ["Thalita"], ["vaga"]),
  f(SIS, "Matriz RACI", [HELENA], null, "Sob demanda", "sob-demanda", "Só ler", "ler", [], ["raci"]),
  f(SIS, "Mapeamento de fornecedores essenciais", [CAIO], null, "Qua, 10h", "ativa", "Só ler", "ler", ["Rogéria"]),
  f(SIS, "TI geral", [RICARDO], null, "Triagem", "ativa", "Só ler", "ler", [], ["acesso", "central_agentes"]),

  // Fora do mapa: o que os e-mails e as decisões mostram que o Rafael faz e o mapa de funções não tinha
  f(FORA, "Multas e indicação de condutor", [SOFIA], "adianta", "Todo dia (e-mails × multas no PaviMax)", "ativa", "Indicar o condutor no sistema de infrações", "frota", ["Renan", "Nita"], ["condutor", "multa", "autos"], "E-mails (frota e multas) e decisões #59 e #60"),
  f(FORA, "Máquinas com faturamento direto (cadastro no cliente, medição, NF autorizada)", [CLARA, MARINA], "adianta", "Sob demanda (rotina da Hitachi)", "ativa", "Mandar a ficha do fornecedor e aprovar a medição", "enviar", ["Rogéria", "Renan"], ["obrasplan", "maquinas e da verba"], "E-mails (faturamento direto) e demanda #79"),
  f(FORA, "Fluxo de caixa e cenários para a diretoria", [LUCIA, JULIO], "adianta", "Todo dia", "ativa", "Escolher o cenário (prorrogar ou antecipar)", "decidir", ["Erica"], ["caixa negativo", "negativa"], "Decisões #1 e #74"),
  f(FORA, "Registro diário do Financeiro para a diretoria", [BRUNO, LUCIA], "adianta", "Todo dia, 18h15", "ativa", "Dar o \"pode enviar\"", "enviar", ["Erica"], ["financeiro do dia"], "Decisão de 29/10 (registro diário)"),
  f(FORA, "Teto mensal dos sócios", [BRUNO], "entrega", "Toda semana", "ativa", "Só ler", "ler", ["Erica"], ["socios"], "Decisão de 28/10 (regra mensal)"),
  f(FORA, "Protestos, cartório e boletos vencidos", [], null, "Consulta semanal", "sob-demanda", "Conferir o que foi pago e negociar", "negociar", ["Erica"], ["protesto", "vencidos"], "E-mails (pendências e riscos)"),
  f(FORA, "Alojamento: chaves, vistoria, luz e água", [], null, "Sob demanda", "sob-demanda", "Combinar com o locador", "negociar", ["Renan"], [], "E-mails (alojamento)"),
  f(FORA, "Máquina que dispara as rotinas dos agentes", [HELENA], null, "Seg a sáb, 7h às 19h", "ativa", "Deixar o Mac ligado e o app aberto", "sistemas", [], ["agendador"], "Decisão #37"),
  f(FORA, "Jurídico: citações, notificações e minutas com a advogada", [], null, "Sob demanda", "sob-demanda", "Falar com a advogada e acompanhar prazos", "negociar", [], ["juridic", "citacao", "notificacao"], "E-mails (jurídico e alojamento)"),
  f(FORA, "Bancos: gerente, PIX e débitos sem explicação", [], null, "Sob demanda", "sob-demanda", "Falar com o gerente do banco", "dado", [], ["banco"], "E-mails (pendências)"),
  f(FORA, "Assinaturas e cobranças dos sistemas (monday, Google, Brevo, Hostinger)", [], null, "Sob demanda", "sob-demanda", "Pagar e revisar usuários", "sistemas", [], ["assinatura"], "E-mails (sistemas e assinaturas)"),
  f(FORA, "Propostas de fornecedores e ferramentas novas", [], null, "Sob demanda", "sob-demanda", "Decidir o que segue e o que descarta", "decidir", [], ["proposta comercial"], "E-mails (propostas sem resposta)"),
];

// Situação de cada função. Sem dono: ninguém prepara e ninguém do escritório executa; fica tudo com o Rafael.
export type Situacao = "sem-dono" | "para-em-voce" | "sem-agente" | "ok";

export function situacao(fn: Funcao): Situacao {
  if (fn.agentes.length === 0 && fn.pessoas.length === 0) return "sem-dono";
  if (fn.passo !== "ler" && fn.pessoas.length === 0) return "para-em-voce";
  if (fn.agentes.length === 0) return "sem-agente";
  return "ok";
}

// O gargalo: o que hoje para no Rafael, por tipo de último passo, e quem poderia assumir (proposta).
export const GARGALO: { passo: Exclude<Passo, "ler">; oque: string; quem: string }[] = [
  {
    passo: "aprovar",
    oque: "Aprovar, um por um, o que os agentes já prepararam (correções, lançamentos, folha, pedidos).",
    quem: "Os diretores aprovam sozinhos até R$ 5 mil (regra de autonomia de 28/10). Erica, Nita e Rogéria conferem o que é da área de cada um antes de chegar a você.",
  },
  {
    passo: "pagar",
    oque: "Pagar e comprar: reembolsos, Caju, FGTS e DARF, passagens, EPIs, refeição.",
    quem: "Erica paga o que já está aprovado no Financeiro. Adrielle compra passagens e EPIs dentro do pedido aprovado.",
  },
  {
    passo: "lancar",
    oque: "Lançar NF, boleto e guia que o financeiro encaminha (\"favor lançar\" → \"Lançado\") e mexer nas plataformas (Caju, Ticket Log).",
    quem: "Erica lança direto no Financeiro e o Bruno confere no dia seguinte. Thalita cancela benefícios nas plataformas.",
  },
  {
    passo: "enviar",
    oque: "Dar o \"pode enviar\" em e-mails: contabilidade, cotações, cobranças, registro do dia, agendamento de revisão.",
    quem: "A Clara continua escrevendo o rascunho. Erica envia os da contabilidade e do financeiro, Adrielle as cotações, Renan os da frota.",
  },
  {
    passo: "dado",
    oque: "Buscar dado que está fora dos sistemas: OFX dos bancos, relatório do Ticket Log, contagem do inventário, falar com o banco.",
    quem: "Erica baixa o OFX duas vezes por semana, Renan exporta o Ticket Log, Evandro faz a contagem em campo.",
  },
  {
    passo: "frota",
    oque: "Multas e indicação de condutor: hoje você é o contato das locadoras.",
    quem: "Renan descobre quem estava com o carro e indica o condutor; Nita faz o formulário e o desconto em folha.",
  },
  {
    passo: "negociar",
    oque: "Negociar, assinar e falar com a advogada: alojamentos, aditivos, fornecedores, protestos.",
    quem: "Rogéria conduz locadoras e contratos de locação; Renan cuida de chaves e contas dos alojamentos; Erica negocia boletos vencidos. Jurídico e aditivo com o cliente ficam com você.",
  },
  {
    passo: "sistemas",
    oque: "Sistemas: publicar, dar permissão, aplicar SQL, manter o Mac das rotinas ligado e pagar as assinaturas.",
    quem: "O Ricardo prepara e testa; publicar e dar permissão continuam com você. Adrielle pode acompanhar as cobranças das assinaturas.",
  },
  {
    passo: "decidir",
    oque: "Decisões de dono: cenários de caixa, orçamento de custo, renovar contrato, reunião de resultados.",
    quem: "Ficam com você. Os agentes trazem uma pergunta por vez, com a proposta pronta.",
  },
];

// Liga uma demanda a uma função pelos trechos do título (sem acento e em minúsculas).
export function normalizar(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// O trecho precisa começar uma palavra ("rdo" liga "RDO de 29/10", mas não "acordo").
export function liga(fn: Funcao, tituloNormalizado: string) {
  return fn.palavras.some((p) => {
    for (let i = tituloNormalizado.indexOf(p); i >= 0; i = tituloNormalizado.indexOf(p, i + 1)) {
      if (i === 0 || !/[a-z0-9]/.test(tituloNormalizado[i - 1])) return true;
    }
    return false;
  });
}
