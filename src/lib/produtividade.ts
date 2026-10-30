// Produtividade dos agentes num dia: horas trabalhadas (eventos inicio/fim/passo de central_eventos), entregas,
// horas do Rafael economizadas (pela régua abaixo, que é ESTIMATIVA) e o tempo que o Rafael gastou decidindo as
// demandas de cada agente (central_demanda_historico). Funções puras: servem no servidor e no navegador.

// ---------- régua de horas economizadas ----------
// Quanto tempo o Rafael levaria para fazer sozinho cada tipo de tarefa que um agente conclui. É uma estimativa:
// ajuste os números aqui (ou, com a migration proposta, na tabela central_regua_horas).
export type TipoTarefa = {
  id: string;
  nome: string;
  horas: number; // horas do Rafael por rotina concluída
  exemplo: string;
  padroes: RegExp[]; // testados no nome da rotina
};

export const REGUA: TipoTarefa[] = [
  {
    id: "mes", nome: "Relatório ou análise do mês", horas: 2,
    exemplo: "resultado por obra, conferência do mês, prévia de medição, custos por obra",
    padroes: [/^resultado-obras/, /^conferencia-\d+$/, /^previa-medicao/, /^acompanhamento-custos/, /^projecoes/, /^rateio/],
  },
  {
    id: "semana", nome: "Conferência ou análise da semana", horas: 1,
    exemplo: "produção × receita, contratos vencendo, CA × ERP, medições e recebimentos",
    padroes: [/^producao-receita/, /^contratos/, /^conferencia-ca-erp/, /^medicoes/, /^acompanhamento-socios/, /^conversao/,
      /^condutores/, /^multas/, /^reuniao-/],
  },
  {
    id: "dia", nome: "Conferência do dia", horas: 0.5,
    exemplo: "monitor de faturas, vigia do caixa, RDO, KM e revisões, pedidos parados",
    padroes: [/^monitor-/, /^vigia-/, /^conferencia-rdo/, /^km-/, /^pedidos-/, /^financeiro-do-dia/, /^fluxo-/],
  },
  {
    id: "execucao", nome: "Execução no sistema ou demanda resolvida", horas: 1,
    exemplo: "lançar e ajustar no ERP, resolver uma demanda, reembolso, compras, passagens",
    padroes: [/^demanda/, /^execucao-/, /-aplicar$/, /^mesa-/, /^reembolso/, /^compras/, /^passagens/, /^alojamento/,
      /^beliches/, /^logistica/],
  },
  {
    id: "agenda", nome: "Agenda, e-mail e registro", horas: 0.25,
    exemplo: "agenda do dia, rascunho de e-mail, pauta, lembretes, registro no Monday",
    padroes: [/^agenda/, /^rascunho/, /^pauta/, /^lembretes/, /^monday/, /^registro/, /^anotacoes/],
  },
  {
    id: "triagem", nome: "Plantão e triagem", horas: 0.25,
    exemplo: "plantão da Helena, triagem dos sistemas 7h30 e 13h30",
    padroes: [/^plantao/, /^triagem/],
  },
  {
    id: "reuniao", nome: "Reunião entre agentes", horas: 0,
    exemplo: "conta nas horas trabalhadas; o ganho aparece nas entregas que saem dela",
    padroes: [/^reuniao#/],
  },
  {
    id: "interno", nome: "Aprendizado e ajustes internos", horas: 0,
    exemplo: "melhoria do próprio agente, sem entrega para o Rafael",
    padroes: [/^aprendizado/, /^autonomia/, /^comunicacao/, /^gestoria/],
  },
];
export const OUTRA_TAREFA: TipoTarefa = {
  id: "outra", nome: "Outra tarefa", horas: 0.5, exemplo: "rotina que ainda não está na régua", padroes: [],
};

export function tipoDaRotina(rotina: string): TipoTarefa {
  return REGUA.find((t) => t.padroes.some((p) => p.test(rotina))) ?? OUTRA_TAREFA;
}

// Tempo do Rafael por decisão na Mesa. Medido quando ele decide vários cartões seguidos (o intervalo entre uma
// decisão e a anterior, até 10 min); na primeira de uma sequência, usa estes valores (estimativa).
export const MINUTOS_DECISAO: Record<string, number> = { aprovada: 2, recusada: 3, ajuste: 5 };
const SEQUENCIA_MAX_MS = 10 * 60 * 1000;

// ---------- cálculo ----------
export type EventoProd = {
  id: number;
  ts: string;
  tipo: string;
  agente: string;
  rotina: string;
  resumo: string | null;
  status: string | null;
  documento_id: string | null;
};
export type DecisaoRafael = { ts: string; demanda_id: number; acao: string; de: string; titulo: string };

export type Entrega = {
  ts: string;
  rotina: string;
  resumo: string;
  status: string;
  documento_id: string | null;
  tipo: TipoTarefa;
  horas: number;
};
export type Aprovacao = { ts: string; demanda_id: number; titulo: string; decisao: string; minutos: number; medido: boolean };

export type ProdAgente = {
  agente: string;
  minutosTrabalhados: number;
  trabalhandoAgora: boolean;
  entregas: Entrega[];
  reunioes: number;
  horasEconomizadas: number;
  aprovacoes: Aprovacao[];
  minutosAprovacao: number;
  saldoHoras: number; // economizadas − aprovação
  veredito: "tira" | "neutro" | "gera" | "parado";
};

export type ProdDia = {
  agentes: ProdAgente[];
  total: { minutosTrabalhados: number; entregas: number; horasEconomizadas: number; minutosAprovacao: number; saldoHoras: number };
};

const ABERTA_MAX_MS = 2 * 3600 * 1000; // como no painel.py: aberta há mais de 2 h sem fim = travada

// Junta inicio → fim do mesmo agente e rotina (como execucoes() no painel.py). Rotina sem fim termina no último
// passo dela ou, se ainda está aberta há menos de 2 h, agora.
function intervalos(eventos: EventoProd[], agora: number): Map<string, { ini: number; fim: number; aberta: boolean }[]> {
  const abertas = new Map<string, { agente: string; ini: number; ultimo: number }>();
  const out = new Map<string, { ini: number; fim: number; aberta: boolean }[]>();
  const add = (agente: string, ini: number, fim: number, aberta: boolean) => {
    if (fim <= ini) return;
    out.set(agente, [...(out.get(agente) ?? []), { ini, fim, aberta }]);
  };
  for (const e of eventos) {
    const chave = `${e.agente}\u0000${e.rotina}`;
    const t = new Date(e.ts).getTime();
    if (e.tipo === "inicio") {
      const antes = abertas.get(chave);
      if (antes) add(antes.agente, antes.ini, antes.ultimo, false); // começou de novo sem fechar
      abertas.set(chave, { agente: e.agente, ini: t, ultimo: t });
    } else if (e.tipo === "passo" || e.tipo === "nota") {
      const a = abertas.get(chave);
      if (a) a.ultimo = t;
    } else if (e.tipo === "fim") {
      const a = abertas.get(chave);
      if (a) {
        add(a.agente, a.ini, t, false);
        abertas.delete(chave);
      }
    }
  }
  for (const a of abertas.values()) {
    const viva = agora - a.ini <= ABERTA_MAX_MS;
    add(a.agente, a.ini, viva ? agora : a.ultimo, viva);
  }
  return out;
}

// Soma sem contar duas vezes o tempo de rotinas que rodaram ao mesmo tempo.
function minutosUnidos(lista: { ini: number; fim: number }[]): number {
  const ord = [...lista].sort((a, b) => a.ini - b.ini);
  let total = 0;
  let ini = -1;
  let fim = -1;
  for (const x of ord) {
    if (x.ini > fim) {
      if (fim > ini) total += fim - ini;
      ini = x.ini;
      fim = x.fim;
    } else fim = Math.max(fim, x.fim);
  }
  if (fim > ini) total += fim - ini;
  return total / 60000;
}

function tempoDasDecisoes(decisoes: DecisaoRafael[]): Aprovacao[] {
  const ord = [...decisoes].sort((a, b) => a.ts.localeCompare(b.ts));
  return ord.map((d, i) => {
    const decisao = d.acao.replace(/^decisão:\s*/, "");
    const gap = i > 0 ? new Date(d.ts).getTime() - new Date(ord[i - 1].ts).getTime() : Infinity;
    const medido = gap <= SEQUENCIA_MAX_MS;
    return {
      ts: d.ts, demanda_id: d.demanda_id, titulo: d.titulo, decisao,
      minutos: medido ? gap / 60000 : MINUTOS_DECISAO[decisao] ?? 3,
      medido,
    };
  });
}

export function calcularDia(eventos: EventoProd[], decisoes: DecisaoRafael[], agora = Date.now()): ProdDia {
  const ids = new Set<string>();
  for (const e of eventos) if (e.agente !== "rafael") ids.add(e.agente);
  for (const d of decisoes) if (d.de !== "rafael") ids.add(d.de);

  const tempos = intervalos(eventos.filter((e) => e.agente !== "rafael"), agora);
  const aprov = tempoDasDecisoes(decisoes);
  const decisaoDe = new Map(decisoes.map((d) => [`${d.ts}#${d.demanda_id}`, d.de]));

  const agentes: ProdAgente[] = [...ids].map((agente) => {
    const fins = eventos.filter((e) => e.agente === agente && e.tipo === "fim");
    const entregas: Entrega[] = [];
    let reunioes = 0;
    for (const e of fins) {
      const tipo = tipoDaRotina(e.rotina);
      if (tipo.id === "reuniao") { reunioes += 1; continue; }
      if (tipo.id === "interno") continue;
      const status = e.status ?? "ok";
      entregas.push({
        ts: e.ts, rotina: e.rotina, resumo: e.resumo ?? "", status, documento_id: e.documento_id, tipo,
        horas: status === "erro" ? 0 : tipo.horas,
      });
    }
    const aprovacoes = aprov.filter((a) => decisaoDe.get(`${a.ts}#${a.demanda_id}`) === agente);
    const lista = tempos.get(agente) ?? [];
    const minutosTrabalhados = minutosUnidos(lista);
    const horasEconomizadas = entregas.reduce((s, x) => s + x.horas, 0);
    const minutosAprovacao = aprovacoes.reduce((s, x) => s + x.minutos, 0);
    const saldoHoras = horasEconomizadas - minutosAprovacao / 60;
    const veredito: ProdAgente["veredito"] =
      entregas.length === 0 && minutosTrabalhados < 1 && aprovacoes.length === 0 ? "parado"
        : horasEconomizadas === 0 && minutosAprovacao > 0 ? "gera"
          : saldoHoras > 0 && horasEconomizadas >= 2 * (minutosAprovacao / 60) ? "tira"
            : saldoHoras < 0 ? "gera" : "neutro";
    return {
      agente, minutosTrabalhados, trabalhandoAgora: lista.some((x) => x.aberta), entregas: entregas.reverse(), reunioes,
      horasEconomizadas, aprovacoes: aprovacoes.reverse(), minutosAprovacao, saldoHoras, veredito,
    };
  });
  agentes.sort((a, b) => b.saldoHoras - a.saldoHoras || b.minutosTrabalhados - a.minutosTrabalhados);

  const soma = (f: (a: ProdAgente) => number) => agentes.reduce((s, a) => s + f(a), 0);
  return {
    agentes,
    total: {
      minutosTrabalhados: soma((a) => a.minutosTrabalhados),
      entregas: soma((a) => a.entregas.length),
      horasEconomizadas: soma((a) => a.horasEconomizadas),
      minutosAprovacao: soma((a) => a.minutosAprovacao),
      saldoHoras: soma((a) => a.saldoHoras),
    },
  };
}

// ---------- dia e formatação ----------
// Dia em Brasília (UTC−3, sem horário de verão desde 2019) no formato AAAA-MM-DD.
const DIA = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
export const diaDe = (d = new Date()) => DIA.format(d);
export function limitesDoDia(dia: string): { ini: string; fim: string } {
  const ini = new Date(`${dia}T00:00:00-03:00`);
  return { ini: ini.toISOString(), fim: new Date(ini.getTime() + 24 * 3600 * 1000).toISOString() };
}
export function somarDias(dia: string, n: number): string {
  return diaDe(new Date(new Date(`${dia}T12:00:00-03:00`).getTime() + n * 24 * 3600 * 1000));
}
const NOME_DIA = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short", day: "2-digit", month: "2-digit" });
export function nomeDoDia(dia: string): string {
  const hoje = diaDe();
  if (dia === hoje) return "hoje";
  if (dia === somarDias(hoje, -1)) return "ontem";
  return NOME_DIA.format(new Date(`${dia}T12:00:00-03:00`)).replace(".", "");
}

// 95 → "1h35"; 40 → "40 min"
export function fmtMin(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;
}
// 1.5 → "1,5 h"; com sinal: "+1,5 h" / "−0,3 h"
export function fmtHoras(h: number, sinal = false): string {
  const v = Math.round(h * 10) / 10;
  const txt = `${Math.abs(v).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`;
  if (!sinal) return v < 0 ? `−${txt}` : txt;
  return v > 0 ? `+${txt}` : v < 0 ? `−${txt}` : txt;
}
