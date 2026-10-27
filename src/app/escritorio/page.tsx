import { Topo, SemAcesso } from "@/components/Topo";
import { EscritorioCliente } from "@/components/escritorio/EscritorioCliente";
import { autorizado } from "@/lib/dados";
import { supabaseServidor } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PaginaEscritorio() {
  if (!(await autorizado())) return <SemAcesso />;
  const sb = await supabaseServidor();
  const pend = await sb.from("central_demandas").select("id", { count: "exact", head: true }).eq("estado", "aguardando-rafael");
  return (
    <>
      <Topo aba="escritorio" pendentes={pend.count ?? 0} />
      <EscritorioCliente modo="real" />
    </>
  );
}
