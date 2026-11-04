"use client";

// Seletor de escopo: grupo inteiro ou uma empresa. Sem empresas cadastradas, mostra só "Grupo".
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronsUpDown } from "lucide-react";

export type EmpresaEscopo = { id: string; nome: string; sigla: string; pendencias: number };

const TONS = ["var(--marca-500)", "var(--marca-700)", "var(--marca-600)"];
export const tomDaEmpresa = (i: number) => TONS[i % TONS.length];

export function definirEscopo(id: string) {
  document.cookie = `gia_escopo=${encodeURIComponent(id)}; path=/; max-age=31536000; samesite=lax`;
}

const decisoes = (n: number) => (n === 0 ? "Nada pendente" : n === 1 ? "1 decisão" : `${n} decisões`);

export function Escopo({ empresas, atual, pendenciasGrupo }: { empresas: EmpresaEscopo[]; atual: string; pendenciasGrupo: number }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => { if (!raiz.current?.contains(e.target as Node)) setAberto(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", tecla);
    return () => { document.removeEventListener("mousedown", fora); document.removeEventListener("keydown", tecla); };
  }, [aberto]);

  if (empresas.length === 0) {
    return <span className="gi-escopo"><span className="gi-monograma gi-monograma--grupo">G</span>Grupo</span>;
  }
  const iAtual = empresas.findIndex((e) => e.id === atual);
  const empresa = iAtual >= 0 ? empresas[iAtual] : null;
  const escolher = (id: string) => {
    definirEscopo(id);
    setAberto(false);
    router.refresh();
  };
  return (
    <div ref={raiz} className="relative">
      <button type="button" className="gi-escopo" aria-haspopup="listbox" aria-expanded={aberto} onClick={() => setAberto((a) => !a)}>
        {empresa
          ? <span className="gi-monograma" style={{ background: tomDaEmpresa(iAtual) }}>{empresa.sigla.slice(0, 2)}</span>
          : <span className="gi-monograma gi-monograma--grupo">G</span>}
        <span className="max-w-[9rem] truncate">{empresa ? empresa.nome : `Grupo · ${empresas.length} ${empresas.length === 1 ? "empresa" : "empresas"}`}</span>
        <ChevronsUpDown size={14} aria-hidden />
      </button>
      {aberto && (
        <ul role="listbox" aria-label="Escopo" className="ios-card absolute left-0 top-full z-50 mt-1 w-72 p-1.5 shadow-lg">
          <li role="option" aria-selected={!empresa}>
            <button type="button" onClick={() => escolher("grupo")} className={`flex min-h-11 w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left ${!empresa ? "bg-fill" : ""}`}>
              <span className="gi-monograma gi-monograma--grupo">G</span>
              <span><span className="block text-sm font-semibold">Grupo inteiro</span><span className="block text-xs text-muted">{empresas.length} {empresas.length === 1 ? "empresa" : "empresas"} · {decisoes(pendenciasGrupo)}</span></span>
            </button>
          </li>
          {empresas.map((e, i) => (
            <li key={e.id} role="option" aria-selected={e.id === atual}>
              <button type="button" onClick={() => escolher(e.id)} className={`flex min-h-11 w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left ${e.id === atual ? "bg-fill" : ""}`}>
                <span className="gi-monograma" style={{ background: tomDaEmpresa(i) }}>{e.sigla.slice(0, 2)}</span>
                <span><span className="block text-sm font-semibold">{e.nome}</span><span className="block text-xs text-muted">{decisoes(e.pendencias)}</span></span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AbrirEmpresa({ id }: { id: string }) {
  const router = useRouter();
  return (
    <button type="button" className="min-h-11 rounded-full px-3 text-sm font-semibold text-accent hover:bg-fill"
      onClick={() => { definirEscopo(id); router.push("/"); router.refresh(); }}>
      Abrir
    </button>
  );
}
