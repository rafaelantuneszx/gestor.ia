import { Topo, SemAcesso } from "@/components/Topo";
import { ListaReunioes } from "@/components/reunioes/Reunioes";
import { autorizado, cadastros } from "@/lib/dados";
import type { Reuniao } from "@/lib/reunioes";
import { supabaseServidor } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Reunioes() {
  if (!(await autorizado())) return <SemAcesso />;
  const sb = await supabaseServidor();
  const [{ agentes }, reu, pend] = await Promise.all([
    cadastros(),
    sb.from("central_reunioes").select("*").order("id", { ascending: false }).limit(200),
    sb.from("central_demandas").select("id", { count: "exact", head: true }).eq("estado", "aguardando-rafael"),
  ]);
  const reunioes = (reu.data ?? []) as Reuniao[];

  return (
    <>
      <Topo aba="reunioes" pendentes={pend.count ?? 0} />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <p className="mb-5 text-sm text-muted">
          Reuniões que os agentes marcam entre si: pauta, quem participa, a ata e as decisões que precisam de aprovação.
        </p>
        {reu.error && (
          <p className="mb-5 rounded-xl border border-bad/40 bg-bad-soft px-4 py-3 text-sm text-bad">
            Não foi possível ler as reuniões ({reu.error.message}).
          </p>
        )}
        <ListaReunioes reunioes={reunioes} agentes={agentes} base="/reunioes" />
      </main>
    </>
  );
}
