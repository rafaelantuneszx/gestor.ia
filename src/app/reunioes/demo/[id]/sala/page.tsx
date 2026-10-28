import { notFound } from "next/navigation";
import { pessoasDe } from "@/components/reunioes/Reunioes";
import { SalaMeeting } from "@/components/reunioes/SalaMeeting";
import { DEMO_AGENTES, demoFalas, demoReunioes } from "@/lib/escritorio/demo";
import type { Agente } from "@/lib/dados";
import { itensPauta } from "@/lib/reunioes";
import { PADRAO_REUNIAO_RAFAEL } from "@/lib/pessoas";

export const dynamic = "force-dynamic";

// Sala de reunião da demonstração (sem login, sem banco, respostas fixas). "nova" = reunião convocada na demo.
export default async function DemoSala({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ titulo?: string; p?: string; pauta?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { id } = await params;
  const q = await searchParams;
  const base = Date.now();
  const agentes = new Map<string, Agente>(DEMO_AGENTES.map((a) => [a.id, a]));
  const pessoas = pessoasDe(agentes);
  if (id === "nova") {
    const part = (q.p?.split(",") ?? PADRAO_REUNIAO_RAFAEL).filter((x) => agentes.has(x));
    return (
      <SalaMeeting modo="demo" demoBase={base} voltar="/reunioes/demo" pessoas={pessoas} falasIniciais={[]}
        reuniao={{ id: 99, titulo: q.titulo || "Reunião com o Rafael", estado: "em_andamento", convocada_por: "rafael",
          participantes: part, pauta: (q.pauta ?? "").split("|").filter(Boolean), iniciada_em: new Date(base).toISOString() }} />
    );
  }
  const r = demoReunioes(base).find((x) => x.id === Number(id));
  if (!r) notFound();
  return (
    <SalaMeeting modo="demo" demoBase={base} voltar={`/reunioes/demo/${r.id}`} pessoas={pessoas} falasIniciais={demoFalas(r.id, base)}
      reuniao={{ id: r.id, titulo: r.titulo, estado: r.estado, convocada_por: r.convocada_por, participantes: r.participantes,
        pauta: itensPauta(r), iniciada_em: r.iniciada_em }} />
  );
}
