// Reuniões entre os agentes: tipos e funções puras, usadas no servidor (páginas) e no navegador (escritório 3D).

export type EstadoReuniao = "agendada" | "em_andamento" | "encerrada" | "cancelada";
export type ItemPauta = { texto: string } | string;
export type EstadoDecisao = "pendente" | "aprovada" | "recusada" | "feita";
export type DecisaoReuniao = {
  texto: string;
  responsavel?: string | null;
  aprovacao?: "diretor" | "rafael" | null;
  aprovador?: string | null;
  estado?: EstadoDecisao;
};

export type Reuniao = {
  id: number;
  titulo: string;
  convocada_por: string;
  participantes: string[];
  pauta: ItemPauta[];
  agendada_para: string | null;
  estado: EstadoReuniao;
  iniciada_em: string | null;
  encerrada_em: string | null;
  ata: string | null;
  decisoes: DecisaoReuniao[];
  demanda_id: number | null;
  documento_id: string | null;
  criado_em: string;
  atualizado_em: string;
};

// O que o escritório precisa (sem ata nem decisões, para o polling ficar leve).
export type ReuniaoResumo = Pick<
  Reuniao,
  "id" | "titulo" | "convocada_por" | "participantes" | "pauta" | "agendada_para" | "estado" | "iniciada_em" | "encerrada_em"
>;
export const CAMPOS_RESUMO = "id, titulo, convocada_por, participantes, pauta, agendada_para, estado, iniciada_em, encerrada_em";

export const ESTADO_REUNIAO: Record<EstadoReuniao, { rotulo: string; classe: string }> = {
  agendada: { rotulo: "Agendada", classe: "bg-accent-soft text-accent" },
  em_andamento: { rotulo: "Em andamento", classe: "bg-ok-soft text-ok" },
  encerrada: { rotulo: "Encerrada", classe: "bg-bg text-muted" },
  cancelada: { rotulo: "Cancelada", classe: "bg-bad-soft text-bad" },
};

export const ESTADO_DECISAO: Record<EstadoDecisao, { rotulo: string; classe: string }> = {
  pendente: { rotulo: "Pendente", classe: "bg-warn-soft text-warn" },
  aprovada: { rotulo: "Aprovada", classe: "bg-ok-soft text-ok" },
  recusada: { rotulo: "Recusada", classe: "bg-bad-soft text-bad" },
  feita: { rotulo: "Feita", classe: "bg-accent-soft text-accent" },
};

export function textoItem(i: ItemPauta): string {
  return typeof i === "string" ? i : i?.texto ?? "";
}

export function itensPauta(r: Pick<Reuniao, "pauta">): string[] {
  return (Array.isArray(r.pauta) ? r.pauta : []).map(textoItem).filter(Boolean);
}

export function decisoesDe(r: Pick<Reuniao, "decisoes">): DecisaoReuniao[] {
  return (Array.isArray(r.decisoes) ? r.decisoes : []).filter((d) => d && d.texto);
}

// Quem vai à reunião: quem convocou e os participantes, sem repetir.
export function presentes(r: Pick<Reuniao, "convocada_por" | "participantes">): string[] {
  return [...new Set([r.convocada_por, ...(r.participantes ?? [])].filter(Boolean))];
}

// Hora de referência: quando começou (em andamento ou encerrada) ou quando está marcada.
export function horaReferencia(r: Pick<Reuniao, "estado" | "iniciada_em" | "agendada_para" | "encerrada_em">): string | null {
  if (r.estado === "agendada") return r.agendada_para;
  return r.iniciada_em ?? r.agendada_para ?? r.encerrada_em;
}

// Próxima reunião agendada que ainda vale mostrar (marcada para daqui a pouco ou atrasada há menos de 12 h).
export function proximaAgendada<T extends Pick<Reuniao, "estado" | "agendada_para">>(lista: T[], agora = Date.now()): T | null {
  const limite = agora - 12 * 3600 * 1000;
  return (
    lista
      .filter((r) => r.estado === "agendada" && r.agendada_para && new Date(r.agendada_para).getTime() >= limite)
      .sort((a, b) => a.agendada_para!.localeCompare(b.agendada_para!))[0] ?? null
  );
}

// Início e fim do dia de hoje no horário de Brasília, em ISO (para filtrar no banco).
export function hojeEmBrasilia(agora = new Date()) {
  const dia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora); // AAAA-MM-DD
  const inicio = new Date(`${dia}T00:00:00-03:00`);
  return { inicio: inicio.toISOString(), fim: new Date(inicio.getTime() + 24 * 3600 * 1000).toISOString() };
}

// Evento gravado pela central_reuniao_salvar: rotina "reuniao#<id>", resumo "<estado> · <título>".
const RE_ROTINA = /^reuniao#(\d+)$/;
const RE_ESTADO = /^(agendada|em_andamento|encerrada|cancelada)\b/;
export function eventoDeReuniao(ev: { rotina: string; resumo: string }): { id: number; estado: EstadoReuniao } | null {
  const m = RE_ROTINA.exec(ev.rotina);
  const e = RE_ESTADO.exec(ev.resumo ?? "");
  if (!m || !e) return null;
  return { id: Number(m[1]), estado: e[1] as EstadoReuniao };
}
