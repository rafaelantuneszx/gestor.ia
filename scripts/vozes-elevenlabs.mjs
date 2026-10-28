// Escolhe uma voz humana em português do Brasil da biblioteca da ElevenLabs para cada agente, adiciona as vozes à
// conta do Rafael e grava o mapa em src/lib/vozes-reais.json (ids de voz não são segredo; a chave não é gravada).
//
//   ELEVENLABS_API_KEY=... node scripts/vozes-elevenlabs.mjs            escolhe e grava
//   ELEVENLABS_API_KEY=... node scripts/vozes-elevenlabs.mjs --listar   só mostra as opções, com o link da amostra
//
// Para trocar a voz de alguém: rode de novo com --trocar <agente> (pega a próxima opção da lista) ou escolha à mão com
// --usar agente=<voice_id da biblioteca>[,agente=<voice_id>...]. Uma escolha que o plano não libera fica em "desejada"
// no JSON e é aplicada na próxima rodada.
import { readFileSync, writeFileSync } from "node:fs";

const CHAVE = process.env.ELEVENLABS_API_KEY;
if (!CHAVE) {
  console.error("falta ELEVENLABS_API_KEY no ambiente");
  process.exit(1);
}
const API = "https://api.elevenlabs.io/v1";
const ARQUIVO = new URL("../src/lib/vozes-reais.json", import.meta.url);

// id, nome, gênero (o mesmo de VOZ_GENERO em src/lib/pessoas.ts) e idade preferida da voz
const AGENTES = [
  ["helena", "Helena", "female", "middle_aged"],
  ["ricardo-diretor-sistemas", "Ricardo", "male", "middle_aged"],
  ["lucia-financeiro", "Lúcia", "female", "middle_aged"],
  ["otavio-pavimax", "Otávio", "male", "middle_aged"],
  ["paulo-rh", "Paulo", "male", "middle_aged"],
  ["clara-assistente", "Clara", "female", "young"],
  ["marina-custos", "Marina", "female", "young"],
  ["bruno-financeiro", "Bruno", "male", "young"],
  ["sofia-adm-rh-frota", "Sofia", "female", "young"],
  ["caio-suprimentos", "Caio", "male", "young"],
  ["davi-faturas", "Davi", "male", "young"],
  ["igor-folha-financeiro", "Igor", "male", "young"],
  ["beatriz-fiscal", "Beatriz", "female", "young"],
  ["henrique-analise-custos", "Henrique", "male", "middle_aged"],
  ["laura-calculos-custos", "Laura", "female", "young"],
  ["rafael", "Rafael", "male", "middle_aged"],
];

async function api(caminho, opcoes = {}) {
  const r = await fetch(API + caminho, {
    ...opcoes,
    headers: { "xi-api-key": CHAVE, "Content-Type": "application/json", ...(opcoes.headers ?? {}) },
  });
  const texto = await r.text();
  if (!r.ok) throw new Error(`${caminho} → ${r.status} ${texto.slice(0, 300)}`);
  return texto ? JSON.parse(texto) : {};
}

const brasileira = (v) =>
  /brazil|brasil/i.test(`${v.accent ?? ""} ${v.locale ?? ""} ${v.description ?? ""}`) || /pt-BR/i.test(v.locale ?? "");

async function opcoes(genero) {
  const todas = [];
  for (let page = 0; page < 3; page++) {
    const q = new URLSearchParams({ language: "pt", gender: genero, page_size: "100", sort: "usage_character_count_1y", page: String(page) });
    const j = await api(`/shared-voices?${q}`);
    todas.push(...(j.voices ?? []));
    if (!j.has_more) break;
  }
  const br = todas.filter(brasileira);
  // vozes de conversa e narração primeiro (soam como gente falando numa reunião)
  const peso = (v) => (/conversational|social|narrative|informative|characters/i.test(v.use_case ?? "") ? 0 : 1);
  return br.sort((a, b) => peso(a) - peso(b));
}

const args = process.argv.slice(2);
const listar = args.includes("--listar");
const trocar = args.includes("--trocar") ? args[args.indexOf("--trocar") + 1] : null;
const usar = Object.fromEntries((args.includes("--usar") ? args[args.indexOf("--usar") + 1] : "")
  .split(",").filter(Boolean).map((par) => par.split("=")));

const atual = JSON.parse(readFileSync(ARQUIVO, "utf8"));
const porGenero = { female: await opcoes("female"), male: await opcoes("male") };

