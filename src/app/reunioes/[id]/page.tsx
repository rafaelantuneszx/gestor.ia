import { notFound } from "next/navigation";
import { Topo, SemAcesso } from "@/components/Topo";
import { DetalheReuniao, type Vinculos } from "@/components/reunioes/Reunioes";
import { autorizado, cadastros } from "@/lib/dados";
import { CAMPOS_EVENTO, falaDoEvento, type Fala } from "@/lib/falas";
import type { Reuniao } from "@/lib/reunioes";
import { supabaseServidor } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function VerReuniao({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aba?: string; assistir?: string }>;
}) {
  const { id } = await params;
  const q = await searchParams;
  if (!/^\d+$/.test(id)) notFound();
  if (!(await autorizado())) return <SemAcesso />;
  const sb = await supabaseServidor();
  const [{ agentes }, reu, pend, ev] = await Promise.all([
    cadastros(),
    sb.from("central_reunioes").select("*").eq("id", Number(id)).maybeSingle(),
    sb.from("central_demandas").select("id", { count: "exact", head: true }).eq("estado", "aguardando-rafael"),
    sb.from("central_eventos").select(CAMPOS_EVENTO).eq("rotina", `reuniao#${id}`).eq("tipo", "nota").order("id").limit(2000),
  ]);
  const r = reu.data as Reuniao | null;
  if (!r) notFound();
  const falas = ((ev.data ?? []) as Parameters<typeof falaDoEvento>[0][]).map(falaDoEvento).filter((f): f is Fala => !!f);

  const [dem, doc] = await Promise.all([
    r.demanda_id
      ? sb.from("central_demandas").select("id, titulo, estado").eq("id", r.demanda_id).maybeSingle()
      : Promise.resolve({ data: null }),
    r.documento_id
      ? sb.from("central_documentos").select("id, titulo").eq("id", r.documento_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const vinculos: Vinculos = { demanda: dem.data as Vinculos["demanda"], documento: doc.data as Vinculos["documento"] };

  return (
    <>
      <Topo aba="reunioes" pendentes={pend.count ?? 0} />
      <DetalheReuniao r={r} agentes={agentes} base="/reunioes" vinculos={vinculos} falas={falas}
        aba={q.aba === "resumo" ? "resumo" : q.aba === "conversa" ? "conversa" : undefined} assistir={q.assistir === "1"} />
    </>
  );
}
