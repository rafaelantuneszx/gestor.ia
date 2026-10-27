import { notFound } from "next/navigation";
import { DetalheReuniao } from "@/components/reunioes/Reunioes";
import { DEMO_AGENTES, DEMO_DEMANDAS, demoReunioes } from "@/lib/escritorio/demo";
import type { Agente } from "@/lib/dados";

export const dynamic = "force-dynamic";

// Detalhe de uma reunião fictícia, sem login. Só existe em desenvolvimento.
export default async function DemoReuniao({ params }: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { id } = await params;
  const r = demoReunioes().find((x) => x.id === Number(id));
  if (!r) notFound();
  const agentes = new Map<string, Agente>(DEMO_AGENTES.map((a) => [a.id, a]));
  const demanda = DEMO_DEMANDAS.find((d) => d.id === r.demanda_id) ?? null;
  return (
    <>
      <header className="border-b border-line bg-card px-4 py-3 text-[15px] font-semibold">
        Gestor.IA <span className="font-normal text-muted">· reunião (demonstração com dados fictícios)</span>
      </header>
      <DetalheReuniao r={r} agentes={agentes} base="/reunioes/demo"
        vinculos={{ demanda, documento: r.documento_id ? { id: r.documento_id, titulo: "Ata: Alinhamento da semana" } : null }}
        linkDemanda="/reunioes/demo" linkDocumento={() => "/reunioes/demo"} />
    </>
  );
}
