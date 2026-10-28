"use client";

// O Rafael convoca uma reunião pela tela: título, pauta curta e os participantes (padrão: Helena, Ricardo,
// Otávio, Lúcia e Paulo). Ao criar, já entra na sala.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, LogIn } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { PADRAO_REUNIAO_RAFAEL } from "@/lib/pessoas";
import type { Pessoa } from "./Controles";

export function Convocar({ agentes, modo, base }: { agentes: Pessoa[]; modo: "real" | "demo"; base: string }) {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [pauta, setPauta] = useState("");
  const [sel, setSel] = useState<string[]>(PADRAO_REUNIAO_RAFAEL.filter((id) => agentes.some((a) => a.id === id)));
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const alternar = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const itens = pauta.split("\n").map((t) => t.trim()).filter(Boolean);

  const criar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (!titulo.trim()) return setErro("Dê um título para a reunião.");
    if (sel.length === 0) return setErro("Escolha ao menos um participante.");
    if (modo === "demo") {
      const q = new URLSearchParams({ titulo: titulo.trim(), p: sel.join(","), pauta: itens.join("|") });
      router.push(`${base}/nova/sala?${q}`);
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch("/api/reunioes", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ titulo: titulo.trim(), participantes: sel, pauta: itens }),
      });
      const j = (await res.json().catch(() => ({}))) as { id?: number; erro?: string };
      if (!res.ok || !j.id) throw new Error(j.erro ?? `erro ${res.status}`);
      router.push(`${base}/${j.id}/sala`);
    } catch (e) {
      setErro((e as Error).message);
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={criar} className="space-y-6">
      <div>
        <label htmlFor="titulo" className="mb-1 block text-sm font-semibold">Assunto</label>
        <input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={200} placeholder="Ex.: Caixa de novembro e obras críticas"
          className="h-11 w-full rounded-xl border border-line bg-card px-3 text-[15px] outline-none focus:border-accent" />
      </div>
      <div>
        <label htmlFor="pauta" className="mb-1 block text-sm font-semibold">Pauta <span className="font-normal text-muted">(um item por linha, opcional)</span></label>
        <textarea id="pauta" value={pauta} onChange={(e) => setPauta(e.target.value)} rows={3}
          placeholder={"Situação do caixa\nObras acima do orçamento"}
          className="w-full rounded-xl border border-line bg-card px-3 py-2 text-[15px] outline-none focus:border-accent" />
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Participantes <span className="font-normal text-muted">· {sel.length} escolhidos</span></legend>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {agentes.map((a) => {
            const on = sel.includes(a.id);
            return (
              <button key={a.id} type="button" onClick={() => alternar(a.id)} aria-pressed={on}
                className={`flex items-center gap-3 rounded-xl border p-2.5 text-left transition ${on ? "border-accent bg-accent-soft" : "border-line bg-card hover:border-accent/50"}`}>
                <Avatar id={a.id} nome={a.nome} setor={a.setor} tamanho={40} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{a.nome}</span>
                  <span className="block truncate text-xs text-muted">{a.cargo}</span>
                </span>
                <span className={`flex size-6 items-center justify-center rounded-full border ${on ? "border-accent bg-accent text-white" : "border-line"}`}>
                  {on && <Check size={14} />}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>
      {erro && <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{erro}</p>}
      <button disabled={enviando} className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-[15px] font-semibold text-white disabled:opacity-60">
        {enviando ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />} Convocar e entrar
      </button>
    </form>
  );
}
