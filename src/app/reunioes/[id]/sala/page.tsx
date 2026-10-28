import { notFound } from "next/navigation";
import { SemAcesso } from "@/components/Topo";
import { pessoasDe } from "@/components/reunioes/Reunioes";
import { SalaMeeting } from "@/components/reunioes/SalaMeeting";
import { autorizado, cadastros } from "@/lib/dados";
import { CAMPOS_EVENTO, falaDoEvento, type Fala } from "@/lib/falas";
import { itensPauta, type Reuniao } from "@/lib/reunioes";
import { supabaseServidor } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Sala de reunião ao vivo: o Rafael entra, fala (voz ou texto) e escuta os participantes responderem.
export default async function Sala({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  if (!(await autorizado())) return <SemAcesso />;
  const sb = await supabaseServidor();
  const [{ agentes }, reu, ev] = await Promise.all([
    cadastros(),
    sb.from("central_reunioes").select("*").eq("id", Number(id)).maybeSingle(),
    sb.from("central_eventos").select(CAMPOS_EVENTO).eq("rotina", `reuniao#${id}`).eq("tipo", "nota").order("id").limit(2000),
  ]);
  const r = reu.data as Reuniao | null;
  if (!r) notFound();
  const falas = ((ev.data ?? []) as Parameters<typeof falaDoEvento>[0][]).map(falaDoEvento).filter((f): f is Fala => !!f);
  return (
    <SalaMeeting modo="real" voltar={`/reunioes/${r.id}`} pessoas={pessoasDe(agentes)} falasIniciais={falas}
      reuniao={{ id: r.id, titulo: r.titulo, estado: r.estado, convocada_por: r.convocada_por, participantes: r.participantes ?? [],
        pauta: itensPauta(r), iniciada_em: r.iniciada_em }} />
  );
}
