// Navegador: pede ao servidor o áudio de cada fala com a voz real do agente (ElevenLabs, rota /api/voz) e guarda
// os últimos áudios em memória, para não pagar duas vezes pela mesma fala ao voltar ou repetir.

let ligadas: Promise<Set<string>> | null = null;

// Agentes com voz real (vazio quando a chave ou o mapa de vozes não estão configurados).
export function agentesComVozReal(): Promise<Set<string>> {
  ligadas ??= fetch("/api/voz", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : { ativo: false }))
    .then((j: { ativo?: boolean; agentes?: string[] }) => new Set(j.ativo ? j.agentes ?? [] : []))
    .catch(() => new Set<string>());
  return ligadas;
}

const MAX = 80;
const cache = new Map<string, Promise<string>>();

export function audioDaFala(agente: string, texto: string): Promise<string> {
  const chave = `${agente}|${texto}`;
  const pronto = cache.get(chave);
  if (pronto) return pronto;
  const p = fetch("/api/voz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agente, texto }),
  }).then(async (r) => {
    if (!r.ok) throw new Error((await r.json().catch(() => null))?.erro ?? `voz ${r.status}`);
    return URL.createObjectURL(await r.blob());
  });
  p.catch(() => cache.delete(chave));
  cache.set(chave, p);
  while (cache.size > MAX) {
    const [velha, url] = cache.entries().next().value as [string, Promise<string>];
    cache.delete(velha);
    url.then((u) => URL.revokeObjectURL(u)).catch(() => {});
  }
  return p;
}
