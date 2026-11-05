// Mapa da infra: de onde vem a energia do Gestor.IA, onde fica a memória e o que depende de quê.
// O texto descreve como o sistema está montado (conferido em 03/11/2026). O status ao vivo vem de medidores.ts.
// Peça sem medidor aparece como "descrita": o site não consegue enxergar o notebook por dentro.

export type CamadaId = "voce" | "agentes" | "memoria" | "sistemas" | "energia";

export const CAMADAS: { id: CamadaId; nome: string; apoio: string }[] = [
  { id: "voce", nome: "Você", apoio: "Onde tudo chega" },
  { id: "agentes", nome: "Agentes e habilidades", apoio: "Quem faz o trabalho" },
  { id: "memoria", nome: "Memória", apoio: "O que fica guardado" },
  { id: "sistemas", nome: "Sistemas e entradas", apoio: "De onde vêm os dados" },
  { id: "energia", nome: "Energia", apoio: "O que mantém tudo ligado" },
];

export type Peca = {
  id: string;
  camada: CamadaId;
  nome: string;
  oQueE: string;
  comoFunciona: string;
  comoOperar: string;
  seParar: string;
};

export const PECAS: Peca[] = [
  // ---------- você ----------
  {
    id: "gestor", camada: "voce", nome: "Você",
    oQueE: "Quem decide. Os agentes preparam; você aprova, pede ajuste ou recusa.",
    comoFunciona: "Sua decisão em Hoje volta para o agente que pediu, que continua na próxima rodada.",
    comoOperar: "Entre em Hoje e decida o que está esperando você. Também dá para falar com a equipe no Escritório.",
    seParar: "O escritório segue trabalhando, mas o que depende da sua decisão fica esperando.",
  },
  {
    id: "painel", camada: "voce", nome: "Gestor.IA",
    oQueE: "Este site: Hoje, Empresas, Escritório, Funções e Arquivo.",
    comoFunciona: "Roda na Vercel, então fica no ar mesmo com o notebook desligado. Ele mostra o que está no banco.",
    comoOperar: "Mudanças entram pelo GitHub e são publicadas pela Vercel. Dá para voltar a uma versão anterior no painel da Vercel.",
    seParar: "Você deixa de ver e decidir. Os agentes continuam gravando no banco.",
  },
  {
    id: "conversa", camada: "voce", nome: "Conversa com a equipe",
    oQueE: "A tela de falar com os agentes por voz ou texto, e as reuniões ao vivo.",
    comoFunciona: "Sua fala vai para o site, que pede a resposta ao Claude usando as demandas, atas e relatórios do banco. A voz real vem da ElevenLabs; sem ela, o navegador fala.",
    comoOperar: "Escritório › Falar com a equipe. Depende das chaves cadastradas na Vercel.",
    seParar: "Sua fala fica registrada, mas os agentes não respondem na hora.",
  },
  // ---------- agentes ----------
  {
    id: "plantao", camada: "agentes", nome: "Plantão da Helena",
    oQueE: "A rotina que coordena o escritório, de hora em hora, todos os dias.",
    comoFunciona: "Distribui a fila de demandas, confere a integração e as rotinas, atualiza os cartões de e-mail e registra tudo no painel.",
    comoOperar: "Fica na seção de rotinas agendadas do app do Claude: dá para pausar, mudar o horário ou rodar agora.",
    seParar: "A fila não é distribuída e os cartões de e-mail param de atualizar.",
  },
  {
    id: "rotinas", camada: "agentes", nome: "Rotinas agendadas",
    oQueE: "As tarefas com hora marcada: 4 ligadas de 30 prontas (plantão, agenda e e-mails, RDO e faturas).",
    comoFunciona: "O app do Claude dispara cada uma no horário. Elas rodam sem pedir confirmação a cada passo, e o que parece arriscado é bloqueado.",
    comoOperar: "App do Claude › rotinas agendadas. Só rodam com o app aberto; as atrasadas rodam quando ele abre.",
    seParar: "O trabalho automático para. Os agentes só agem quando alguém pede.",
  },
  {
    id: "equipe", camada: "agentes", nome: "Agentes",
    oQueE: "A equipe por setor: direção, financeiro, custos, frota e RH, suprimentos e sistemas.",
    comoFunciona: "Cada agente tem um cargo, instruções próprias e um modelo de IA escolhido pelo tipo de tarefa. Registra o que faz e cria demandas entre si.",
    comoOperar: "As instruções ficam na pasta da central, no notebook. Três agentes (Tiago, Vítor e Júlio) ainda não estão cadastrados no Gestor.IA.",
    seParar: "Nada novo é produzido. O que já foi entregue continua no Arquivo.",
  },
  {
    id: "habilidades", camada: "agentes", nome: "Habilidades",
    oQueE: "O que os agentes sabem fazer: 57 habilidades na central e 167 instaladas no notebook.",
    comoFunciona: "Cada habilidade é um manual de passos que o agente segue na tarefa, como conferir RDO ou montar o resultado da obra.",
    comoOperar: "São arquivos no notebook. Para ensinar algo novo, cria-se uma habilidade e aponta-se o agente para ela.",
    seParar: "O agente perde o passo a passo e tende a errar ou a não conseguir fazer a tarefa.",
  },
  {
    id: "regras", camada: "agentes", nome: "Regras e proteções",
    oQueE: "Os disjuntores: o que os agentes podem e não podem fazer sozinhos.",
    comoFunciona: "Rotina só lê por padrão. Escrever no banco, pagar ou enviar para fora exige o seu ok. O token identifica os agentes, e o banco só libera leitura para quem tem acesso.",
    comoOperar: "As regras ficam nas instruções da central e em cada rotina. Decisões que você repete podem virar regra fixa.",
    seParar: "É o que evita um erro virar pagamento ou mensagem indevida. Não deve ser desligado.",
  },
  // ---------- memória ----------
  {
    id: "banco", camada: "memoria", nome: "Banco da central",
    oQueE: "A memória compartilhada: demandas, eventos, reuniões, decisões e os e-mails dos últimos 30 dias.",
    comoFunciona: "Os agentes gravam por funções protegidas por token. O site lê com o seu login, e só quem está liberado vê.",
    comoOperar: "Fica no Supabase, no mesmo projeto do PaviMax. Mudança de estrutura só com aprovação.",
    seParar: "Sem banco, o site fica sem dados e os agentes não conseguem registrar nada.",
  },
  {
    id: "arquivo", camada: "memoria", nome: "Arquivo de relatórios",
    oQueE: "Tudo o que os agentes entregam: relatórios, rascunhos e PDFs, por setor.",
    comoFunciona: "Ao terminar uma rotina, o agente publica o relatório. Uma cópia fica no notebook.",
    comoOperar: "Abra a seção Arquivo. Os agentes usam os mais recentes como contexto nas conversas.",
    seParar: "Você perde o acesso às entregas pelo site, e as conversas ficam com menos contexto.",
  },
  {
    id: "conhecimento", camada: "memoria", nome: "Conhecimento dos agentes",
    oQueE: "A experiência acumulada: o diário de cada agente, os mapas dos sistemas e as decisões registradas.",
    comoFunciona: "Antes da tarefa, o agente lê o que já aprendeu. Ao terminar, acrescenta o que descobriu.",
    comoOperar: "São arquivos no notebook. Estes arquivos não vão para o banco.",
    seParar: "Os agentes voltam a errar o que já tinham aprendido.",
  },
  {
    id: "indice", camada: "memoria", nome: "Índice de e-mails",
    oQueE: "Uma cópia para consulta das 3 caixas, guardada só no notebook: 4.724 mensagens em 03/11/2026.",
    comoFunciona: "Lê as caixas sem marcar como lido, mover ou apagar. Para a caixa de e-mail do site vão o texto, os endereços e os nomes dos anexos. Os arquivos anexos não saem do servidor de e-mail.",
    comoOperar: "Atualizado a cada hora pelo plantão. O texto publicado fica no banco por 30 dias, com autorização sua de 04/11/2026.",
    seParar: "Os agentes deixam de ver e-mails novos e os cartões ficam parados.",
  },
  {
    id: "backup", camada: "memoria", nome: "Backup no GitHub",
    oQueE: "A cópia de segurança dos agentes, feita em 02/11/2026, antes da mudança para este notebook.",
    comoFunciona: "Foi com ela que os agentes voltaram a rodar. Não tem senhas nem chaves. Hoje não atualiza sozinha.",
    comoOperar: "Falta criar um backup automático: as adaptações, a memória e os relatórios feitos depois de 02/11 só existem no notebook.",
    seParar: "Nada para na hora. Mas, se o notebook se perder, o que veio depois de 02/11 se perde junto.",
  },
  // ---------- sistemas ----------
  {
    id: "pavimax", camada: "sistemas", nome: "PaviMax ERP",
    oQueE: "Obras, medições, faturamento, compras, fiscal, estoque e frota.",
    comoFunciona: "Os agentes consultam o banco dele. Três vezes ao dia, ele busca os dados do FPAV Financeiro.",
    comoOperar: "O Otávio cuida dele. Roda na Vercel, com banco no Supabase.",
    seParar: "As rotinas de obra, RDO e medição ficam sem dados.",
  },
  {
    id: "financeiro", camada: "sistemas", nome: "FPAV Financeiro",
    oQueE: "Caixa, extrato, resultado por obra, rateio e aportes.",
    comoFunciona: "Tem banco próprio no Supabase. Entrega dados ao PaviMax por uma integração automática e confere com o Conta Azul.",
    comoOperar: "A Lúcia cuida dele. Roda na Vercel.",
    seParar: "As rotinas de faturas e caixa ficam sem dados, e o PaviMax para de receber atualizações.",
  },
  {
    id: "rh", camada: "sistemas", nome: "FPAV RH",
    oQueE: "Folha, intermitentes, PJ, ponto e custo de mão de obra.",
    comoFunciona: "Usa o mesmo banco do PaviMax, nas tabelas de RH.",
    comoOperar: "O Paulo cuida dele. Roda na Vercel.",
    seParar: "As rotinas de folha e RH ficam sem dados.",
  },
  {
    id: "emails", camada: "sistemas", nome: "Caixas de e-mail",
    oQueE: "As 3 caixas que os agentes leem, todas na Hostinger.",
    comoFunciona: "A leitura é feita do notebook. A senha fica no cofre do Windows e nunca aparece.",
    comoOperar: "Enviar, responder, mover ou apagar continua só com você, salvo o que você autorizar.",
    seParar: "Os agentes deixam de ver o que chega por e-mail.",
  },
  {
    id: "contaazul", camada: "sistemas", nome: "Conta Azul",
    oQueE: "O sistema contábil usado na conferência do financeiro.",
    comoFunciona: "O FPAV Financeiro importa e confere os lançamentos, e a rotina de conferência compara os valores com os sistemas.",
    comoOperar: "A importação é feita pela tela de configuração do FPAV Financeiro.",
    seParar: "A conferência fica desatualizada. O resto do financeiro continua.",
  },
  {
    id: "conectores", camada: "sistemas", nome: "Drive, Agenda e Monday",
    oQueE: "As ferramentas do dia a dia que os agentes alcançam pelo app do Claude.",
    comoFunciona: "Drive para planilhas e documentos, Agenda para os compromissos e Monday para falar com a equipe humana.",
    comoOperar: "Os conectores ficam nas configurações do app do Claude. O Drive também precisa estar sincronizado no notebook.",
    seParar: "A rotina que depende daquela ferramenta fica incompleta.",
  },
  // ---------- energia ----------
  {
    id: "notebook", camada: "energia", nome: "Notebook dos agentes",
    oQueE: "A tomada principal: é aqui que os agentes rodam. Este é o maior ponto único de falha do sistema.",
    comoFunciona: "O plantão registra um sinal a cada hora. Sem sinal por mais de 2 horas, a máquina provavelmente está desligada, dormindo ou sem internet.",
    comoOperar: "Deixe ligado na tomada, com internet e sem dormir. Para funcionar de verdade o tempo todo, seria preciso um computador sempre ligado ou um servidor.",
    seParar: "Todos os agentes e rotinas param. O site continua no ar, mas sem novidades.",
  },
  {
    id: "app", camada: "energia", nome: "App do Claude",
    oQueE: "O programa que acorda os agentes e os liga às ferramentas.",
    comoFunciona: "Dispara as rotinas no horário e dá acesso aos conectores do banco, da Agenda e do Monday.",
    comoOperar: "Precisa ficar aberto no notebook. Fechado, as rotinas esperam até ele abrir de novo.",
    seParar: "As rotinas não disparam, mesmo com o notebook ligado.",
  },
  {
    id: "plano", camada: "energia", nome: "Plano do Claude",
    oQueE: "O combustível dos agentes: cada execução consome o uso da sua conta.",
    comoFunciona: "Tarefas de decisão e análise usam modelos maiores; conferências usam intermediários; monitoramento repetitivo usa o menor.",
    comoOperar: "Acompanhe o consumo na sua conta. O plantão de hora em hora é a rotina que mais executa.",
    seParar: "Sem uso disponível, os agentes param até o limite voltar.",
  },
  {
    id: "apis", camada: "energia", nome: "Chaves de voz e IA",
    oQueE: "A energia da conversa pelo site: API do Claude e ElevenLabs. É cobrada à parte do plano.",
    comoFunciona: "As chaves ficam guardadas na Vercel, e cada resposta ou voz gera custo próprio.",
    comoOperar: "Painel da Vercel › variáveis do projeto. Esta tela só mostra se elas existem, nunca o valor.",
    seParar: "A conversa fica sem resposta automática ou com a voz do navegador.",
  },
  {
    id: "vercel", camada: "energia", nome: "Vercel",
    oQueE: "A hospedagem do Gestor.IA, do PaviMax, do FPAV Financeiro e do FPAV RH.",
    comoFunciona: "Fica no ar 24 horas, sem depender do notebook. Publica sozinha o que entra na main do GitHub.",
    comoOperar: "Painel da Vercel. Dá para ver as versões publicadas e voltar a uma anterior.",
    seParar: "Os sites saem do ar. Os agentes do notebook ainda conseguem usar o banco.",
  },
  {
    id: "supabase", camada: "energia", nome: "Supabase",
    oQueE: "Os bancos de dados: um do PaviMax, RH e central, e outro do FPAV Financeiro.",
    comoFunciona: "Fica no ar 24 horas e controla quem lê e quem grava.",
    comoOperar: "Painel do Supabase. Mudança de estrutura só com aprovação.",
    seParar: "Sistemas, site e agentes ficam sem dados.",
  },
  {
    id: "hostinger", camada: "energia", nome: "Hostinger",
    oQueE: "O servidor dos e-mails da empresa.",
    comoFunciona: "Guarda as caixas e entrega as mensagens ao notebook.",
    comoOperar: "Painel da Hostinger. Trocar a senha de uma caixa exige guardá-la de novo no cofre do notebook.",
    seParar: "Os e-mails param de chegar para as pessoas e para os agentes.",
  },
];

