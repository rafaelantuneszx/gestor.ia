import { ESTADO_AGUARDANDO_GESTOR } from "@/lib/banco";
// Indicadores do escritório: só contagens reais do banco, sem estimativa. Cada número diz de onde vem na tela de Resultados.
// Funções puras: servem na tela, no painel de LED e nos testes.

export type DemandaInd = { estado: string; decidida_em: string | null; atualizada: string | null };
export type RotinaInd = { agente: string; rotina: string; status: string | null };

export type Fracao = { feitos: number; total: number; pct: number | null };

export type Indicadores = {
  atualizadasHoje: number;
  entregues: number;
  entreguesHoje: number;
  feitas: number;
  aFazer: number;
  aguardandoVoce: number;
  rotinasCriadas: number;
  rotinasConcluidas: number;
  eventos24h: number;
  sincronizacoes: Fracao | null; // null: sem acesso ou sem dado
  ultimaSincronizacao: string | null;
  agentesSemVoce: Fracao; // demandas feitas que não precisaram de decisão do gestor
  rotinasSemErro: Fracao; // rotinas terminadas sem erro
  porAgente: Record<string, { concluidas: number; comErro: number }>;
};

export const fracao = (feitos: number, total: number): Fracao => ({
  feitos, total, pct: total > 0 ? Math.round((feitos / total) * 100) : null,
});

// Início do dia de hoje em Brasília, em ISO (fuso fixo -03:00, sem horário de verão).
export function inicioDoDia(agora = new Date()) {
  const dia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora);
  return `${dia}T00:00:00-03:00`;
}

const ROTINA_INTERNA = /^(reuniao#|demanda\b)/;

export function calcularIndicadores({
  demandas, rotinas, documentosTotal, documentosHoje, eventos24h, sincronizacoes, ultimaSincronizacao, agora = new Date(),
}: {
  demandas: DemandaInd[];
  rotinas: RotinaInd[];
  documentosTotal: number;
  documentosHoje: number;
  eventos24h: number;
  sincronizacoes: { ok: number; total: number } | null;
  ultimaSincronizacao: string | null;
  agora?: Date;
}): Indicadores {
  const hoje = new Date(inicioDoDia(agora)).getTime();
  const feitas = demandas.filter((d) => d.estado === "feita");
  const validas = rotinas.filter((r) => !ROTINA_INTERNA.test(r.rotina));
  const comErro = validas.filter((r) => r.status === "erro").length;
  const porAgente: Indicadores["porAgente"] = {};
  for (const r of validas) {
    const a = (porAgente[r.agente] ??= { concluidas: 0, comErro: 0 });
    a.concluidas += 1;
    if (r.status === "erro") a.comErro += 1;
  }
  return {
    atualizadasHoje: demandas.filter((d) => d.atualizada && new Date(d.atualizada).getTime() >= hoje).length,
    entregues: documentosTotal,
    entreguesHoje: documentosHoje,
    feitas: feitas.length,
    aFazer: demandas.filter((d) => ["aberta", "andamento", ESTADO_AGUARDANDO_GESTOR].includes(d.estado)).length,
    aguardandoVoce: demandas.filter((d) => d.estado === ESTADO_AGUARDANDO_GESTOR).length,
    rotinasCriadas: new Set(validas.map((r) => r.rotina)).size,
    rotinasConcluidas: validas.length,
    eventos24h,
    sincronizacoes: sincronizacoes ? fracao(sincronizacoes.ok, sincronizacoes.total) : null,
    ultimaSincronizacao,
    agentesSemVoce: fracao(feitas.filter((d) => !d.decidida_em).length, feitas.length),
    rotinasSemErro: fracao(validas.length - comErro, validas.length),
    porAgente,
  };
}

export const INDICADORES_VAZIOS: Indicadores = calcularIndicadores({
  demandas: [], rotinas: [], documentosTotal: 0, documentosHoje: 0, eventos24h: 0, sincronizacoes: null, ultimaSincronizacao: null,
});
