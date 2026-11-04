import { Topo, SemAcesso } from "@/components/Topo";
import { EscritorioCliente } from "@/components/escritorio/EscritorioCliente";
import { autorizado } from "@/lib/dados";
import { escopoAtual } from "@/lib/escopo";

export const dynamic = "force-dynamic";

export default async function PaginaEscritorio() {
  if (!(await autorizado())) return <SemAcesso />;
  const escopo = await escopoAtual();
  return (
    <>
      <Topo aba="escritorio" />
      <EscritorioCliente modo="real" escopo={escopo} />
    </>
  );
}
