"use client";

// A infra, o subsolo do escritório: um diagrama como o da rede elétrica. A energia nasce embaixo e sobe até você.
// Tocar numa peça acende o que a alimenta e o que depende dela, e abre os detalhes. No celular, vira lista por camada.
import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, CircleAlert, Gauge, X, Zap } from "lucide-react";
import { SecoesEscritorio } from "@/components/SecoesEscritorio";
import { CAMADAS, LIGACOES, PECAS, paraSeCair, type CamadaId, type Peca } from "@/lib/infra/mapa";
import type { EstadoMedidor, Medidor, Medidores } from "@/lib/infra/medidores";

const COR: Record<EstadoMedidor | "descrito", string> = { ok: "#30d158", atencao: "#ff9f0a", parado: "#ff6961", descrito: "#6aa9f5" };
const NOME_ESTADO: Record<EstadoMedidor | "descrito", string> = { ok: "Funcionando", atencao: "Atenção", parado: "Parado", descrito: "Descrito" };

// ---------- desenho ----------
const LARGURA = 1400;
const MARGEM_ESQ = 168;
const PECA_W = 150;
const PECA_H = 66;
const FAIXA_H = 122; // altura de cada camada
const TOPO = 18;
const ORDEM: CamadaId[] = ["voce", "agentes", "memoria", "sistemas", "energia"];

type Pos = { x: number; y: number };

function calcularPosicoes() {
  const pos: Record<string, Pos> = {};
  ORDEM.forEach((c, f) => {
    const lista = PECAS.filter((p) => p.camada === c);
    const util = LARGURA - MARGEM_ESQ - 20;
    const passo = util / lista.length;
    lista.forEach((p, i) => {
      pos[p.id] = { x: MARGEM_ESQ + passo * i + (passo - PECA_W) / 2, y: TOPO + f * FAIXA_H + (FAIXA_H - PECA_H) / 2 };
    });
  });
  return pos;
}
const POS = calcularPosicoes();
const ALTURA = TOPO + ORDEM.length * FAIXA_H + 14;

// Linha reta com cantos arredondados, o mesmo vocabulário das trilhas da marca.
function caminho(pontos: [number, number][], r = 10) {
  let d = `M${pontos[0][0]} ${pontos[0][1]}`;
  for (let i = 1; i < pontos.length; i++) {
    const [x, y] = pontos[i];
    const [px, py] = pontos[i - 1];
    const prox = pontos[i + 1];
    if (!prox) { d += ` L${x} ${y}`; break; }
    const l1 = Math.hypot(x - px, y - py);
    const l2 = Math.hypot(prox[0] - x, prox[1] - y);
    const k = Math.min(r, l1 / 2, l2 / 2);
    if (k < 0.5) { d += ` L${x} ${y}`; continue; }
    const ax = x - ((x - px) / (l1 || 1)) * k;
    const ay = y - ((y - py) / (l1 || 1)) * k;
    const bx = x + ((prox[0] - x) / (l2 || 1)) * k;
    const by = y + ((prox[1] - y) / (l2 || 1)) * k;
    d += ` L${ax} ${ay} Q${x} ${y} ${bx} ${by}`;
  }
  return d;
}

