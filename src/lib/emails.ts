// Caixa de e-mail do Gestor.IA: tipos, nomes das caixas e das pastas, e os e-mails fictícios da demonstração.
import { CONTA_GESTOR } from "@/lib/banco";

export type Email = {
  id: string;
  conta: string;
  pasta: string | null;
  data: string | null;
  remetente: string | null;
  assunto: string | null;
  anexos: number;
  agente: string | null;
};

export type CorpoEmail = {
  de: string | null;
  para: string | null;
  cc: string | null;
  texto: string | null;
  html: string | null;
  anexos_nomes: string[] | null;
};

export const NOME_CONTA: Record<string, string> = {
  [CONTA_GESTOR]: "Sua caixa",
  "faturamento@fpav.com.br": "Faturamento FPAV",
  "faturamento@bractos.com.br": "Faturamento BRACTOS",
};
export const nomeConta = (conta: string) => NOME_CONTA[conta] ?? conta;

export type TipoPasta = "entrada" | "saida" | "outra";

export function tipoPasta(pasta: string | null): TipoPasta {
  const p = (pasta ?? "").trim();
  if (/^inbox$/i.test(p)) return "entrada";
  if (/(^|[./])(sent|enviad[ao]s?|sent items|itens enviados)$/i.test(p)) return "saida";
  return "outra";
}

// "INBOX.CAJU" vira "CAJU". As duas pastas principais têm nome fixo.
export function nomePasta(pasta: string | null): string {
  const tipo = tipoPasta(pasta);
  if (tipo === "entrada") return "Caixa de entrada";
  if (tipo === "saida") return "Caixa de saída";
  return (pasta ?? "Sem pasta").replace(/^inbox[./]/i, "").trim() || "Sem pasta";
}

// Ordem da árvore: entrada, saída e depois as outras pastas, em ordem alfabética.
export function ordemPasta(a: string | null, b: string | null): number {
  const peso = (p: string | null) => ({ entrada: 0, saida: 1, outra: 2 })[tipoPasta(p)];
  return peso(a) - peso(b) || nomePasta(a).localeCompare(nomePasta(b), "pt-BR");
}