export type Ligacao = { de: string; para: string; tipo: "energia" | "dados"; rotulo: string };

// "energia": sem a origem, o destino para. "dados": a origem abastece o destino, que ainda funciona sem ela.
export const LIGACOES: Ligacao[] = [
  { de: "notebook", para: "app", tipo: "energia", rotulo: "roda no notebook" },
  { de: "plano", para: "app", tipo: "energia", rotulo: "consome o plano" },
  { de: "app", para: "rotinas", tipo: "energia", rotulo: "dispara no horário" },
  { de: "app", para: "plantao", tipo: "energia", rotulo: "dispara a cada hora" },
  { de: "app", para: "equipe", tipo: "energia", rotulo: "dá vida aos agentes" },
  { de: "app", para: "conectores", tipo: "energia", rotulo: "liga as ferramentas" },
  { de: "rotinas", para: "equipe", tipo: "dados", rotulo: "passa as tarefas" },
  { de: "plantao", para: "equipe", tipo: "dados", rotulo: "distribui demandas" },
  { de: "habilidades", para: "equipe", tipo: "dados", rotulo: "ensina o passo a passo" },
  { de: "regras", para: "equipe", tipo: "dados", rotulo: "limita o que pode fazer" },
  { de: "conhecimento", para: "equipe", tipo: "dados", rotulo: "traz o que já aprendeu" },
  { de: "indice", para: "equipe", tipo: "dados", rotulo: "traz os e-mails" },
  { de: "emails", para: "indice", tipo: "dados", rotulo: "copia as mensagens" },
  { de: "hostinger", para: "emails", tipo: "energia", rotulo: "hospeda as caixas" },
  { de: "notebook", para: "indice", tipo: "energia", rotulo: "fica guardado no notebook" },
  { de: "notebook", para: "conhecimento", tipo: "energia", rotulo: "fica guardado no notebook" },
  { de: "notebook", para: "habilidades", tipo: "energia", rotulo: "fica guardado no notebook" },
  { de: "conhecimento", para: "backup", tipo: "dados", rotulo: "copiado em 02/11" },
  { de: "supabase", para: "banco", tipo: "energia", rotulo: "hospeda" },
  { de: "supabase", para: "arquivo", tipo: "energia", rotulo: "hospeda" },
  { de: "supabase", para: "pavimax", tipo: "energia", rotulo: "hospeda os dados" },
  { de: "supabase", para: "financeiro", tipo: "energia", rotulo: "hospeda os dados" },
  { de: "supabase", para: "rh", tipo: "energia", rotulo: "hospeda os dados" },
  { de: "vercel", para: "painel", tipo: "energia", rotulo: "mantém no ar" },
  { de: "vercel", para: "pavimax", tipo: "energia", rotulo: "mantém no ar" },
  { de: "vercel", para: "financeiro", tipo: "energia", rotulo: "mantém no ar" },
  { de: "vercel", para: "rh", tipo: "energia", rotulo: "mantém no ar" },
  { de: "apis", para: "conversa", tipo: "energia", rotulo: "gera respostas e voz" },
  { de: "contaazul", para: "financeiro", tipo: "dados", rotulo: "confere os lançamentos" },
  { de: "financeiro", para: "pavimax", tipo: "dados", rotulo: "sincroniza 3 vezes ao dia" },
  { de: "pavimax", para: "equipe", tipo: "dados", rotulo: "consultado pelos agentes" },
  { de: "financeiro", para: "equipe", tipo: "dados", rotulo: "consultado pelos agentes" },
  { de: "rh", para: "equipe", tipo: "dados", rotulo: "consultado pelos agentes" },
  { de: "conectores", para: "equipe", tipo: "dados", rotulo: "agenda, arquivos e recados" },
  { de: "equipe", para: "banco", tipo: "dados", rotulo: "registra e cria demandas" },
  { de: "equipe", para: "arquivo", tipo: "dados", rotulo: "entrega relatórios" },
  { de: "banco", para: "painel", tipo: "energia", rotulo: "o site mostra o banco" },
  { de: "arquivo", para: "painel", tipo: "dados", rotulo: "aparece no Arquivo" },
  { de: "indice", para: "banco", tipo: "dados", rotulo: "publica os cartões" },
  { de: "banco", para: "conversa", tipo: "dados", rotulo: "dá o contexto" },
  { de: "vercel", para: "conversa", tipo: "energia", rotulo: "roda no site" },
  { de: "painel", para: "gestor", tipo: "energia", rotulo: "mostra e recebe decisões" },
  { de: "conversa", para: "gestor", tipo: "dados", rotulo: "responde a você" },
];

// Tudo o que para se esta peça cair: segue as ligações de energia, em cascata.
export function paraSeCair(id: string): string[] {
  const vistos = new Set<string>();
  const fila = [id];
  while (fila.length) {
    const atual = fila.shift()!;
    for (const l of LIGACOES) {
      if (l.de === atual && l.tipo === "energia" && !vistos.has(l.para) && l.para !== id) {
        vistos.add(l.para);
        fila.push(l.para);
      }
    }
  }
  return [...vistos];
}