// Rota da ligação: sai da peça, vai por um corredor entre as colunas e entra na outra peça.
function rota(de: string, para: string, n: number): string {
  const a = POS[de];
  const b = POS[para];
  const ax = a.x + PECA_W / 2;
  const bx = b.x + PECA_W / 2;
  const desvio = ((n % 7) - 3) * 5;
  if (a.y === b.y) {
    // na mesma camada: passa por cima das peças
    const y = a.y - 14 - (n % 3) * 4;
    return caminho([[ax, a.y], [ax, y], [bx, y], [bx, b.y]]);
  }
  const sobe = b.y < a.y;
  const inicioY = sobe ? a.y : a.y + PECA_H;
  const fimY = sobe ? b.y + PECA_H : b.y;
  const camadas = Math.round(Math.abs(a.y - b.y) / FAIXA_H);
  const meioIda = (sobe ? a.y - (FAIXA_H - PECA_H) / 2 : a.y + PECA_H + (FAIXA_H - PECA_H) / 2) + desvio;
  if (camadas <= 1) return caminho([[ax, inicioY], [ax, meioIda], [bx, meioIda], [bx, fimY]]);
  // várias camadas: sobe num corredor entre as peças para não passar por cima delas
  const entre = Math.abs(ax - bx) < 4 ? ax + PECA_W / 2 + 14 : (ax + bx) / 2;
  const corredor = corredorLivre(entre, a.y, b.y) + desvio;
  const meioVolta = (sobe ? b.y + PECA_H + (FAIXA_H - PECA_H) / 2 : b.y - (FAIXA_H - PECA_H) / 2) + desvio;
  return caminho([[ax, inicioY], [ax, meioIda], [corredor, meioIda], [corredor, meioVolta], [bx, meioVolta], [bx, fimY]]);
}

// Coluna em que a linha vertical não atravessa nenhuma peça das camadas do meio.
function corredorLivre(x: number, y1: number, y2: number) {
  const topo = Math.min(y1, y2);
  const base = Math.max(y1, y2);
  const doMeio = PECAS.map((p) => POS[p.id]).filter((q) => q.y > topo + 1 && q.y < base - 1);
  const bate = (cx: number) => doMeio.some((q) => cx > q.x - 8 && cx < q.x + PECA_W + 8);
  if (!bate(x)) return x;
  for (let d = 10; d < 260; d += 10) {
    if (!bate(x + d)) return x + d;
    if (!bate(x - d)) return x - d;
  }
  return x;
}

const cortar = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

function dividir(nome: string, max = 19): [string, string?] {
  if (nome.length <= max) return [nome];
  const corte = nome.lastIndexOf(" ", max);
  return corte > 0 ? [nome.slice(0, corte), cortar(nome.slice(corte + 1), max)] : [cortar(nome, max)];
}

