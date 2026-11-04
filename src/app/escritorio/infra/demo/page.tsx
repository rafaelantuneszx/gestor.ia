import { notFound } from "next/navigation";
import { Infra } from "@/components/infra/Infra";
import { MEDIDORES_DEMO } from "@/lib/infra/medidores";

export const dynamic = "force-dynamic";

// Demonstração com dados fictícios, sem login. Só existe em desenvolvimento.
export default function InfraDemo() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Infra medidores={MEDIDORES_DEMO} demo />;
}
