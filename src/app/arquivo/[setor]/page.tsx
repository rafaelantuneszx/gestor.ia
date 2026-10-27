import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, FileText } from "lucide-react";
import { Topo, SemAcesso } from "@/components/Topo";
import { autorizado, cadastros, nomeDe, quando, type Documento } from "@/lib/dados";
import { supabaseServidor } from "@/lib/supabase/server";
import { corDa } from "@/lib/cores";

export const dynamic = "force-dynamic";

const MES = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });
const TIPO = { relatorio: "Relatório", pdf: "PDF", rascunho: "Rascunho", outro: "Documento" } as const;

export default async function Prateleira({ params }: { params: Promise<{ setor: string }> }) {
  const { setor } = await params;
  if (!(await autorizado())) return <SemAcesso />;
  const sb = await supabaseServidor();
  const [{ setores, agentes }, docs, pend] = await Promise.all([
    cadastros(),
    sb.from("central_documentos").select("id, setor, agente, rotina, titulo, tipo, data_ref, criado_em")
      .eq("setor", setor).order("criado_em", { ascending: false }),
    sb.from("central_demandas").select("id", { count: "exact", head: true }).eq("estado", "aguardando-rafael"),
  ]);
  const s = setores.find((x) => x.id === setor);
  if (!s) notFound();
  const documentos = (docs.data ?? []) as Documento[];
  const porMes = new Map<string, Documento[]>();
  for (const d of documentos) {
    const chave = MES.format(new Date(d.data_ref ? `${d.data_ref}T12:00:00` : d.criado_em));
    porMes.set(chave, [...(porMes.get(chave) ?? []), d]);
  }

  return (
    <>
      <Topo aba="arquivo" pendentes={pend.count ?? 0} />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <Link href="/arquivo" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-text">
          <ChevronLeft size={16} /> Arquivo
        </Link>
        <h1 className="text-xl font-semibold">{s.nome}</h1>
        <p className="mb-6 text-sm text-muted">{s.descricao}</p>
        {documentos.length === 0 && <p className="text-muted">Nada nesta prateleira ainda.</p>}
        {[...porMes.entries()].map(([mes, lista]) => (
          <section key={mes} className="mb-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{mes}</h2>
            <ul className="divide-y divide-line rounded-xl border border-line bg-card">
              {lista.map((d) => (
                <li key={d.id}>
                  <Link href={`/documento/${d.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-bg">
                    <span className="h-8 w-1.5 rounded-sm" style={{ background: corDa(d.rotina) }} />
                    <FileText size={18} className="text-muted" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{d.titulo}</span>
                      <span className="block text-xs text-muted">
                        {TIPO[d.tipo]} · {d.agente ? nomeDe(agentes, d.agente) : "—"} · {quando(d.criado_em)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </>
  );
}