// ---------- tela ----------
export function Infra({ medidores, demo = false }: { medidores: Medidores; demo?: boolean }) {
  const [sel, setSel] = useState<string | null>(null);
  const [foco, setFoco] = useState<string | null>(null);
  const [verDados, setVerDados] = useState(false);
  const ativo = sel ?? foco;

  const relacionadas = useMemo(() => {
    if (!ativo) return null;
    const recebe = LIGACOES.filter((l) => l.para === ativo).map((l) => l.de);
    const alimenta = LIGACOES.filter((l) => l.de === ativo).map((l) => l.para);
    return new Set([ativo, ...recebe, ...alimenta]);
  }, [ativo]);

  const peca = sel ? PECAS.find((p) => p.id === sel) ?? null : null;
  const medidas = Object.keys(medidores).length;
  const problema = PECAS.filter((p) => medidores[p.id] && medidores[p.id].estado !== "ok");

  return (
    <div className="tech-escuro min-h-[calc(100dvh-var(--altura-barras))] bg-noite pb-8">
      <main className="mx-auto max-w-[1500px] px-4 py-5">
        <div className="flex flex-wrap items-center gap-3">
          <SecoesEscritorio atual="infra" demo={demo} className="bg-white/5" />
          <Link href={demo ? "/escritorio/demo" : "/escritorio"} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm text-accent hover:bg-fill">
            <Building2 size={16} aria-hidden /> Subir para o escritório
          </Link>
          {demo && <span className="text-xs text-warn">Demonstração com dados fictícios</span>}
        </div>

        <header className="mt-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
          <div className="min-w-0">
            <h1 className="ios-titulo">Infra</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted">
              O subsolo do escritório: de onde vem a energia, onde fica a memória, como os agentes sabem o que fazer e o que para se uma peça cair.
            </p>
          </div>
          <Legenda />
        </header>

        <div className="mt-4 grid gap-2 md:grid-cols-2">
          <p className="flex items-start gap-2 rounded-xl bg-warn-soft px-3 py-2.5 text-sm">
            <CircleAlert size={16} className="mt-0.5 shrink-0 text-warn" aria-hidden />
            <span><b className="text-warn">Ponto único de falha.</b> Todos os agentes dependem de um notebook ligado, com internet e com o app do Claude aberto.</span>
          </p>
          <p className="flex items-start gap-2 rounded-xl bg-fill px-3 py-2.5 text-sm">
            <Gauge size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden />
            <span>
              <b className="gi-numero">{medidas} de {PECAS.length}</b> peças são medidas agora{problema.length > 0 ? `, ${problema.length === 1 ? "1 pede" : `${problema.length} pedem`} atenção` : ", todas funcionando"}. As outras estão descritas, porque o site não enxerga o notebook por dentro.
            </span>
          </p>
        </div>

        {/* diagrama em tela grande */}
        <div className="mt-4 hidden flex-wrap items-center gap-3 xl:flex">
          <div role="group" aria-label="Ligações no diagrama" className="ios-segmento bg-white/5">
            <button type="button" className="ios-segmento-item" data-ativo={!verDados} aria-pressed={!verDados} onClick={() => setVerDados(false)}>Só energia</button>
            <button type="button" className="ios-segmento-item" data-ativo={verDados} aria-pressed={verDados} onClick={() => setVerDados(true)}>Energia e dados</button>
          </div>
          <p className="text-xs text-muted">Toque numa peça para ver tudo o que liga nela: em branco o que ela recebe, em ciano o que ela alimenta.</p>
        </div>
        <div className="relative mt-2 hidden xl:block">
          <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} className="block h-auto w-full" role="group" aria-label="Diagrama da infra: a energia sobe da base até você">
            {ORDEM.map((c, f) => {
              const info = CAMADAS.find((x) => x.id === c)!;
              const y = TOPO + f * FAIXA_H;
              return (
                <g key={c}>
                  <rect x={0} y={y + 3} width={LARGURA} height={FAIXA_H - 6} rx={16} fill="#ffffff" fillOpacity={f % 2 ? 0.035 : 0.018} />
                  <text x={18} y={y + FAIXA_H / 2 - 4} fill="#f1f5f9" fontSize={15} fontWeight={700} style={{ fontFamily: "var(--font-display)" }}>
                    {dividir(info.nome, 14)[0]}
                    {dividir(info.nome, 14)[1] && <tspan x={18} dy={18}>{dividir(info.nome, 14)[1]}</tspan>}
                  </text>
                  <text x={18} y={y + FAIXA_H / 2 + (dividir(info.nome, 14)[1] ? 34 : 16)} fill="#a3b3c7" fontSize={11.5}>{cortar(info.apoio, 24)}</text>
                </g>
              );
            })}

            {LIGACOES.map((l, n) => {
              const aceso = !!ativo && (l.de === ativo || l.para === ativo);
              const apagado = !!ativo && !aceso;
              if (!aceso && l.tipo === "dados" && !verDados) return null;
              const entrando = l.para === ativo;
              const cor = !aceso ? (l.tipo === "energia" ? "#6aa9f5" : "#64748b") : entrando ? "#f8fafc" : "#3dd6f5";
              return (
                <path key={`${l.de}-${l.para}`} d={rota(l.de, l.para, n)} fill="none" stroke={cor}
                  strokeWidth={aceso ? 2.6 : l.tipo === "energia" ? 1.4 : 1} strokeOpacity={apagado ? 0.06 : aceso ? 1 : l.tipo === "energia" ? 0.5 : 0.35}
                  strokeDasharray={l.tipo === "dados" ? "5 5" : undefined}
                  className={aceso ? "infra-fluxo" : undefined} />
              );
            })}

            {PECAS.map((p) => {
              const q = POS[p.id];
              const m = medidores[p.id];
              const est = m?.estado ?? "descrito";
              const selecionada = sel === p.id;
              const apagada = !!relacionadas && !relacionadas.has(p.id);
              const [l1, l2] = dividir(p.nome);
              return (
                <g key={p.id} transform={`translate(${q.x} ${q.y})`} opacity={apagada ? 0.32 : 1} role="button" tabIndex={0} className="cursor-pointer outline-none"
                  aria-label={`${p.nome}: ${m ? `${NOME_ESTADO[est]}, ${m.texto}` : "descrito, sem medidor"}`} aria-pressed={selecionada}
                  onClick={() => setSel(selecionada ? null : p.id)}
                  onMouseEnter={() => setFoco(p.id)} onMouseLeave={() => setFoco(null)}
                  onFocus={() => setFoco(p.id)} onBlur={() => setFoco(null)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSel(selecionada ? null : p.id); } }}>
                  <rect width={PECA_W} height={PECA_H} rx={13} fill={selecionada ? "#0052b4" : "#131f35"} stroke={selecionada ? "#6aa9f5" : ativo === p.id ? "#3dd6f5" : "#2b3c57"} strokeWidth={selecionada || ativo === p.id ? 2 : 1} />
                  <circle cx={14} cy={15} r={4.5} fill={COR[est]} fillOpacity={m ? 1 : 0} stroke={COR[est]} strokeWidth={1.5} />
                  <text x={25} y={l2 ? 19 : 20} fill="#f8fafc" fontSize={12.5} fontWeight={600}>{l1}</text>
                  {l2 && <text x={25} y={34} fill="#f8fafc" fontSize={12.5} fontWeight={600}>{l2}</text>}
                  <text x={12} y={PECA_H - 11} fill={m ? COR[est] : "#a3b3c7"} fontSize={10.5} fontWeight={m ? 600 : 400}>{cortar(m ? m.texto : "Descrito", 25)}</text>
                </g>
              );
            })}
          </svg>
          {peca && <Detalhe peca={peca} medidor={medidores[peca.id]} medidores={medidores} onEscolher={setSel} onFechar={() => setSel(null)} flutuante />}
        </div>

        {/* lista em telas menores */}
        <div className="mt-4 space-y-4 xl:hidden">
          {ORDEM.map((c) => {
            const info = CAMADAS.find((x) => x.id === c)!;
            return (
              <section key={c}>
                <h2 className="font-display text-[15px] font-bold">{info.nome}</h2>
                <p className="mb-2 text-xs text-muted">{info.apoio}</p>
                <ul className="space-y-1.5">
                  {PECAS.filter((p) => p.camada === c).map((p) => {
                    const m = medidores[p.id];
                    const est = m?.estado ?? "descrito";
                    return (
                      <li key={p.id}>
                        <button type="button" onClick={() => setSel(sel === p.id ? null : p.id)} aria-expanded={sel === p.id}
                          className={`flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2 text-left ${sel === p.id ? "bg-marca-600" : "bg-white/5"}`}>
                          <span aria-hidden className="size-2.5 shrink-0 rounded-full border-[1.5px]" style={{ borderColor: COR[est], background: m ? COR[est] : "transparent" }} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold">{p.nome}</span>
                            <span className="block truncate text-xs" style={{ color: m ? COR[est] : "var(--muted)" }}>{m ? m.texto : "Descrito"}</span>
                          </span>
                        </button>
                        {sel === p.id && <div className="mt-1.5"><Detalhe peca={p} medidor={m} medidores={medidores} onEscolher={setSel} onFechar={() => setSel(null)} /></div>}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}

function Legenda() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
      {(["ok", "atencao", "parado"] as const).map((e) => (
        <span key={e} className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full" style={{ background: COR[e] }} />{NOME_ESTADO[e]}</span>
      ))}
      <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full border-[1.5px]" style={{ borderColor: COR.descrito }} />Descrito, sem medidor</span>
      <span className="inline-flex items-center gap-1.5"><svg width="22" height="4" aria-hidden><line x1="0" y1="2" x2="22" y2="2" stroke="#6aa9f5" strokeWidth="2" /></svg>Energia: sem ela, para</span>
      <span className="inline-flex items-center gap-1.5"><svg width="22" height="4" aria-hidden><line x1="0" y1="2" x2="22" y2="2" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 3" /></svg>Dados: abastece</span>
    </div>
  );
}

function Detalhe({ peca, medidor, medidores, onEscolher, onFechar, flutuante = false }: {
  peca: Peca;
  medidor?: Medidor;
  medidores: Medidores;
  onEscolher: (id: string) => void;
  onFechar: () => void;
  flutuante?: boolean;
}) {
  const recebe = LIGACOES.filter((l) => l.para === peca.id);
  const alimenta = LIGACOES.filter((l) => l.de === peca.id);
  const cascata = paraSeCair(peca.id);
  const nome = (id: string) => PECAS.find((p) => p.id === id)?.nome ?? id;
  const est = medidor?.estado ?? "descrito";
  const Chips = ({ itens, campo }: { itens: typeof recebe; campo: "de" | "para" }) => (
    <ul className="mt-1 space-y-1">
      {itens.map((l) => {
        const id = l[campo];
        const e = medidores[id]?.estado ?? "descrito";
        return (
          <li key={`${l.de}-${l.para}`}>
            <button type="button" onClick={() => onEscolher(id)} className="flex min-h-9 w-full items-center gap-2 rounded-lg bg-white/5 px-2.5 py-1 text-left text-sm hover:bg-white/10">
              <span aria-hidden className="size-2 shrink-0 rounded-full border-[1.5px]" style={{ borderColor: COR[e], background: medidores[id] ? COR[e] : "transparent" }} />
              <span className="font-medium">{nome(id)}</span>
              <span className="min-w-0 truncate text-xs text-muted">{l.rotulo}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
  return (
    <aside aria-label={`Detalhes de ${peca.nome}`}
      className={`tech-vidro rounded-2xl p-4 ${flutuante ? "absolute right-2 top-2 z-10 max-h-[calc(100%-1rem)] w-[400px] overflow-y-auto shadow-2xl" : ""}`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-bold leading-tight">{peca.nome}</h2>
          <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: COR[est] }}>
            <i aria-hidden className="size-2 rounded-full border-[1.5px]" style={{ borderColor: COR[est], background: medidor ? COR[est] : "transparent" }} />
            {medidor ? `${NOME_ESTADO[est]} · ${medidor.texto}` : "Descrito · sem medidor no site"}
          </p>
        </div>
        <button type="button" onClick={onFechar} aria-label={`Fechar ${peca.nome}`} className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-fill"><X size={18} /></button>
      </div>
      {medidor?.detalhe && <p className="mt-2 text-xs text-muted">{medidor.detalhe}</p>}
      <Bloco titulo="O que é">{peca.oQueE}</Bloco>
      <Bloco titulo="Como funciona">{peca.comoFunciona}</Bloco>
      <Bloco titulo="Como você opera">{peca.comoOperar}</Bloco>
      <Bloco titulo="Se parar">{peca.seParar}</Bloco>
      {cascata.length > 0 && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-bad-soft px-2.5 py-2 text-xs">
          <Zap size={13} className="mt-0.5 shrink-0 text-bad" aria-hidden />
          <span><b className="text-bad">Efeito em cadeia:</b> sem esta peça, {cascata.length === 1 ? "para também" : "param também"} {cascata.map(nome).join(", ")}.</span>
        </p>
      )}
      {recebe.length > 0 && (
        <div className="mt-3"><h3 className="text-xs font-semibold text-muted">Recebe de</h3><Chips itens={recebe} campo="de" /></div>
      )}
      {alimenta.length > 0 && (
        <div className="mt-3"><h3 className="text-xs font-semibold text-muted">Alimenta</h3><Chips itens={alimenta} campo="para" /></div>
      )}
    </aside>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <h3 className="text-xs font-semibold text-muted">{titulo}</h3>
      <p className="mt-0.5 text-sm leading-snug">{children}</p>
    </div>
  );
}
