// Vozes reais (ElevenLabs) de cada agente. Só roda no servidor: a chave ELEVENLABS_API_KEY fica na Vercel.
// O mapa agente → voz está em vozes-reais.json, gerado por scripts/vozes-elevenlabs.mjs (ids de voz não são
// segredo). Agente sem voz no mapa, ou sem a chave, continua com a voz do navegador.
import { ID_GESTOR } from "@/lib/banco";
import VOZES from "./vozes-reais.json";

export type VozReal = { voice_id: string; nome: string; preview_url?: string };

const MAPA = VOZES as Record<string, VozReal>;
// No mapa de vozes, o gestor fica com a chave neutra; no banco, o id é o legado.
const chaveDe = (agente: string) => (agente === ID_GESTOR ? "gestor" : agente);

export function vozReal(agente: string): VozReal | null {
  return MAPA[chaveDe(agente)] ?? null;
}

export function vozesReaisLigadas(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY) && Object.keys(MAPA).length > 0;
}

export function agentesComVozReal(): string[] {
  return Object.keys(MAPA).map((k) => (k === "gestor" ? ID_GESTOR : k));
}

// Fala → áudio MP3. Lança erro com a mensagem da ElevenLabs quando falha (cota, chave inválida, voz removida).
export async function sintetizar(agente: string, texto: string): Promise<ArrayBuffer> {
  const chave = process.env.ELEVENLABS_API_KEY;
  const voz = vozReal(agente);
  if (!chave || !voz) throw new Error("voz real desligada para este agente");
  const modelo = process.env.ELEVENLABS_MODELO || "eleven_multilingual_v2";
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voz.voice_id)}?output_format=mp3_44100_64`, {
    method: "POST",
    headers: { "xi-api-key": chave, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({
      text: texto,
      model_id: modelo,
      voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true, speed: 1 },
    }),
    cache: "no-store",
  });
  if (!r.ok) {
    const corpo = await r.text().catch(() => "");
    throw new Error(`ElevenLabs ${r.status}: ${corpo.slice(0, 200)}`);
  }
  return r.arrayBuffer();
}
