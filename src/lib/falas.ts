// Falas das reuniões. Cada fala é um evento em central_eventos com tipo 'nota', rotina 'reuniao#<id>' e
// resumo começando com "fala: " (o agente do evento é quem falou). Funções puras: servem no servidor e no navegador.

export type Fala = { id: number; ts: string; agente: string; texto: string; reuniaoId: number };

const RE_ROTINA = /^reuniao#(\d+)$/;
const RE_FALA = /^fala:\s*/i;

export function falaDoEvento(ev: { id: number; ts: string; tipo: string; agente: string; rotina: string; resumo: string }): Fala | null {
  if (ev.tipo !== "nota" || !RE_FALA.test(ev.resumo ?? "")) return null;
  const m = RE_ROTINA.exec(ev.rotina ?? "");
  if (!m) return null;
  const texto = ev.resumo.replace(RE_FALA, "").trim();
  if (!texto) return null;
  return { id: ev.id, ts: ev.ts, agente: ev.agente, texto, reuniaoId: Number(m[1]) };
}

export const CAMPOS_EVENTO = "id, ts, tipo, agente, rotina, resumo";

// Grupos de falas seguidas da mesma pessoa (para o chat agrupar os balões).
export function agrupar<T extends { agente: string }>(falas: T[]): { agente: string; itens: { f: T; i: number }[] }[] {
  const out: { agente: string; itens: { f: T; i: number }[] }[] = [];
  falas.forEach((f, i) => {
    const ultimo = out[out.length - 1];
    if (ultimo && ultimo.agente === f.agente) ultimo.itens.push({ f, i });
    else out.push({ agente: f.agente, itens: [{ f, i }] });
  });
  return out;
}

// Tempo de leitura de uma fala sem voz (legenda): ~15 caracteres por segundo, entre 2 e 12 s.
export function tempoLeitura(texto: string, velocidade = 1) {
  return Math.min(12000, Math.max(2000, texto.length * 65)) / velocidade;
}

// Divide a fala em frases (o Chrome corta falas longas de uma vez só).
export function frases(texto: string): string[] {
  const partes = texto.match(/[^.!?;]+[.!?;]*\s*/g) ?? [texto];
  const out: string[] = [];
  for (const p of partes) {
    const t = p.trim();
    if (!t) continue;
    if (out.length && (out[out.length - 1].length < 40 || t.length < 12)) out[out.length - 1] += ` ${t}`;
    else out.push(t);
  }
  return out.length ? out : [texto];
}
