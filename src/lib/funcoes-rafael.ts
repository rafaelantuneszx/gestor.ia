// Funções do Rafael e quem cuida de cada uma. Copiado de rafael-enterprises/rotinas/funcoes-por-agente.md
// (outubro/2026); quando aquele arquivo mudar, atualize aqui. "consegue": Entrega = o agente faz até o fim;
// Adianta = prepara e o último passo é do Rafael; Você = decisão ou reunião do Rafael, com o material pronto.

export type Consegue = "Entrega" | "Adianta" | "Você";
export type Funcao = {
  area: string;
  funcao: string;
  agentes: string[];
  consegue: Consegue | null;
  dia: string;
  status: string;
  depende: string;
};

export const FUNCOES: Funcao[] = [
  { area: "Financeiro", funcao: "Lançamentos de fornecedores (NF/boleto) no Conta Azul", agentes: ["bruno-financeiro"], consegue: "Adianta", dia: "Seg a sex, 8h", status: "Planejada (falta caixa de NFs no Gmail)", depende: "Aprovar os rascunhos" },
  { area: "Financeiro", funcao: "Conciliação bancária FPAV e BRACTOS", agentes: ["bruno-financeiro"], consegue: "Adianta", dia: "Ter e sex, 9h", status: "Planejada (falta OFX numa pasta)", depende: "Baixar o OFX dos bancos" },
  { area: "Financeiro", funcao: "Correção e alinhamento no Conta Azul", agentes: ["bruno-financeiro"], consegue: "Adianta", dia: "Dia 6 (na conferência)", status: "Ativa", depende: "Aprovar as correções" },
  { area: "Financeiro", funcao: "Validação de NF e negociação prévia", agentes: ["bruno-financeiro"], consegue: "Adianta", dia: "Sob demanda", status: "Sob demanda", depende: "Negociar" },
  { area: "Financeiro", funcao: "Fechamento de reembolsos por obra", agentes: ["bruno-financeiro"], consegue: "Adianta", dia: "Qui (conferência) e sex (fechamento), 10h", status: "Planejada", depende: "Aprovar e pagar" },
  { area: "Financeiro", funcao: "Rateio geral mensal (ADM)", agentes: ["bruno-financeiro"], consegue: "Entrega", dia: "Dia 6, 8h", status: "Ativa (proposta)", depende: "Fechar o mês no Financeiro" },
  { area: "Financeiro", funcao: "Revisão de faturamento BRACTOS e FPAV", agentes: ["bruno-financeiro"], consegue: "Entrega", dia: "Dia 28, 9h", status: "Planejada", depende: "Só ler" },
  { area: "Financeiro", funcao: "Contratos e faturas para a contabilidade", agentes: ["bruno-financeiro", "clara-assistente"], consegue: "Adianta", dia: "Dia 28, 9h", status: "Planejada", depende: "Enviar o e-mail" },
  { area: "Financeiro", funcao: "Solicitar e subir NFs emitidas", agentes: ["bruno-financeiro", "clara-assistente"], consegue: "Adianta", dia: "Sob demanda", status: "Sob demanda", depende: "Enviar a cobrança" },
  { area: "Financeiro", funcao: "Análise de categorias e despesas das obras", agentes: ["bruno-financeiro"], consegue: "Entrega", dia: "Dia 6, 8h", status: "Ativa", depende: "Só ler" },
  { area: "Financeiro", funcao: "Produção x Receita", agentes: ["marina-custos"], consegue: "Entrega", dia: "Seg, 8h30", status: "Ativa", depende: "Só ler" },
  { area: "Financeiro", funcao: "Lançamentos CAJU", agentes: ["bruno-financeiro"], consegue: "Adianta", dia: "Sob demanda", status: "Sob demanda", depende: "Lançar e pagar no CAJU" },
  { area: "Financeiro", funcao: "Conferência do mês anterior", agentes: ["bruno-financeiro"], consegue: "Entrega", dia: "Dia 6, 8h", status: "Ativa", depende: "Só ler" },
  { area: "Financeiro", funcao: "Rateio pela % das obras na folha", agentes: ["bruno-financeiro"], consegue: "Entrega", dia: "Dia 6, 8h", status: "Ativa (proposta)", depende: "Aprovar o lançamento" },
  { area: "Financeiro", funcao: "Monitor de faturas e boletos: previsões de 7 dias e vencidas, documento lançado, valor real × previsto (> 5%), pago sem previsão", agentes: ["davi-faturas"], consegue: "Entrega", dia: "Seg a sex, 8h30 e 14h", status: "Ativa", depende: "Só ler (ajustes vêm pela Lúcia)" },
  { area: "Financeiro", funcao: "RH × Financeiro: folha prevista × calculada × paga, diárias × pagamentos, competência fechada a tempo", agentes: ["igor-folha-financeiro"], consegue: "Entrega", dia: "Seg, 9h e dias 5, 16 e 21, 9h", status: "Ativa", depende: "Só ler" },
  { area: "Financeiro", funcao: "FGTS (dia 20, antecipa no feriado) e DARF da folha (dia 15) lançados e pagos nas datas", agentes: ["igor-folha-financeiro"], consegue: "Entrega", dia: "Dias 16 e 21, 9h", status: "Ativa", depende: "Aprovar mudança de data" },
  { area: "Financeiro", funcao: "Acompanhamento fiscal: guias da 7P, DAS, PIS, COFINS, ISS, IRPJ/CSLL, retidos e parcelamentos lançados certos", agentes: ["beatriz-fiscal"], consegue: "Entrega", dia: "Dias 10, 15, 20 e 25, 9h e sex, 10h", status: "Ativa", depende: "Só ler" },
  { area: "Financeiro", funcao: "Pedido de guia que falta à contabilidade (7P)", agentes: ["beatriz-fiscal", "clara-assistente"], consegue: "Adianta", dia: "Sob demanda (na rotina)", status: "Ativa", depende: "Enviar o e-mail" },
  { area: "Custos e Orçamento de Obras", funcao: "Relatório de resultado por obra", agentes: ["marina-custos"], consegue: "Entrega", dia: "Dia 6, 9h", status: "Ativa", depende: "Só ler" },
  { area: "Custos e Orçamento de Obras", funcao: "Atualização do orçamento de custo", agentes: ["marina-custos"], consegue: "Adianta", dia: "Dia 6 (no resultado)", status: "Ativa (só compara)", depende: "Decidir os cenários" },
  { area: "Custos e Orçamento de Obras", funcao: "Produção das medições x receita", agentes: ["marina-custos"], consegue: "Entrega", dia: "Seg, 8h30", status: "Ativa", depende: "Só ler" },
  { area: "Custos e Orçamento de Obras", funcao: "Reprogramar despesas e receitas", agentes: ["marina-custos"], consegue: "Adianta", dia: "Sob demanda", status: "Sob demanda", depende: "Validar as premissas" },
  { area: "Custos e Orçamento de Obras", funcao: "Conferência de contratos (GLP, locações)", agentes: ["marina-custos"], consegue: "Entrega", dia: "Seg, 9h", status: "Ativa", depende: "Só ler" },
  { area: "Custos e Orçamento de Obras", funcao: "Fornecedores fechados para os próximos meses", agentes: ["caio-suprimentos"], consegue: "Adianta", dia: "Dias 15 e 30, 9h", status: "Planejada", depende: "Confirmar" },
  { area: "Custos e Orçamento de Obras", funcao: "Custo de viagem e mobilização", agentes: ["marina-custos"], consegue: "Entrega", dia: "Sob demanda", status: "Sob demanda", depende: "Só ler" },
  { area: "Custos e Orçamento de Obras", funcao: "Planejamento x real (quinzenal)", agentes: ["marina-custos"], consegue: "Entrega", dia: "Dia 6 (no resultado)", status: "Ativa", depende: "Só ler" },
  { area: "Custos e Orçamento de Obras", funcao: "Rateio de fechamento de posto", agentes: ["bruno-financeiro"], consegue: "Entrega", dia: "Dia 6, 8h", status: "Ativa (proposta)", depende: "Aprovar o lançamento" },
  { area: "Custos e Orçamento de Obras", funcao: "Conferência PaviMax x FPAV Financeiro", agentes: ["ricardo-diretor-sistemas"], consegue: "Entrega", dia: "Seg a sáb, 7h30 e 13h30", status: "Ativa", depende: "Só ler" },
  { area: "Custos e Orçamento de Obras", funcao: "Análise mensal por obra", agentes: ["marina-custos"], consegue: "Entrega", dia: "Dia 6, 9h", status: "Ativa", depende: "Só ler" },
  { area: "Custos e Orçamento de Obras", funcao: "Acompanhamento de custos por obra: programação × Orçamento de Custo × lançado, projeção no fim do mês e da obra, data e categoria do estouro (novo, 27/10)", agentes: ["henrique-analise-custos", "laura-calculos-custos", "marina-custos"], consegue: "Entrega", dia: "Seg, 10h (em reunião) e sob demanda", status: "Ativa", depende: "Só ler" },
  { area: "Custos e Orçamento de Obras", funcao: "Proposta de aditivo (valor e justificativa) quando a obra não fecha no orçamento", agentes: ["henrique-analise-custos", "laura-calculos-custos"], consegue: "Adianta", dia: "Na rotina de segunda", status: "Ativa", depende: "Negociar com o cliente" },
  { area: "Custos e Orçamento de Obras", funcao: "Atualização do Orçamento de Custo no PaviMax e das planilhas de programação", agentes: ["henrique-analise-custos", "laura-calculos-custos", "otavio-pavimax"], consegue: "Adianta", dia: "Na rotina de segunda", status: "Ativa (só proposta)", depende: "Aprovar a gravação" },
  { area: "Operacional de Obras", funcao: "Passagens (mobilização e desmobilização)", agentes: ["caio-suprimentos"], consegue: "Adianta", dia: "Sob demanda", status: "Sob demanda", depende: "Comprar" },
  { area: "Operacional de Obras", funcao: "Desmobilização de equipes", agentes: ["marina-custos"], consegue: "Adianta", dia: "Sob demanda", status: "Sob demanda", depende: "Alinhar com o engenheiro" },
  { area: "Operacional de Obras", funcao: "Logística e refeição na mobilização", agentes: ["caio-suprimentos"], consegue: "Adianta", dia: "Sob demanda", status: "Sob demanda", depende: "Aprovar" },
  { area: "Operacional de Obras", funcao: "Locação de alojamento", agentes: ["caio-suprimentos"], consegue: "Adianta", dia: "Sob demanda", status: "Sob demanda", depende: "Negociar e assinar" },
  { area: "Operacional de Obras", funcao: "Recebimento de contratos de máquinas", agentes: ["marina-custos"], consegue: "Entrega", dia: "Seg, 9h", status: "Ativa", depende: "Só ler" },
  { area: "Operacional de Obras", funcao: "Liberação de fornecedores por obra", agentes: ["caio-suprimentos"], consegue: "Entrega", dia: "Qua, 10h", status: "Ativa", depende: "Só ler" },
  { area: "Operacional de Obras", funcao: "Fiscalização produção x receita", agentes: ["marina-custos"], consegue: "Entrega", dia: "Seg, 8h30", status: "Ativa", depende: "Só ler" },
  { area: "Operacional de Obras", funcao: "Conferência de produção pelo RDO", agentes: ["marina-custos"], consegue: "Entrega", dia: "Seg, qua e sex, 8h (e RDO faltando no fechamento das 18h)", status: "Ativa", depende: "Só ler os alertas" },
  { area: "Operacional de Obras", funcao: "Reunião de resultados (mensal)", agentes: ["marina-custos", "clara-assistente"], consegue: "Você", dia: "Dia 6 (pauta pronta)", status: "Ativa", depende: "Conduzir a reunião" },
  { area: "Operacional de Obras", funcao: "Encerramento de obra", agentes: ["marina-custos"], consegue: "Adianta", dia: "Sob demanda", status: "Sob demanda", depende: "Aprovar o encerramento" },
  { area: "Suprimentos e Compras", funcao: "Cotações de ferramentas e EPIs", agentes: ["caio-suprimentos", "clara-assistente"], consegue: "Adianta", dia: "Dia 20, 9h", status: "Planejada", depende: "Enviar a cotação" },
  { area: "Suprimentos e Compras", funcao: "Compra de EPIs e materiais", agentes: ["caio-suprimentos"], consegue: "Adianta", dia: "Sob demanda", status: "Sob demanda", depende: "Aprovar e comprar" },
  { area: "Suprimentos e Compras", funcao: "Fechamento de refeição (quinzenal)", agentes: ["caio-suprimentos"], consegue: "Entrega", dia: "Dias 15 e 30, 9h", status: "Planejada", depende: "Aprovar o pagamento" },
  { area: "Suprimentos e Compras", funcao: "Fornecedor de uniformes", agentes: ["caio-suprimentos"], consegue: "Adianta", dia: "Sob demanda", status: "Sob demanda", depende: "Alinhar com o fornecedor" },
  { area: "Suprimentos e Compras", funcao: "Pedidos de compra (mobília, alojamento, equipamentos)", agentes: ["caio-suprimentos"], consegue: "Adianta", dia: "Sob demanda", status: "Sob demanda", depende: "Aprovar" },
  { area: "Suprimentos e Compras", funcao: "Orçamento de contratações por fase de obra", agentes: ["caio-suprimentos"], consegue: "Adianta", dia: "Sob demanda", status: "Sob demanda", depende: "Validar" },
  { area: "Suprimentos e Compras", funcao: "Liberação de faturamento de fornecedores", agentes: ["caio-suprimentos"], consegue: "Entrega", dia: "Qua, 10h", status: "Ativa", depende: "Só ler" },
  { area: "Suprimentos e Compras", funcao: "Controle de pedidos no sistema", agentes: ["caio-suprimentos"], consegue: "Entrega", dia: "Qua, 10h", status: "Ativa", depende: "Só ler" },
  { area: "Gestão de Frota", funcao: "Conferência de KM e revisões", agentes: ["sofia-adm-rh-frota"], consegue: "Entrega", dia: "Seg, 8h", status: "Ativa", depende: "Só ler" },
  { area: "Gestão de Frota", funcao: "Agendamento de revisões", agentes: ["sofia-adm-rh-frota", "clara-assistente"], consegue: "Adianta", dia: "Seg, 8h (a lista)", status: "Ativa", depende: "Enviar ou agendar" },
  { area: "Gestão de Frota", funcao: "Recarga Ticket Log", agentes: ["sofia-adm-rh-frota"], consegue: "Adianta", dia: "Sex, 9h", status: "Planejada (falta relatório do Ticket Log)", depende: "Fazer a recarga" },
  { area: "Gestão de Frota", funcao: "Manutenção e aprovação de serviços", agentes: ["sofia-adm-rh-frota"], consegue: "Adianta", dia: "Seg, 8h", status: "Ativa", depende: "Aprovar" },
  { area: "Gestão de Frota", funcao: "Locações de máquinas", agentes: ["marina-custos"], consegue: "Entrega", dia: "Seg, 9h", status: "Ativa", depende: "Só ler" },
  { area: "Gestão de Frota", funcao: "Inventário FPAV e BRACTOS", agentes: ["sofia-adm-rh-frota"], consegue: "Adianta", dia: "Sob demanda", status: "Sob demanda", depende: "Contagem física em campo" },
  { area: "RH e Sistemas de Pessoal", funcao: "Correções no sistema RH", agentes: ["paulo-rh"], consegue: "Adianta", dia: "Triagem 7h30 e 13h30", status: "Ativa", depende: "Aprovar a publicação" },
  { area: "RH e Sistemas de Pessoal", funcao: "Liberação da folha", agentes: ["sofia-adm-rh-frota"], consegue: "Adianta", dia: "Dia 1, 9h (prazos) e triagem diária", status: "Planejada", depende: "Aprovar o fechamento" },
  { area: "RH e Sistemas de Pessoal", funcao: "Rescisões", agentes: ["sofia-adm-rh-frota"], consegue: "Adianta", dia: "Sob demanda", status: "Sob demanda", depende: "Conferir com o contador" },
  { area: "RH e Sistemas de Pessoal", funcao: "Adiantamentos", agentes: ["sofia-adm-rh-frota"], consegue: "Adianta", dia: "Sob demanda", status: "Sob demanda", depende: "Aprovar" },
  { area: "RH e Sistemas de Pessoal", funcao: "FGTS", agentes: ["sofia-adm-rh-frota"], consegue: "Adianta", dia: "Dia 1, 9h", status: "Planejada", depende: "Emitir a guia e pagar" },
  { area: "RH e Sistemas de Pessoal", funcao: "DARF", agentes: ["sofia-adm-rh-frota"], consegue: "Adianta", dia: "Dia 1, 9h", status: "Planejada", depende: "Emitir e pagar" },
  { area: "RH e Sistemas de Pessoal", funcao: "Comprovantes de seguro de vida", agentes: ["sofia-adm-rh-frota", "clara-assistente"], consegue: "Adianta", dia: "Dia 1, 9h", status: "Planejada", depende: "Enviar o comprovante" },
  { area: "RH e Sistemas de Pessoal", funcao: "Tarefas do financeiro no Conta Azul", agentes: ["bruno-financeiro"], consegue: "Entrega", dia: "Dia 6, 8h", status: "Ativa", depende: "Só ler" },
  { area: "RH e Sistemas de Pessoal", funcao: "Cancelamento de benefícios (CAJU, Ticket Log, estacionamento)", agentes: ["sofia-adm-rh-frota"], consegue: "Adianta", dia: "Seg, 10h", status: "Planejada", depende: "Cancelar nas plataformas" },
  { area: "RH e Sistemas de Pessoal", funcao: "Cadastro de obra nova", agentes: ["otavio-pavimax", "paulo-rh", "lucia-financeiro"], consegue: "Adianta", dia: "Sob demanda", status: "Sob demanda", depende: "Aprovar. Documentos da obra" },
  { area: "RH e Sistemas de Pessoal", funcao: "Responsável pelo sistema RH", agentes: ["paulo-rh"], consegue: "Entrega", dia: "Triagem 7h30 e 13h30", status: "Ativa", depende: "Aprovar mudanças" },
  { area: "Gestão de Contratos", funcao: "Elaboração e revisão de contratos de locação", agentes: ["marina-custos"], consegue: "Adianta", dia: "Sob demanda", status: "Sob demanda", depende: "Revisar e assinar" },
  { area: "Gestão de Contratos", funcao: "Conferência de contratos de fornecedores", agentes: ["marina-custos"], consegue: "Entrega", dia: "Seg, 9h", status: "Ativa", depende: "Só ler" },
  { area: "Gestão de Contratos", funcao: "Liberação e faturamento de contratos", agentes: ["marina-custos"], consegue: "Entrega", dia: "Seg, 9h", status: "Ativa", depende: "Só ler" },
  { area: "Gestão de Contratos", funcao: "Contratos de máquinas", agentes: ["marina-custos"], consegue: "Entrega", dia: "Seg, 9h", status: "Ativa", depende: "Só ler" },
  { area: "Gestão de Contratos", funcao: "Contratos para o fechamento (contabilidade)", agentes: ["bruno-financeiro", "clara-assistente"], consegue: "Adianta", dia: "Dia 28, 9h", status: "Planejada", depende: "Enviar" },
  { area: "Gestão de Contratos", funcao: "Vencimentos e renovações", agentes: ["marina-custos"], consegue: "Entrega", dia: "Seg, 9h", status: "Ativa", depende: "Decidir renovar" },
  { area: "Gestão de Contratos", funcao: "Negociação com fornecedores estratégicos", agentes: ["caio-suprimentos", "marina-custos"], consegue: "Você", dia: "Sob demanda", status: "Sob demanda", depende: "Negociar" },
  { area: "Gestão de Contratos", funcao: "Fiscalização do cumprimento por obra", agentes: ["marina-custos"], consegue: "Entrega", dia: "Seg, 9h", status: "Ativa", depende: "Só ler" },
  { area: "Sistemas e TI", funcao: "Conta Azul, PaviMax, RH e Financeiro (manutenção)", agentes: ["ricardo-diretor-sistemas", "otavio-pavimax", "lucia-financeiro", "paulo-rh"], consegue: null, dia: "Triagem seg a sáb, 7h30 e 13h30", status: "Ativa", depende: "" },
  { area: "Sistemas e TI", funcao: "monday.com (cronograma, solicitações)", agentes: ["helena"], consegue: null, dia: "Sob demanda (conector disponível)", status: "Sob demanda", depende: "" },
  { area: "Sistemas e TI", funcao: "Google Ads (vagas)", agentes: ["clara-assistente"], consegue: null, dia: "Sob demanda (rascunho do anúncio)", status: "Sob demanda", depende: "" },
  { area: "Sistemas e TI", funcao: "Matriz RACI", agentes: ["helena"], consegue: null, dia: "Gerada a partir deste arquivo", status: "Sob demanda", depende: "" },
  { area: "Sistemas e TI", funcao: "Mapeamento de fornecedores essenciais", agentes: ["caio-suprimentos"], consegue: null, dia: "Qua, 10h", status: "Ativa", depende: "" },
  { area: "Sistemas e TI", funcao: "TI geral", agentes: ["ricardo-diretor-sistemas"], consegue: null, dia: "Triagem", status: "Ativa", depende: "" },
];

export function funcoesDo(agente: string): Funcao[] {
  return FUNCOES.filter((f) => f.agentes.includes(agente));
}
