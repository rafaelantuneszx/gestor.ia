import { Infra } from "@/components/infra/Infra";
import { SemAcesso, Topo } from "@/components/Topo";
import { autorizado } from "@/lib/dados";
import { medirInfra } from "@/lib/infra/medidores";

export const dynamic = "force-dynamic";

export const metadata = { title: "Infra · Gestor.IA" };

export default async function PaginaInfra() {
  if (!(await autorizado())) return <SemAcesso />;
  const medidores = await medirInfra();
  return (
    <>
      <Topo aba="escritorio" />
      <Infra medidores={medidores} />
    </>
  );
}
