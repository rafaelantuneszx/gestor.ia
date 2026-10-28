// Voz real das falas (ElevenLabs). GET diz se está ligada; POST { agente, texto } devolve o MP3 da fala.
// Só para quem está na allowlist do Gestor.IA: cada fala gasta créditos da conta da ElevenLabs.
import { NextResponse } from "next/server";
import { supabaseServidor } from "@/lib/supabase/server";
import { agentesComVozReal, sintetizar, vozesReaisLigadas } from "@/lib/vozes-reais";

export const maxDuration = 30;

async function autorizado() {
  const sb = await supabaseServidor();
  const { data } = await sb.rpc("central_autorizado");
  return data === true;
}

export async function GET() {
  if (!(await autorizado())) return NextResponse.json({ ativo: false }, { status: 401 });
  return NextResponse.json({ ativo: vozesReaisLigadas(), agentes: vozesReaisLigadas() ? agentesComVozReal() : [] });
}

export async function POST(req: Request) {
  if (!(await autorizado())) return NextResponse.json({ erro: "sem acesso" }, { status: 401 });
  if (!vozesReaisLigadas()) return NextResponse.json({ erro: "vozes reais desligadas" }, { status: 404 });
  const corpo = (await req.json().catch(() => null)) as { agente?: string; texto?: string } | null;
  const agente = String(corpo?.agente ?? "");
  const texto = String(corpo?.texto ?? "").replace(/\s+/g, " ").trim().slice(0, 1200);
  if (!agente || !texto) return NextResponse.json({ erro: "agente e texto são obrigatórios" }, { status: 400 });
  try {
    const audio = await sintetizar(agente, texto);
    return new Response(audio, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=86400" } });
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : "falha na voz" }, { status: 502 });
  }
}
