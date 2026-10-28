// O Rafael convoca uma reunião pela tela: cria em andamento, com ele como quem convocou (RPC central_reuniao_abrir).
import { NextResponse } from "next/server";
import { supabaseServidor } from "@/lib/supabase/server";
import { explicarErro } from "@/lib/ia/erros";

export async function POST(req: Request) {
  const corpo = (await req.json().catch(() => null)) as { titulo?: string; participantes?: string[]; pauta?: string[] } | null;
  const titulo = String(corpo?.titulo ?? "").trim();
  const participantes = Array.isArray(corpo?.participantes) ? corpo!.participantes.map(String).slice(0, 15) : [];
  const pauta = (Array.isArray(corpo?.pauta) ? corpo!.pauta : []).map((t) => String(t).trim()).filter(Boolean).slice(0, 12)
    .map((texto) => ({ texto: texto.slice(0, 300) }));
  if (!titulo) return NextResponse.json({ erro: "Informe o título da reunião." }, { status: 400 });
  if (participantes.length === 0) return NextResponse.json({ erro: "Escolha ao menos um participante." }, { status: 400 });

  const sb = await supabaseServidor();
  const { data, error } = await sb.rpc("central_reuniao_abrir", { p_titulo: titulo.slice(0, 200), p_participantes: participantes, p_pauta: pauta });
  if (error) return NextResponse.json({ erro: explicarErro(error.message) }, { status: 400 });
  return NextResponse.json({ id: Number(data) });
}
