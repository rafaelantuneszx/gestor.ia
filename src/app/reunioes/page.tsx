import { Topo, SemAcesso } from "@/components/Topo";
import { SecoesEscritorio } from "@/components/SecoesEscritorio";
import { ListaReunioes } from "@/components/reunioes/Reunioes";
import { autorizado, cadastros } from "@/lib/dados";
import type { Reuniao } from "@/lib/reunioes";
import { supabaseServidor } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Reunioes() {
  if (!(await autorizado())) return <SemAcesso />;
  const sb = await supabaseServidor();
  const [{ agentes }, reu] = await Promise.all([
    cadastros(),
    sb.from("central_reunioes").select("*").order("id", { ascending: false }).limit(200),
  ]);
  const reunioes = (reu.data ?? []) as Reuniao[];

  // Quantas falas cada reunião tem (eventos "fala: ..." com rotina reuniao#<id>).
  const falas: Record<number, number> = {};
  if (reunioes.length) {
    const ev = await sb.from("central_eventos").select("rotina").eq("tipo", "nota").like("resumo", "fala:%")
      .in("rotina", reunioes.map((r) => `reuniao#${r.id}`)).limit(20000);
    for (const e of (ev.data ?? []) as { rotina: string }[]) {
      const id = Number(e.rotina.slice(8));
      falas[id] = (falas[id] ?? 0) + 1;
    }
  }

  return (
    <>
      <Topo aba="escritorio" />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <SecoesEscritorio atual="reunioes" className="mb-4" />
        <h1 className="ios-titulo mb-3">Reuniões</h1>
        {reu.error && (
          <p className="mb-5 rounded-xl border border-bad/40 bg-bad-soft px-4 py-3 text-sm text-bad">
            Não foi possível ler as reuniões ({reu.error.message}).
          </p>
        )}
        <ListaReunioes reunioes={reunioes} agentes={agentes} base="/reunioes" falas={falas} />
      </main>
    </>
  );
}
