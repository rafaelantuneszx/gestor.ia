import { notFound } from "next/navigation";
import { Caixa } from "@/components/emails/Caixa";
import { Topo } from "@/components/Topo";

export const dynamic = "force-dynamic";

// Demonstração com e-mails fictícios, sem login. Só existe em desenvolvimento.
export default function EmailsDemo() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <>
      <Topo aba="escritorio" />
      <Caixa demo agentes={{ "bruno-financeiro": "Bruno", "otavio-pavimax": "Otávio", "davi-faturas": "Davi", "caio-suprimentos": "Caio", "beatriz-fiscal": "Beatriz", "igor-folha-financeiro": "Igor", "clara-assistente": "Clara" }} />
    </>
  );
}
