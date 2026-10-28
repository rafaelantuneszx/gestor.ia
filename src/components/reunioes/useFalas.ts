"use client";

// Falas de uma reunião, com as novas chegando por polling enquanto ela está em andamento.
// Real: lê central_eventos pelo Supabase do navegador (mesmo RLS da tela). Demonstração: libera as falas fictícias no tempo.
import { useCallback, useEffect, useRef, useState } from "react";
import { CAMPOS_EVENTO, falaDoEvento, type Fala } from "@/lib/falas";
import { demoFalas } from "@/lib/escritorio/demo";
import type { EstadoReuniao } from "@/lib/reunioes";
import { supabaseNavegador } from "@/lib/supabase/browser";

export function useFalas({
  reuniaoId, inicial, estadoInicial, modo, demoBase, intervalo = 3000,
}: {
  reuniaoId: number;
  inicial: Fala[];
  estadoInicial: EstadoReuniao;
  modo: "real" | "demo";
  demoBase?: number;
  intervalo?: number;
}) {
  const [falas, setFalas] = useState<Fala[]>(inicial);
  const [estado, setEstado] = useState<EstadoReuniao>(estadoInicial);
  const [erro, setErro] = useState<string | null>(null);
  const ultimo = useRef(inicial.reduce((m, f) => Math.max(m, f.id), 0));
  const extras = useRef<Fala[]>([]); // falas locais da demonstração (as do Rafael e as respostas fixas)

  const juntar = useCallback((novas: Fala[]) => {
    if (!novas.length) return;
    setFalas((atual) => {
      const ids = new Set(atual.map((f) => f.id));
      const add = novas.filter((f) => !ids.has(f.id));
      if (!add.length) return atual;
      for (const f of add) ultimo.current = Math.max(ultimo.current, f.id);
      return [...atual, ...add].sort((a, b) => a.ts.localeCompare(b.ts) || a.id - b.id);
    });
  }, []);

  const aoVivo = estado === "em_andamento";
  useEffect(() => {
    if (!aoVivo) return;
    let vivo = true;
    const buscar = async () => {
      try {
        if (modo === "demo") {
          const lista = [...demoFalas(reuniaoId, demoBase ?? Date.now(), Date.now()), ...extras.current];
          if (vivo) juntar(lista);
          return;
        }
        const sb = supabaseNavegador();
        const [ev, reu] = await Promise.all([
          sb.from("central_eventos").select(CAMPOS_EVENTO).eq("rotina", `reuniao#${reuniaoId}`).eq("tipo", "nota")
            .gt("id", ultimo.current).order("id").limit(200),
          sb.from("central_reunioes").select("estado").eq("id", reuniaoId).maybeSingle(),
        ]);
        if (!vivo) return;
        if (ev.error) throw new Error(ev.error.message);
        juntar(((ev.data ?? []) as Parameters<typeof falaDoEvento>[0][]).map(falaDoEvento).filter((f): f is Fala => !!f));
        const e = (reu.data as { estado?: EstadoReuniao } | null)?.estado;
        if (e) setEstado(e);
        setErro(null);
      } catch (e) {
        if (vivo) setErro((e as Error).message);
      }
    };
    buscar();
    const t = setInterval(buscar, intervalo);
    return () => { vivo = false; clearInterval(t); };
  }, [aoVivo, modo, reuniaoId, demoBase, intervalo, juntar]);

  // Demonstração: falas criadas na tela (sem banco).
  const adicionarLocal = useCallback((f: Omit<Fala, "id" | "ts" | "reuniaoId">) => {
    const nova: Fala = { ...f, id: 1_000_000 + extras.current.length, ts: new Date().toISOString(), reuniaoId };
    extras.current.push(nova);
    juntar([nova]);
    return nova;
  }, [juntar, reuniaoId]);

  return { falas, estado, setEstado, erro, juntar, adicionarLocal };
}
