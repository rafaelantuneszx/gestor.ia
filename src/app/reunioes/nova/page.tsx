import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Topo, SemAcesso } from "@/components/Topo";
import { Convocar } from "@/components/reunioes/Convocar";
import { autorizado, cadastros } from "@/lib/dados";
import { supabaseServidor } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NovaReuniao() {
  if (!(await autorizado())) return <SemAcesso />;
  const sb = await supabaseServidor();
  const [{ agentes }, pend] = await Promise.all([
    cadastros(),
    sb.from("central_demandas").select("id", { count: "exact", head: true }).eq("estado", "aguardando-rafael"),
  ]);
  return (
    <>
      <Topo aba="reunioes" pendentes={pend.count ?? 0} />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <Link href="/reunioes" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-text"><ChevronLeft size={16} /> Reuniões</Link>
        <h1 className="mb-1 text-xl font-semibold sm:text-2xl">Convocar uma reunião</h1>
        <p className="mb-6 text-sm text-muted">A reunião começa na hora: você entra na sala, fala por voz ou texto e os participantes respondem.</p>
        <Convocar modo="real" base="/reunioes" agentes={[...agentes.values()].map((a) => ({ id: a.id, nome: a.nome, cargo: a.cargo, setor: a.setor }))} />
      </main>
    </>
  );
}
