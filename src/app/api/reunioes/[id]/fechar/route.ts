// O Rafael encerra a reunião pela tela; a ata leva a conversa registrada (RPC central_reuniao_fechar).
import { NextResponse } from "next/server";
import { supabaseServidor } from "@/lib/supabase/server";
import { CAMPOS_EVENTO, falaDoEvento, type Fala } from "@/lib/falas";
import { ataDaConversa } from "@/lib/ia/reuniao";
import { explicarErro } from "@/lib/ia/erros";
import type { Reuniao } from "@/lib/reunioes";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ erro: "reunião inválida" }, { status: 400 });
  const sb = await supabaseServidor();
  const [reu, ev, ag] = await Promise.all([
    sb.from("central_reunioes").select("*").eq("id", Number(id)).maybeSingle(),
    sb.from("central_eventos").select(CAMPOS_EVENTO).eq("rotina", `reuniao#${id}`).eq("tipo", "nota").order("id").limit(2000),
    sb.from("central_agentes").select("id, nome"),
  ]);
  const r = reu.data as Reuniao | null;
  if (!r) return NextResponse.json({ erro: "reunião não encontrada" }, { status: 404 });
  const nomes = new Map(((ag.data ?? []) as { id: string; nome: string }[]).map((a) => [a.id, a.nome]));
  const falas = ((ev.data ?? []) as Parameters<typeof falaDoEvento>[0][]).map(falaDoEvento).filter((f): f is Fala => !!f);
  const ata = r.ata ?? ataDaConversa(r, falas, (x) => (x === "rafael" ? "Rafael" : nomes.get(x) ?? x));
  const { error } = await sb.rpc("central_reuniao_fechar", { p_id: r.id, p_ata: ata });
  if (error) return NextResponse.json({ erro: explicarErro(error.message) }, { status: 400 });
  return NextResponse.json({ ok: true });
}