if (listar) {
  for (const [g, lista] of Object.entries(porGenero)) {
    console.log(`\n${g === "female" ? "Femininas" : "Masculinas"} (${lista.length}):`);
    lista.slice(0, 25).forEach((v, i) =>
      console.log(`${String(i + 1).padStart(2)}. ${v.name} · ${v.age ?? "?"} · ${v.use_case ?? "?"} · ${v.voice_id} · ${v.preview_url}`));
  }
  process.exit(0);
}

const usadas = new Set(Object.values(atual).map((v) => v.origem));
const bloqueadas = new Set(); // vozes que o plano atual não libera
const minhas = (await api("/voices")).voices ?? [];
const novo = { ...atual };
// escolhas que o plano grátis bloqueou ("desejada"): tenta de novo, agora que o plano pode ter mudado
for (const [id, nome] of AGENTES) {
  const d = novo[id]?.desejada;
  if (!d) continue;
  try {
    const r = await api(`/voices/add/${d.public_owner_id}/${d.origem}`, { method: "POST", body: JSON.stringify({ new_name: `GIA ${nome} 2` }) });
    novo[id] = { voice_id: r.voice_id, nome: d.nome, origem: d.origem, preview_url: d.preview_url };
    console.log(`${nome.padEnd(9)} → ${d.nome} (escolha pendente aplicada)`);
  } catch (e) {
    console.log(`${nome.padEnd(9)} → ${d.nome} ainda bloqueada: ${String(e).slice(0, 120)}`);
  }
}
for (const [id, nome, genero, idade] of AGENTES) {
  const escolhida = usar[id];
  if (novo[id] && id !== trocar && !escolhida) continue;
  const rotulo = `GIA ${nome}`;
  const existente = minhas.find((m) => m.name === rotulo);
  const lista = porGenero[genero];
  // já adicionada numa rodada anterior: reaproveita (a não ser que seja para trocar)
  if (existente && id !== trocar) {
    const origem = lista.find((x) => x.voice_id === escolhida) ?? lista.find((x) => x.name && existente.name === rotulo && x.voice_id === novo[id]?.origem);
    novo[id] = { voice_id: existente.voice_id, nome: origem?.name ?? novo[id]?.nome ?? rotulo, origem: origem?.voice_id ?? novo[id]?.origem ?? "", preview_url: origem?.preview_url ?? novo[id]?.preview_url };
    if (origem) usadas.add(origem.voice_id);
    console.log(`${nome.padEnd(9)} → ${novo[id].nome} (já estava na conta)`);
    writeFileSync(ARQUIVO, JSON.stringify(novo, null, 2) + "\n");
    continue;
  }
  const livres = (x) => !usadas.has(x.voice_id) && !bloqueadas.has(x.voice_id);
  const candidatas = [
    ...lista.filter((x) => x.voice_id === escolhida),
    ...lista.filter((x) => livres(x) && x.age === idade),
    ...lista.filter((x) => livres(x) && x.age !== idade),
  ];
  let feito = false;
  for (const v of candidatas.slice(0, 15)) {
    try {
      const voiceId = (await api(`/voices/add/${v.public_owner_id}/${v.voice_id}`, { method: "POST", body: JSON.stringify({ new_name: rotulo }) })).voice_id;
      usadas.add(v.voice_id);
      novo[id] = { voice_id: voiceId, nome: v.name, origem: v.voice_id, preview_url: v.preview_url };
      console.log(`${nome.padEnd(9)} → ${v.name} (${v.age ?? "?"}, ${v.accent ?? "?"})${v.voice_id === escolhida || !escolhida ? "" : " [substituta]"}  amostra: ${v.preview_url}`);
      writeFileSync(ARQUIVO, JSON.stringify(novo, null, 2) + "\n");
      feito = true;
      break;
    } catch (e) {
      bloqueadas.add(v.voice_id);
      if (!/paid_plan_required|free_users_not_allowed/.test(String(e))) console.log(`  ${v.name}: ${String(e).slice(0, 160)}`);
    }
  }
  if (!feito) console.log(`${nome.padEnd(9)} → sem voz liberada no plano atual`);
}
writeFileSync(ARQUIVO, JSON.stringify(novo, null, 2) + "\n");
console.log(`\nmapa gravado em src/lib/vozes-reais.json (${Object.keys(novo).length} agentes)`);
