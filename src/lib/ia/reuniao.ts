// Respostas dos agentes na sala de reunião com o Rafael (só no servidor).
// A cada fala do Rafael, monta o contexto com a sessão dele (só leitura, pelo RLS) e pede ao Claude as próximas
// 1 a 3 falas, em JSON com esquema fixo. Quem grava as falas é a rota, pela RPC central_reuniao_falar.
import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CAMPOS_EVENTO, falaDoEvento, type Fala } from "@/lib/falas";
import { PERSONA } from "@/lib/pessoas";
import type { Reuniao } from "@/lib/reunioes";
import { itensPauta, presentes } from "@/lib/reunioes";

export const MODELO = "claude-opus-5-5";
export type FalaGerada = { agente: string; texto: string };
export type ResultadoIA = { ok: true; falas: FalaGerada[]; uso?: { entrada: number; saida: number; cache: number } }
  | { ok: false; motivo: "sem-chave" | "recusa" | "erro"; mensagem: string };

const HORA = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
const DATA = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "full" });
const cortar = (t: string | null | undefined, n: number) => {
  const s = (t ?? "").trim();
  return s.length > n ? `${s.slice(0, n)}… [cortado]` : s;
};

// Regras fixas (primeiro bloco do system, igual em toda chamada: entra no cache).
const REGRAS = `Você dá voz aos agentes de IA da Rafael Enterprises numa reunião ao vivo com o Rafael, o dono do grupo
(empresas FPAV, BRACTOS e PAVIMAX; sistemas PaviMax ERP, FPAV Financeiro e FPAV RH). O Rafael fala por voz ou texto
pela tela do Gestor.IA e escuta as respostas com a voz de cada agente.

Como responder:
- Gere de 1 a 3 falas, como numa reunião de verdade: curtas (1 a 3 frases cada), em português do Brasil, na primeira
  pessoa, no tom de cada um. Texto falado: sem markdown, sem listas, sem emojis; números por extenso só quando ajudar a fala.
- Quem é dono do assunto responde. A Helena conduz (abre, organiza, resume e fecha), quando estiver na reunião;
  sem ela, conduz quem convocou ou o diretor da área. Não ponha todo mundo para falar a cada vez.
- Diretores são objetivos e trazem número com a fonte (relatório, demanda ou ata do contexto).
- Só use números e fatos que estão no contexto abaixo. Se não souber, diga que vai levantar e diga o próximo passo
  (quem faz e até quando). Nunca invente valores, datas ou nomes.
- Ninguém promete pagamento, aprova valor, grava no banco ou manda mensagem para fora. Decisão que grava ou mexe
  em dinheiro vira "vou preparar e trazer para a sua aprovação".
- Nada de dados pessoais (CPF, salário individual, endereço).
- Responda ao que o Rafael acabou de dizer; não repita o que já foi dito na transcrição.
- O campo "agente" é o id de um participante da reunião (lista abaixo). Nunca fale pelo Rafael.`;

const ESQUEMA = (ids: string[]) => ({
  type: "object",
  properties: {
    falas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          agente: { type: "string", enum: ids },
          texto: { type: "string" },
        },
        required: ["agente", "texto"],
        additionalProperties: false,
      },
    },
  },
  required: ["falas"],
  additionalProperties: false,
});

type Agente = { id: string; nome: string; cargo: string; grupo: string; setor: string | null };

// Contexto da reunião, lido com a sessão do Rafael.
export async function montarContexto(sb: SupabaseClient, r: Reuniao) {
  const ids = presentes(r).filter((id) => id !== "rafael");
  const [ag, ev, dem, reu] = await Promise.all([
    sb.from("central_agentes").select("id, nome, cargo, grupo, setor"),
    sb.from("central_eventos").select(CAMPOS_EVENTO).eq("rotina", `reuniao#${r.id}`).eq("tipo", "nota").order("id").limit(1000),
    sb.from("central_demandas").select("id, de, para, titulo, detalhe, prioridade, estado, atualizada")
      .in("estado", ["aberta", "andamento", "aguardando-rafael"]).order("id", { ascending: false }).limit(40),
    sb.from("central_reunioes").select("id, titulo, encerrada_em, ata").eq("estado", "encerrada").neq("id", r.id)
      .order("encerrada_em", { ascending: false }).limit(4),
  ]);
  const agentes = new Map(((ag.data ?? []) as Agente[]).map((a) => [a.id, a]));
  const setores = [...new Set(ids.map((id) => agentes.get(id)?.setor).filter(Boolean) as string[])];
  const docs = setores.length
    ? await sb.from("central_documentos").select("setor, titulo, criado_em, conteudo_md").in("setor", setores)
      .order("criado_em", { ascending: false }).limit(40)
    : { data: [] };
  const porSetor = new Map<string, { setor: string; titulo: string; criado_em: string; conteudo_md: string | null }[]>();
  for (const d of (docs.data ?? []) as { setor: string; titulo: string; criado_em: string; conteudo_md: string | null }[]) {
    const l = porSetor.get(d.setor) ?? [];
    if (l.length < 2) porSetor.set(d.setor, [...l, d]);
  }
  const falas = ((ev.data ?? []) as Parameters<typeof falaDoEvento>[0][]).map(falaDoEvento).filter((f): f is Fala => !!f);
  const nome = (id: string) => (id === "rafael" ? "Rafael" : agentes.get(id)?.nome ?? id);

  const participantes = ids.map((id) => {
    const a = agentes.get(id);
    const p = PERSONA[id];
    return `- ${id}: ${a?.nome ?? id}, ${a?.cargo ?? "agente"}${a?.setor ? ` (setor ${a.setor})` : ""}` +
      `${p ? `. Área: ${p.area}. Tom: ${p.tom}.` : ""}`;
  }).join("\n");

  const demandas = ((dem.data ?? []) as { id: number; de: string; para: string; titulo: string; detalhe: string; prioridade: string; estado: string }[])
    .map((d) => `- #${d.id} [${d.estado}, prioridade ${d.prioridade}] ${nome(d.de)} → ${nome(d.para)}: ${d.titulo}` +
      (d.detalhe ? `\n  ${cortar(d.detalhe, 400).replace(/\n+/g, " ")}` : ""))
    .join("\n") || "(nenhuma)";

  const atas = ((reu.data ?? []) as { id: number; titulo: string; encerrada_em: string | null; ata: string | null }[])
    .map((x) => `### Reunião #${x.id}: ${x.titulo}${x.encerrada_em ? ` (encerrada ${DATA.format(new Date(x.encerrada_em))})` : ""}\n${cortar(x.ata, 1800) || "(sem ata)"}`)
    .join("\n\n") || "(nenhuma)";

  const relatorios = [...porSetor.values()].flat()
    .map((d) => `### [${d.setor}] ${d.titulo} (${DATA.format(new Date(d.criado_em))})\n${cortar(d.conteudo_md, 3500) || "(sem texto)"}`)
    .join("\n\n") || "(nenhum)";

  const contexto = `# Reunião #${r.id}: ${r.titulo}
Convocada por: ${nome(r.convocada_por)}
Pauta:
${itensPauta(r).map((p, i) => `${i + 1}. ${p}`).join("\n") || "(sem pauta)"}

# Participantes (ids que podem falar)
${participantes}

# Demandas abertas e aguardando o Rafael
${demandas}

# Atas das reuniões recentes
${atas}

# Relatórios mais recentes do Arquivo (setores dos participantes)
${relatorios}`;

  return { contexto, falas, ids, nome };
}

