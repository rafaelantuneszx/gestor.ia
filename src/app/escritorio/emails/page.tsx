import { Caixa } from "@/components/emails/Caixa";
import { SemAcesso, Topo } from "@/components/Topo";
import { autorizado, cadastros } from "@/lib/dados";

export const dynamic = "force-dynamic";

export const metadata = { title: "E-mails · Gestor.IA" };

export default async function PaginaEmails() {
  if (!(await autorizado())) return <SemAcesso />;
  const { agentes } = await cadastros();
  const nomes = Object.fromEntries([...agentes.values()].map((a) => [a.id, a.nome]));
  return (
    <>
      <Topo aba="escritorio" />
      <Caixa agentes={nomes} />
    </>
  );
}
