import { supabaseServidor } from "./supabase/server";

export type Agente = { id: string; nome: string; cargo: string; grupo: string; setor: string | null };
export type Setor = { id: string; nome: string; descricao: string | null; ordem: number };
export type Documento = {
  id: string;
  setor: string;
  agente: string | null;
  rotina: string | null;
  titulo: string;
  tipo: "relatorio" | "pdf" | "rascunho" | "outro";
  conteudo_md: string | null;
  storage_path: string | null;
  data_ref: string | null;
  criado_em: string;
};
export type Demanda = {
  id: number;
  de: string;
  para: string;
  titulo: string;
  detalhe: string;
  prioridade: "alta" | "media" | "baixa";
  estado: "aberta" | "andamento" | "aguardando-rafael" | "feita" | "cancelada";
  setor: string | null;
  documento_id: string | null;
  decisao: "aprovada" | "recusada" | "ajuste" | null;
  decisao_nota: string | null;
  decidida_em: string | null;
  criada: string;
  atualizada: string;
};
export type Historico = { id: number; demanda_id: number; ts: string; por: string; acao: string; nota: string };

export async function autorizado() {
  const sb = await supabaseServidor();
  const { data } = await sb.rpc("central_autorizado");
  return data === true;
}

export async function cadastros() {
  const sb = await supabaseServidor();
  const [ag, st] = await Promise.all([
    sb.from("central_agentes").select("*"),
    sb.from("central_setores").select("*").order("ordem"),
  ]);
  const agentes = new Map<string, Agente>((ag.data ?? []).map((a: Agente) => [a.id, a]));
  return { agentes, setores: (st.data ?? []) as Setor[] };
}

export function nomeDe(agentes: Map<string, Agente>, id: string) {
  if (id === "rafael") return "Você";
  return agentes.get(id)?.nome ?? id;
}

const fmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function quando(iso: string) {
  return fmt.format(new Date(iso));
}

const fmtHora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
const fmtDia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });

export function soHora(iso: string) {
  return fmtHora.format(new Date(iso));
}

// "hoje às 14:30", "amanhã às 09:00" ou "28/10, 14:30"
export function diaEHora(iso: string, agora = new Date()) {
  const d = new Date(iso);
  const hoje = fmtDia.format(agora);
  const amanha = fmtDia.format(new Date(agora.getTime() + 86400000));
  const ontem = fmtDia.format(new Date(agora.getTime() - 86400000));
  const dia = fmtDia.format(d);
  if (dia === hoje) return `hoje às ${soHora(iso)}`;
  if (dia === amanha) return `amanhã às ${soHora(iso)}`;
  if (dia === ontem) return `ontem às ${soHora(iso)}`;
  return quando(iso);
}

// "em 25 min", "em 2 h", "atrasada 10 min"
export function emQuanto(iso: string, agora = Date.now()) {
  const s = (new Date(iso).getTime() - agora) / 1000;
  const abs = Math.abs(s);
  const t = abs < 3600 ? `${Math.max(1, Math.round(abs / 60))} min` : abs < 86400 ? `${Math.round(abs / 3600)} h` : `${Math.round(abs / 86400)} d`;
  return s >= 0 ? `em ${t}` : `atrasada ${t}`;
}

export function haQuanto(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "agora";
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  return `há ${Math.floor(s / 86400)} d`;
}