export async function gerarRespostas(sb: SupabaseClient, r: Reuniao, falaRafael: string | null): Promise<ResultadoIA> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, motivo: "sem-chave", mensagem: "respostas automáticas desligadas: falta a chave (ANTHROPIC_API_KEY)" };
  }
  const { contexto, falas, ids, nome } = await montarContexto(sb, r);
  if (ids.length === 0) return { ok: false, motivo: "erro", mensagem: "a reunião não tem participantes" };

  const transcricao = falas.slice(-80).map((f) => `[${HORA.format(new Date(f.ts))}] ${nome(f.agente)} (${f.agente}): ${f.texto}`).join("\n");
  const pedido = falaRafael
    ? `O Rafael acabou de dizer: "${falaRafael}"\n\nGere as próximas falas dos participantes, respondendo a ele.`
    : "O Rafael acabou de entrar na sala. Quem conduz abre a reunião: cumprimenta, lembra a pauta em uma frase e pergunta por onde ele quer começar.";

  const client = new Anthropic();
  try {
    const resp = await client.beta.messages.create({
      model: MODELO,
      max_tokens: 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: { effort: "low", format: { type: "json_schema", schema: ESQUEMA(ids) } },
      system: [
        { type: "text", text: REGRAS },
        { type: "text", text: contexto, cache_control: { type: "ephemeral" } },
      ],
      messages: [{
        role: "user",
        content: `Hoje é ${DATA.format(new Date())}.\n\n# Transcrição até agora\n${transcricao || "(ninguém falou ainda)"}\n\n${pedido}`,
      }],
    }, { timeout: 55_000, maxRetries: 1 });

    if (resp.stop_reason === "refusal") {
      return { ok: false, motivo: "recusa", mensagem: "o modelo não quis responder a esta fala; tente dizer de outro jeito" };
    }
    const texto = resp.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    const json = JSON.parse(texto) as { falas?: FalaGerada[] };
    const validas = (json.falas ?? [])
      .filter((f) => f && ids.includes(f.agente) && typeof f.texto === "string" && f.texto.trim())
      .slice(0, 3)
      .map((f) => ({ agente: f.agente, texto: f.texto.trim().slice(0, 1200) }));
    if (validas.length === 0) return { ok: false, motivo: "erro", mensagem: "a resposta veio vazia" };
    return {
      ok: true,
      falas: validas,
      uso: {
        entrada: resp.usage.input_tokens,
        saida: resp.usage.output_tokens,
        cache: resp.usage.cache_read_input_tokens ?? 0,
      },
    };
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return { ok: false, motivo: "sem-chave", mensagem: "a chave ANTHROPIC_API_KEY foi recusada" };
    if (e instanceof Anthropic.RateLimitError) return { ok: false, motivo: "erro", mensagem: "muitas chamadas seguidas; tente de novo em instantes" };
    if (e instanceof Anthropic.APIError) return { ok: false, motivo: "erro", mensagem: `erro da API (${e.status ?? "sem status"})` };
    if (e instanceof SyntaxError) return { ok: false, motivo: "erro", mensagem: "a resposta não veio no formato esperado" };
    return { ok: false, motivo: "erro", mensagem: (e as Error).message };
  }
}

// Ata simples da conversa, para quando o Rafael encerra a reunião pela tela.
export function ataDaConversa(r: Reuniao, falas: Fala[], nome: (id: string) => string) {
  const linhas = falas.map((f) => `- **${nome(f.agente)}** (${HORA.format(new Date(f.ts))}): ${f.texto}`);
  return [
    "## Resumo",
    "",
    `Reunião com o Rafael pelo Gestor.IA. ${falas.length} falas registradas.`,
    "",
    "## Pauta",
    "",
    ...(itensPauta(r).length ? itensPauta(r).map((p, i) => `${i + 1}. ${p}`) : ["Sem pauta registrada."]),
    "",
    "## Conversa",
    "",
    ...linhas,
  ].join("\n");
}