const SP = "America/Sao_Paulo";
const DIA = new Intl.DateTimeFormat("en-CA", { timeZone: SP, year: "numeric", month: "2-digit", day: "2-digit" });
const HORA = new Intl.DateTimeFormat("pt-BR", { timeZone: SP, hour: "2-digit", minute: "2-digit" });
const CURTA = new Intl.DateTimeFormat("pt-BR", { timeZone: SP, day: "2-digit", month: "2-digit" });
const LONGA = new Intl.DateTimeFormat("pt-BR", { timeZone: SP, weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

const chaveDia = (d: Date) => DIA.format(d);

export const dataLonga = (iso: string | null) => (iso ? LONGA.format(new Date(iso)) : "Data não informada");

// Na lista: a hora para hoje, a data para os outros dias.
export function dataCurta(iso: string | null, agora = new Date()): string {
  if (!iso) return "";
  const d = new Date(iso);
  return chaveDia(d) === chaveDia(agora) ? HORA.format(d) : CURTA.format(d);
}

export function grupoDeData(iso: string | null, agora = new Date()): string {
  if (!iso) return "Sem data";
  const d = new Date(iso);
  const dias = Math.round((Date.parse(chaveDia(agora)) - Date.parse(chaveDia(d))) / 86_400_000);
  if (dias <= 0) return "Hoje";
  if (dias === 1) return "Ontem";
  if (dias < 7) return "Esta semana";
  if (dias < 14) return "Semana passada";
  return "Mais antigos";
}

// Documento do corpo em HTML. Roda num iframe em sandbox, sem scripts e sem nada de fora: imagens remotas
// só entram se você pedir, porque elas avisam ao remetente que o e-mail foi aberto.
export function documentoDoEmail(html: string, comImagens: boolean): string {
  const limpo = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<meta[^>]*http-equiv[^>]*>/gi, "")
    .replace(/<base[^>]*>/gi, "");
  const imagens = comImagens ? "data: https: http:" : "data:";
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">`
    + `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${imagens}; style-src 'unsafe-inline'; font-src data:">`
    + `<base target="_blank"><style>html{color-scheme:light}body{margin:16px;font:14px/1.5 -apple-system,'Segoe UI',system-ui,sans-serif;color:#1c1c1e;background:#fff;overflow-wrap:anywhere}`
    + `img{max-width:100%;height:auto}table{max-width:100%}blockquote{margin:0 0 0 8px;padding-left:12px;border-left:2px solid #d1d1d6;color:#3a3a3c}</style></head><body>${limpo}</body></html>`;
}

// ---------- demonstração ----------
const minutos = (n: number) => new Date(Date.now() - n * 60_000).toISOString();
const FATURAMENTO = "faturamento@fpav.com.br";
const BRACTOS = "faturamento@bractos.com.br";

export const DEMO_EMAILS: Email[] = [
  { id: "d1", conta: FATURAMENTO, pasta: "INBOX", data: minutos(18), remetente: "Fornecedor Exemplo", assunto: "Nota fiscal de outubro para conferir", anexos: 2, agente: "bruno-financeiro" },
  { id: "d2", conta: CONTA_GESTOR, pasta: "INBOX", data: minutos(66), remetente: "Cliente Exemplo", assunto: "Medição da obra para conferir", anexos: 1, agente: "otavio-pavimax" },
  { id: "d3", conta: BRACTOS, pasta: "INBOX", data: minutos(140), remetente: "Empresa Exemplo", assunto: "Boleto com vencimento na sexta", anexos: 1, agente: "davi-faturas" },
  { id: "d4", conta: CONTA_GESTOR, pasta: "INBOX.Sent", data: minutos(210), remetente: "Você", assunto: "Re: Medição da obra para conferir", anexos: 0, agente: "otavio-pavimax" },
  { id: "d5", conta: CONTA_GESTOR, pasta: "INBOX.FORNECEDORES", data: minutos(1500), remetente: "Fornecedor Exemplo", assunto: "Tabela de preços atualizada", anexos: 1, agente: "caio-suprimentos" },
  { id: "d6", conta: FATURAMENTO, pasta: "INBOX.Sent", data: minutos(1700), remetente: "Faturamento", assunto: "Envio da nota fiscal de serviço", anexos: 3, agente: "beatriz-fiscal" },
  { id: "d7", conta: BRACTOS, pasta: "INBOX.NOTAS", data: minutos(3200), remetente: "Empresa Exemplo", assunto: "Notas do mês anterior", anexos: 4, agente: "igor-folha-financeiro" },
  { id: "d8", conta: CONTA_GESTOR, pasta: "INBOX", data: minutos(9000), remetente: "Parceiro Exemplo", assunto: "Reunião de alinhamento na próxima semana", anexos: 0, agente: "clara-assistente" },
];

export function demoCorpo(e: Email): CorpoEmail {
  const de = tipoPasta(e.pasta) === "saida" ? nomeConta(e.conta) : `${e.remetente} <contato@exemplo.com>`;
  const para = tipoPasta(e.pasta) === "saida" ? "Contato Exemplo <contato@exemplo.com>" : nomeConta(e.conta);
  const anexos_nomes = Array.from({ length: e.anexos }, (_, i) => `documento-ficticio-${i + 1}.pdf`);
  if (e.id === "d1") {
    return {
      de, para, cc: null, texto: null, anexos_nomes,
      html: `<p>Bom dia,</p><p>Segue a <b>nota fiscal de outubro</b> para conferência. Este texto é fictício.</p>
        <table cellpadding="8" style="border-collapse:collapse;border:1px solid #d1d1d6"><tr style="background:#f2f2f7"><th align="left">Item</th><th align="right">Valor</th></tr>
        <tr><td>Serviço de exemplo</td><td align="right">R$ 1.000,00</td></tr><tr><td>Material de exemplo</td><td align="right">R$ 250,00</td></tr></table>
        <p><img src="https://exemplo.com/logo.png" alt="Logo do fornecedor" width="120"></p><p>Atenciosamente,<br>Fornecedor Exemplo</p>
        <blockquote>Mensagem anterior, também fictícia.</blockquote>`,
    };
  }
  return { de, para, cc: e.id === "d2" ? "Equipe Exemplo <equipe@exemplo.com>" : null, html: null, anexos_nomes, texto: `Olá,\n\nEste é um e-mail fictício da demonstração: ${e.assunto}.\n\nFico no aguardo.\n\nAtenciosamente,\n${e.remetente}` };
}
