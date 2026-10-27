import { notFound } from "next/navigation";
import { Topo, SemAcesso } from "@/components/Topo";
import { DetalheReuniao, type Vinculos } from "@/components/reunioes/Reunioes";
import { autorizado, cadastros } from "@/lib/dados";
import type { Reuniao } from "@/lib/reunioes";
import { supabaseServidor } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function VerReuniao({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  if (!(await autorizado())) return <SemAcesso />;
  const sb = await supabaseServidor();
  const [{ agentes }, reu, pend] = await Promise.all([
    cadastros(),
    sb.from("central_reunioes").select("*").eq("id", Number(id)).maybeSingle(),
    sb.from("central_demandas").select("id", { count: "exact", head: true }).eq("estado", "aguardando-rafael"),
  ]);
  const r = reu.data as Reuniao | null;
  if (!r) notFound();

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
      <DetalheReuniao r={r} agentes={agentes} base="/reunioes" vinculos={vinculos} />
    </>
  );
}
