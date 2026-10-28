// Vozes das falas (Web Speech API, speechSynthesis). Só roda no navegador.
// Cada agente ganha uma voz pt-BR do navegador, feminina ou masculina pela tabela VOZ_GENERO, e um tom (pitch) e
// ritmo (rate) próprios, sempre os mesmos para o mesmo id. Quando o navegador só tem vozes de um tipo, o tom
// muda para diferenciar (mais grave para os homens, mais agudo para as mulheres).
import { VOZ_GENERO, type Genero } from "./pessoas";

export type PerfilVoz = { voz: SpeechSynthesisVoice | null; pitch: number; rate: number; genero: Genero | null; casou: boolean };

// Nomes de vozes conhecidas por gênero (macOS/iOS, Windows/Edge, Chrome, Android). Comparação sem acento e em minúsculas.
const FEMININAS = [
  "luciana", "francisca", "thalita", "maria", "vitoria", "vitória", "fernanda", "joana", "catarina", "raquel", "brenda",
  "elza", "giovanna", "leila", "leticia", "manuela", "yara", "camila", "flo", "sandy", "shelley", "grandma", "google português",
  "female", "feminina", "mulher",
];
const MASCULINAS = [
  "felipe", "antonio", "antônio", "daniel", "joaquim", "duarte", "donato", "fabio", "fábio", "humberto", "julio", "júlio",
  "nicolau", "valerio", "valério", "eddy", "reed", "rocko", "grandpa", "ricardo", "male", "masculina", "homem",
];

const sem = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function generoDaVoz(v: SpeechSynthesisVoice): Genero | null {
  const n = sem(v.name);
  if (MASCULINAS.some((x) => n.includes(sem(x)))) return "m";
  if (FEMININAS.some((x) => n.includes(sem(x)))) return "f";
  return null;
}

export function hash(id: string) {
  let h = 2166136261;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h;
}

export function temVoz() {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

// Vozes em português, pt-BR primeiro. Espera a lista carregar (no Chrome ela chega depois).
export function carregarVozes(): Promise<SpeechSynthesisVoice[]> {
  if (!temVoz()) return Promise.resolve([]);
  const filtrar = () => {
    const todas = window.speechSynthesis.getVoices();
    const pt = todas.filter((v) => v.lang?.toLowerCase().startsWith("pt"));
    return pt.sort((a, b) => Number(b.lang.toLowerCase() === "pt-br") - Number(a.lang.toLowerCase() === "pt-br"));
  };
  const ja = filtrar();
  if (ja.length) return Promise.resolve(ja);
  return new Promise((resolve) => {
    const fim = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", fim);
      resolve(filtrar());
    };
    window.speechSynthesis.addEventListener("voiceschanged", fim);
    setTimeout(fim, 1500);
  });
}

// Distribui as vozes entre os participantes de uma reunião: dentro do mesmo gênero, vozes diferentes para pessoas
// diferentes enquanto houver; a ordem é por id, então a distribuição é sempre a mesma.
export function perfisDeVoz(ids: string[], vozes: SpeechSynthesisVoice[]): Record<string, PerfilVoz> {
  const brasil = vozes.filter((v) => v.lang.toLowerCase() === "pt-br");
  const base = brasil.length ? brasil : vozes;
  const porGenero: Record<Genero, SpeechSynthesisVoice[]> = {
    f: base.filter((v) => generoDaVoz(v) === "f"),
    m: base.filter((v) => generoDaVoz(v) === "m"),
  };
  const neutras = base.filter((v) => generoDaVoz(v) === null);
  const usados: Record<string, number> = {};
  const out: Record<string, PerfilVoz> = {};
  for (const id of [...new Set(ids)].sort()) {
    const h = hash(id);
    const genero = VOZ_GENERO[id] ?? null;
    let lista = genero ? porGenero[genero] : base;
    let casou = !!genero && lista.length > 0;
    if (!lista.length) lista = genero ? [...neutras, ...base] : base;
    if (!lista.length) lista = [];
    const chave = genero ?? "x";
    const k = usados[chave] ?? 0;
    usados[chave] = k + 1;
    const voz = lista.length ? lista[(h + k) % lista.length] : null;
    if (voz && genero && !casou) casou = generoDaVoz(voz) === genero;
    // tom e ritmo próprios: variação pequena e fixa por id; sem voz do gênero certo, o tom compensa
    let pitch = 0.92 + ((h >>> 3) % 17) / 100; // 0,92 a 1,08
    const rate = 0.96 + ((h >>> 9) % 11) / 100; // 0,96 a 1,06
    if (genero && !casou) pitch = genero === "m" ? 0.72 + ((h >>> 5) % 8) / 100 : 1.22 + ((h >>> 5) % 10) / 100;
    out[id] = { voz, pitch, rate, genero, casou };
  }
  return out;
}

export function nomeCurtoVoz(v: SpeechSynthesisVoice | null) {
  if (!v) return "voz padrão";
  return v.name.replace(/^(Microsoft|Google)\s+/i, "").replace(/\s*\(.*\)\s*$/, "").replace(/\s+-\s+.*$/, "");
}
