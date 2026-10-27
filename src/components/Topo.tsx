import Link from "next/link";
import { Archive, Building2, Inbox, LogOut } from "lucide-react";
import { sair } from "@/app/acoes";

type Aba = "mesa" | "arquivo" | "escritorio";

export function Topo({ aba, pendentes }: { aba: Aba; pendentes: number }) {
  const item = (ativo: boolean) =>
    `inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${
      ativo ? "bg-accent-soft text-accent font-semibold" : "text-muted hover:bg-bg"
    }`;
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
        <Link href="/" className="mr-3 text-[15px] font-semibold tracking-tight">
          Gestor.IA <span className="text-muted font-normal">Rafael Enterprises</span>
        </Link>
        <nav className="flex flex-1 items-center gap-1">
          <Link href="/" className={item(aba === "mesa")}>
            <Inbox size={16} /> Mesa
            {pendentes > 0 && (
              <span className="rounded-full bg-warn-soft px-1.5 text-xs font-semibold text-warn">{pendentes}</span>
            )}
          </Link>
          <Link href="/escritorio" className={item(aba === "escritorio")}>
            <Building2 size={16} /> Escritório
          </Link>
          <Link href="/arquivo" className={item(aba === "arquivo")}>
            <Archive size={16} /> Arquivo
          </Link>
        </nav>
        <form action={sair}>
          <button className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted hover:bg-bg" title="Sair">
            <LogOut size={16} /> <span className="hidden sm:inline">Sair</span>
          </button>
        </form>
      </div>
    </header>
  );
}

export function SemAcesso() {
  return (
    <main className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-xl font-semibold">Sem acesso ao Gestor.IA</h1>
      <p className="mt-2 text-muted">Seu login existe, mas não está liberado no Gestor.IA. Peça ao Rafael para incluir seu e-mail.</p>
      <form action={sair} className="mt-6">
        <button className="rounded-lg border border-line px-4 py-2 text-sm">Sair</button>
      </form>
    </main>
  );
}
