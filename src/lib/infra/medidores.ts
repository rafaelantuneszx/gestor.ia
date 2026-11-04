// Medidores da infra: o que dá para medir de verdade a partir do site. Só no servidor (lê chaves sem mostrar o valor).
import { ID_GESTOR } from "@/lib/banco";
import { supabaseServidor } from "@/lib/supabase/server";
import { vozesReaisLigadas } from "@/lib/vozes-reais";

export type EstadoMedidor = "ok" | "atencao" | "parado";
export type Medidor = { estado: EstadoMedidor; texto: string; detalhe?: string };
export type Medidores = Record<string, Medidor>;

const HORA_MS = 3600 * 1000;
const NUM = new Intl.NumberFormat("pt-BR");
const FMT = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const quando = (iso: string) => FMT.format(new Date(iso));
const plural = (n: number, um: string, varios: string) => `${NUM.format(n)} ${n === 1 ? um : varios}`;

function idade(iso: string, agora: number) {
  const min = Math.max(0, Math.round((agora - new Date(iso).getTime()) / 60000));
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  return h < 48 ? `há ${h} h` : `há ${Math.round(h / 24)} dias`;
}

export async function medirInfra(): Promise<Medidores> {
  const sb = await supabaseServidor();
  const agora = Date.now();
  const dia = new Date(agora - 24 * HORA_MS).toISOString();
  const trinta = new Date(agora - 30 * 24 * HORA_MS).toISOString();
  const [ultimo, plantao, ev24, abertas, feitas, reunioes, docs, docUltimo, agentes, sync, cartoes, cartaoUltimo] = await Promise.all([
    sb.from("central_eventos").select("ts").neq("agente", ID_GESTOR).order("id", { ascending: false }).limit(1).maybeSingle(),
    sb.from("central_eventos").select("ts, status").eq("rotina", "plantao").eq("tipo", "fim").order("id", { ascending: false }).limit(1).maybeSingle(),
    sb.from("central_eventos").select("id", { count: "exact", head: true }).gte("ts", dia),
    sb.from("central_demandas").select("id", { count: "exact", head: true }).in("estado", ["aberta", "andamento"]),
    sb.from("central_demandas").select("id", { count: "exact", head: true }).eq("estado", "feita"),
    sb.from("central_reunioes").select("id", { count: "exact", head: true }),
    sb.from("central_documentos").select("id", { count: "exact", head: true }),
    sb.from("central_documentos").select("criado_em").order("criado_em", { ascending: false }).limit(1).maybeSingle(),
    sb.from("central_agentes").select("id", { count: "exact", head: true }),
    sb.from("int_sync_log").select("status, iniciado_em").gte("iniciado_em", trinta).order("iniciado_em", { ascending: false }).limit(5000),
    sb.from("central_emails").select("id", { count: "exact", head: true }),
    sb.from("central_emails").select("atualizado_em").order("atualizado_em", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const m: Medidores = {};

  // Banco: se esta página leu, ele está de pé.
  if (ev24.error) {
    m.banco = { estado: "parado", texto: "Sem resposta do banco" };
  } else {
    m.banco = {
      estado: "ok", texto: `${plural(ev24.count ?? 0, "evento", "eventos")} em 24 h`,
      detalhe: `${plural(abertas.count ?? 0, "demanda aberta", "demandas abertas")}, ${plural(feitas.count ?? 0, "feita", "feitas")} e ${plural(reunioes.count ?? 0, "reunião", "reuniões")}.`,
    };
    m.supabase = { estado: "ok", texto: "Respondeu agora", detalhe: "Esta página acabou de ler o banco da central. O banco do FPAV Financeiro não é medido daqui." };
  }

  // Notebook: o plantão registra um sinal por hora. Sem sinal por 2 horas, algo parou.
  const ts = ultimo.data?.ts as string | undefined;
  if (ts) {
    const parado = agora - new Date(ts).getTime() > 2 * HORA_MS;
    m.notebook = {
      estado: parado ? "parado" : "ok",
      texto: parado ? `Sem sinal ${idade(ts, agora)}` : `Último sinal ${idade(ts, agora)}`,
      detalhe: `Último registro de um agente: ${quando(ts)}.`,
    };
  } else {
    m.notebook = { estado: "parado", texto: "Nenhum sinal registrado" };
  }

  // Plantão: última rodada concluída.
  const tsPlantao = plantao.data?.ts as string | undefined;
  if (tsPlantao) {
    const atrasado = agora - new Date(tsPlantao).getTime() > 2 * HORA_MS;
    m.plantao = {
      estado: atrasado ? "atencao" : plantao.data?.status === "erro" ? "atencao" : "ok",
      texto: `Última rodada ${idade(tsPlantao, agora)}`,
      detalhe: `Terminou em ${quando(tsPlantao)}${plantao.data?.status ? ` com situação “${plantao.data.status}”` : ""}.`,
    };
  } else {
    m.plantao = { estado: "atencao", texto: "Nenhuma rodada registrada" };
  }

  m.equipe = { estado: "ok", texto: `${plural(agentes.count ?? 0, "agente cadastrado", "agentes cadastrados")}`, detalhe: "Contagem de quem está cadastrado no Gestor.IA." };

  m.arquivo = {
    estado: "ok", texto: plural(docs.count ?? 0, "documento", "documentos"),
    detalhe: docUltimo.data?.criado_em ? `Última entrega: ${quando(docUltimo.data.criado_em as string)}.` : undefined,
  };

  // Integração automática.
  if (sync.error) {
    m.financeiro = { estado: "atencao", texto: "Sem acesso ao registro", detalhe: "O seu login não conseguiu ler o registro de sincronização." };
  } else {
    const log = (sync.data ?? []) as { status: string; iniciado_em: string }[];
    const ok = log.filter((l) => l.status === "ok").length;
    const ultimoSync = log[0];
    if (ultimoSync) {
      const falhou = ultimoSync.status !== "ok";
      const velho = agora - new Date(ultimoSync.iniciado_em).getTime() > 12 * HORA_MS;
      m.financeiro = {
        estado: falhou ? "parado" : velho ? "atencao" : "ok",
        texto: `Sincronizou ${idade(ultimoSync.iniciado_em, agora)}`,
        detalhe: `${NUM.format(ok)} de ${NUM.format(log.length)} sincronizações com o PaviMax sem erro em 30 dias. Última: ${quando(ultimoSync.iniciado_em)}.`,
      };
    } else {
      m.financeiro = { estado: "atencao", texto: "Sem sincronização em 30 dias" };
    }
  }

  // Cartões de e-mail publicados: mostram se a leitura das caixas está viva.
  if (!cartoes.error) {
    const tsCartao = cartaoUltimo.data?.atualizado_em as string | undefined;
    const velho = tsCartao ? agora - new Date(tsCartao).getTime() > 3 * HORA_MS : true;
    m.indice = {
      estado: velho ? "atencao" : "ok",
      texto: tsCartao ? `Publicou ${idade(tsCartao, agora)}` : "Nada publicado",
      detalhe: `${plural(cartoes.count ?? 0, "cartão", "cartões")} no site.`,
    };
  }

  // Chaves: só se existem. O valor nunca é lido para a tela.
  const temClaude = Boolean(process.env.ANTHROPIC_API_KEY);
  const temVoz = vozesReaisLigadas();
  m.apis = {
    estado: temClaude ? "ok" : "parado",
    texto: temClaude ? (temVoz ? "Claude e voz ligados" : "Claude ligado, voz do navegador") : "Falta a chave do Claude",
    detalhe: `Chave do Claude: ${temClaude ? "cadastrada" : "não cadastrada"}. Voz real: ${temVoz ? "cadastrada" : "não cadastrada"}.`,
  };
  m.conversa = temClaude
    ? { estado: "ok", texto: "Pronta para responder" }
    : { estado: "parado", texto: "Sem resposta automática", detalhe: "Sem a chave do Claude, sua fala é registrada, mas ninguém responde." };

  // Site: se esta página abriu, ele está no ar.
  const versao = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7);
  m.painel = { estado: "ok", texto: "No ar agora", detalhe: versao ? `Versão publicada: ${versao}.` : "Rodando neste computador, fora da Vercel." };
  m.vercel = { estado: "ok", texto: versao ? "Respondeu agora" : "Teste local", detalhe: "Só o Gestor.IA é medido daqui. PaviMax, Financeiro e RH têm painel próprio." };

  return m;
}

export const MEDIDORES_DEMO: Medidores = {
  banco: { estado: "ok", texto: "74 eventos em 24 h", detalhe: "Demonstração com dados fictícios." },
  supabase: { estado: "ok", texto: "Respondeu agora", detalhe: "Demonstração com dados fictícios." },
  notebook: { estado: "ok", texto: "Último sinal há 12 min", detalhe: "Demonstração com dados fictícios." },
  plantao: { estado: "ok", texto: "Última rodada há 12 min", detalhe: "Demonstração com dados fictícios." },
  equipe: { estado: "ok", texto: "15 agentes cadastrados" },
  arquivo: { estado: "ok", texto: "57 documentos" },
  financeiro: { estado: "ok", texto: "Sincronizou há 3 h", detalhe: "Demonstração com dados fictícios." },
  indice: { estado: "atencao", texto: "Publicou há 5 h", detalhe: "Demonstração com dados fictícios." },
  apis: { estado: "parado", texto: "Falta a chave do Claude", detalhe: "Demonstração com dados fictícios." },
  conversa: { estado: "parado", texto: "Sem resposta automática", detalhe: "Demonstração com dados fictícios." },
  painel: { estado: "ok", texto: "No ar agora" },
  vercel: { estado: "ok", texto: "Respondeu agora" },
};
