import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronLeft } from "lucide-react";
import { Topo, SemAcesso } from "@/components/Topo";
import { autorizado, cadastros, nomeDe, quando, type Documento } from "@/lib/dados";
import { supabaseServidor } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function VerDocumento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await autorizado())) return <SemAcesso />;
  const sb = await supabaseServidor();
  const [{ setores, agentes }, doc, pend] = await Promise.all([
    cadastros(),
    sb.from("central_documentos").select("*").eq("id", id).maybeSingle(),
    sb.from("central_demandas").select("id", { count: "exact", head: true }).eq("estado", "aguardando-rafael"),
  ]);
  const d = doc.data as Documento | null;
  if (!d) notFound();
  const setor = setores.find((s) => s.id === d.setor);

  // PDF guardado no Storage: link assinado de 10 minutos, aberto no próprio visualizador do navegador.
  let pdf: string | null = null;
  if (d.storage_path) {
    const { data } = await sb.storage.from("central-arquivo").createSignedUrl(d.storage_path, 600);
    pdf = data?.signedUrl ?? null;
  }

  return (
    <>
      <Topo aba="arquivo" pendentes={pend.count ?? 0} />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <Link href={`/arquivo/${d.setor}`} className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-text">
          <ChevronLeft size={16} /> {setor?.nome ?? "Arquivo"}
        </Link>
        <h1 className="text-xl font-semibold">{d.titulo}</h1>
        <p className="mb-5 text-sm text-muted">
          {d.agente ? nomeDe(agentes, d.agente) : "—"} · {quando(d.criado_em)}
          {d.rotina ? ` · rotina ${d.rotina}` : ""}
        </p>
        {pdf && (
          <iframe src={pdf} title={d.titulo} className="mb-6 h-[80vh] w-full rounded-xl border border-line bg-card" />
        )}
        {d.storage_path && !pdf && <p className="mb-6 text-sm text-bad">Não foi possível abrir o arquivo anexado.</p>}
        {d.conteudo_md && (
          <article className="md rounded-xl border border-line bg-card p-5 text-[15px]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{d.conteudo_md}</ReactMarkdown>
          </article>
        )}
      </main>
    </>
  );
}
