"use client";

// Busca os números da parede e dos painéis de LED a cada minuto. Em demonstração, calcula com os dados fictícios.
import { useEffect, useState } from "react";
import { DEMO_CONTAGEM, DEMO_DEMANDAS, demoEventos } from "@/lib/escritorio/demo";
import { calcularIndicadores, inicioDoDia, INDICADORES_VAZIOS, type DemandaInd, type Indicadores, type RotinaInd } from "@/lib/escritorio/indicadores";
import { supabaseNavegador } from "@/lib/supabase/browser";

const ATUALIZAR_MS = 60_000;
const DIA_MS = 24 * 3600 * 1000;

async function buscar(): Promise<Indicadores> {
  const sb = supabaseNavegador();
  const trinta = new Date(Date.now() - 30 * DIA_MS).toISOString();
  const [dem, docs, docsHoje, rot, ev, sync] = await Promise.all([
    sb.from("central_demandas").select("estado, decidida_em, atualizada").limit(5000),
    sb.from("central_documentos").select("id", { count: "exact", head: true }),
    sb.from("central_documentos").select("id", { count: "exact", head: true }).gte("criado_em", inicioDoDia()),
    sb.from("central_eventos").select("agente, rotina, status").eq("tipo", "fim").gte("ts", trinta).limit(5000),
    sb.from("central_eventos").select("id", { count: "exact", head: true }).gte("ts", new Date(Date.now() - DIA_MS).toISOString()),
    sb.from("int_sync_log").select("status, iniciado_em").gte("iniciado_em", trinta).order("iniciado_em", { ascending: false }).limit(5000),
  ]);
  const log = sync.error ? null : ((sync.data ?? []) as { status: string; iniciado_em: string }[]);
  return calcularIndicadores({
    demandas: (dem.data ?? []) as DemandaInd[],
    rotinas: (rot.data ?? []) as RotinaInd[],
    documentosTotal: docs.count ?? 0,
    documentosHoje: docsHoje.count ?? 0,
    eventos24h: ev.count ?? 0,
    sincronizacoes: log && log.length ? { ok: log.filter((l) => l.status === "ok").length, total: log.length } : null,
    ultimaSincronizacao: log?.[0]?.iniciado_em ?? null,
  });
}

function demonstracao(): Indicadores {
  const ev = demoEventos();
  return calcularIndicadores({
    demandas: DEMO_DEMANDAS.map((d) => ({ estado: d.estado, decidida_em: null, atualizada: new Date().toISOString() })),
    rotinas: ev.filter((e) => e.tipo === "fim").map((e) => ({ agente: e.agente, rotina: e.rotina, status: e.status })),
    documentosTotal: Object.values(DEMO_CONTAGEM).reduce((a, b) => a + b, 0),
    documentosHoje: 2,
    eventos24h: ev.length,
    sincronizacoes: { ok: 47, total: 50 },
    ultimaSincronizacao: new Date(Date.now() - 12 * 60_000).toISOString(),
  });
}

export function useIndicadores(modo: "real" | "demo") {
  const [ind, setInd] = useState<Indicadores>(INDICADORES_VAZIOS);
  useEffect(() => {
    if (modo === "demo") {
      setInd(demonstracao());
      return;
    }
    let vivo = true;
    const carregar = () => buscar().then((i) => { if (vivo) setInd(i); }).catch(() => {});
    carregar();
    const t = setInterval(carregar, ATUALIZAR_MS);
    return () => { vivo = false; clearInterval(t); };
  }, [modo]);
  return ind;
}
