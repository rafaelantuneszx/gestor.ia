import { notFound } from "next/navigation";
import { DetalheReuniao } from "@/components/reunioes/Reunioes";
import { DEMO_AGENTES, DEMO_DEMANDAS, demoFalas, demoReunioes } from "@/lib/escritorio/demo";
import type { Agente } from "@/lib/dados";

export const dynamic = "force-dynamic";

// Detalhe de uma reunião fictícia, sem login. Só existe em desenvolvimento.
export default async function DemoReuniao({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aba?: string; assistir?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { id } = await params;
  const q = await searchParams;
  const base = Date.now();
  const r = demoReunioes(base).find((x) => x.id === Number(id));
  if (!r) notFound();
  const agentes = new Map<string, Agente>(DEMO_AGENTES.map((a) => [a.id, a]));
  const demanda = DEMO_DEMANDAS.find((d) => d.id === r.demanda_id) ?? null;
  return (
    <>
      <header className="sticky top-0 z-10 h-[57px] border-b border-line bg-card px-4 py-4 text-[15px] font-semibold">
        Gestor.IA <span className="font-normal text-muted">· reunião (demonstração com dados fictícios)</span>
      </header>
      <DetalheReuniao r={r} agentes={agentes} base="/reunioes/demo"
        vinculos={{ demanda, documento: r.documento_id ? { id: r.documento_id, titulo: "Ata: Alinhamento da semana" } : null }}
        linkDemanda="/reunioes/demo" linkDocumento={() => "/reunioes/demo"}
        falas={demoFalas(r.id, base)} modo="demo" demoBase={base}
        aba={q.aba === "resumo" ? "resumo" : q.aba === "conversa" ? "conversa" : undefined} assistir={q.assistir === "1"} />
    </>
  );
}
