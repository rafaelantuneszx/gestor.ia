import { notFound } from "next/navigation";
import { ListaReunioes } from "@/components/reunioes/Reunioes";
import { DEMO_AGENTES, demoFalas, demoReunioes } from "@/lib/escritorio/demo";
import type { Agente } from "@/lib/dados";

export const dynamic = "force-dynamic";

// Demonstração com dados fictícios, sem login. Só existe em desenvolvimento.
export default function DemoReunioes() {
  if (process.env.NODE_ENV === "production") notFound();
  const agentes = new Map<string, Agente>(DEMO_AGENTES.map((a) => [a.id, a]));
  const reunioes = demoReunioes();
  // conta também as falas que ainda vão chegar na reunião ao vivo
  const falas = Object.fromEntries(reunioes.map((r) => [r.id, demoFalas(r.id, Date.now(), Date.now() + 3600_000).length]));
  return (
    <>
      <header className="border-b border-line bg-card px-4 py-3 text-[15px] font-semibold">
        Gestor.IA <span className="font-normal text-muted">· reuniões (demonstração com dados fictícios)</span>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <ListaReunioes reunioes={reunioes} agentes={agentes} base="/reunioes/demo" falas={falas} />
      </main>
    </>
  );
}
