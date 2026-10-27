import Link from "next/link";
import { Topo, SemAcesso } from "@/components/Topo";
import { autorizado, cadastros, haQuanto, type Documento } from "@/lib/dados";
import { supabaseServidor } from "@/lib/supabase/server";
import { corDa } from "@/lib/cores";

export const dynamic = "force-dynamic";

export default async function Arquivo() {
  if (!(await autorizado())) return <SemAcesso />;
  const sb = await supabaseServidor();
  const [{ setores }, docs, pend] = await Promise.all([
    cadastros(),
    sb.from("central_documentos").select("id, setor, agente, rotina, titulo, tipo, data_ref, criado_em").order("criado_em", { ascending: false }),
    sb.from("central_demandas").select("id", { count: "exact", head: true }).eq("estado", "aguardando-rafael"),
  ]);
  const documentos = (docs.data ?? []) as Documento[];

  return (
    <>
      <Topo aba="arquivo" pendentes={pend.count ?? 0} />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <p className="mb-5 text-sm text-muted">
          Tudo o que os agentes entregam fica na prateleira do setor: relatórios, rascunhos e PDFs, do mais novo para o mais antigo.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {setores.map((s) => {
            const meus = documentos.filter((d) => d.setor === s.id);
            return (
              <Link key={s.id} href={`/arquivo/${s.id}`}
                className="group rounded-xl border border-line bg-card p-4 transition hover:border-accent">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-semibold">{s.nome}</h2>
                  <span className="text-sm tabular-nums text-muted">{meus.length}</span>
                </div>
                <p className="mb-3 text-xs text-muted">{s.descricao}</p>
                <div className="flex h-16 items-end gap-[3px] border-b-4 border-line px-1" aria-hidden>
                  {meus.slice(0, 28).map((d, i) => (
                    <span key={d.id} className="w-2.5 rounded-t-sm"
                      style={{ background: corDa(d.rotina), height: `${70 + ((i * 37) % 30)}%` }} />
                  ))}
                  {meus.length === 0 && <span className="pb-1 text-xs text-muted">Prateleira vazia</span>}
                </div>
                <ul className="mt-3 space-y-1 text-sm">
                  {meus.slice(0, 3).map((d) => (
                    <li key={d.id} className="truncate">
                      <span className="mr-1.5 inline-block size-2 rounded-full" style={{ background: corDa(d.rotina) }} />
                      {d.titulo} <span className="text-xs text-muted">· {haQuanto(d.criado_em)}</span>
                    </li>
                  ))}
                </ul>
              </Link>
            );
          })}
        </div>
      </main>
    </>
  );
}
