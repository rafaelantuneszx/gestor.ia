// O Rafael fala na reunião: grava a fala dele (RPC central_reuniao_falar), pede ao Claude as respostas dos
// participantes e grava cada uma pela mesma RPC. A tela também pega as falas pelo polling de 1,5 s.
// Sem texto: só gera a abertura da reunião (quem conduz cumprimenta).
import { NextResponse } from "next/server";
import { supabaseServidor } from "@/lib/supabase/server";
import { CAMPOS_EVENTO, falaDoEvento, type Fala } from "@/lib/falas";
import { gerarRespostas } from "@/lib/ia/reuniao";
import { explicarErro } from "@/lib/ia/erros";
import type { Reuniao } from "@/lib/reunioes";

export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ erro: "reunião inválida" }, { status: 400 });
  const corpo = (await req.json().catch(() => null)) as { texto?: string } | null;
  const texto = String(corpo?.texto ?? "").trim().slice(0, 2000);

  const sb = await supabaseServidor();
  const { data: r } = await sb.from("central_reunioes").select("*").eq("id", Number(id)).maybeSingle();
  if (!r) return NextResponse.json({ erro: "reunião não encontrada" }, { status: 404 });
  const reuniao = r as Reuniao;
  if (reuniao.estado === "encerrada" || reuniao.estado === "cancelada") {
    return NextResponse.json({ erro: `a reunião já está ${reuniao.estado}` }, { status: 409 });
  }

  const ids: number[] = [];
  if (texto) {
    const { data, error } = await sb.rpc("central_reuniao_falar", { p_reuniao_id: reuniao.id, p_agente: "rafael", p_texto: texto });
    if (error) return NextResponse.json({ erro: explicarErro(error.message) }, { status: 400 });
    ids.push(Number(data));
  }

  const ia = await gerarRespostas(sb, reuniao, texto || null);
  let aviso: string | null = null;
  if (ia.ok) {
    for (const f of ia.falas) {
      const { data, error } = await sb.rpc("central_reuniao_falar", { p_reuniao_id: reuniao.id, p_agente: f.agente, p_texto: f.texto });
      if (error) {
        aviso = explicarErro(error.message);
        break;
      }
      ids.push(Number(data));
    }
  } else {
    aviso = ia.mensagem;
  }

  let falas: Fala[] = [];
  if (ids.length) {
    const ev = await sb.from("central_eventos").select(CAMPOS_EVENTO).in("id", ids).order("id");
    falas = ((ev.data ?? []) as Parameters<typeof falaDoEvento>[0][]).map(falaDoEvento).filter((f): f is Fala => !!f);
  }
  return NextResponse.json({ falas, aviso, semChave: !ia.ok && ia.motivo === "sem-chave" });
}
