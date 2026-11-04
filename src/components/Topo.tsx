import Link from "next/link";
import { Archive, Building2, Inbox, ListChecks, LogOut, Users } from "lucide-react";
import { sair } from "@/app/acoes";
import { LogoGestor } from "@/components/LogoGestor";

type Aba = "mesa" | "arquivo" | "escritorio" | "reunioes" | "funcoes";

const ABAS = [
  { id: "mesa", href: "/", rotulo: "Mesa", Icone: Inbox },
  { id: "escritorio", href: "/escritorio", rotulo: "Escritório", Icone: Building2 },
  { id: "reunioes", href: "/reunioes", rotulo: "Reuniões", Icone: Users },
  { id: "funcoes", href: "/funcoes", rotulo: "Funções", Icone: ListChecks },
  { id: "arquivo", href: "/arquivo", rotulo: "Arquivo", Icone: Archive },
] as const;

// No computador, as abas ficam no topo. No celular, descem para a barra de abas, como num app de iPhone.
export function Topo({ aba, pendentes }: { aba: Aba; pendentes: number }) {
  return (
    <>
      <header className="ios-vidro sticky top-0 z-30 h-[57px] border-b border-line">
        <div className="mx-auto flex h-full max-w-6xl items-center gap-2 px-4">
          <Link href="/" className="mr-3 text-[17px]" aria-label="Gestor.IA, ir para a Mesa">
            <LogoGestor tamanho={26} />
          </Link>
          <nav aria-label="Seções" className="ios-segmento hidden md:inline-flex">
            {ABAS.map(({ id, href, rotulo, Icone }) => (
              <Link key={id} href={href} className="ios-segmento-item" data-ativo={aba === id}
                aria-current={aba === id ? "page" : undefined}>
                <Icone size={16} /> {rotulo}
                {id === "mesa" && pendentes > 0 && (
                  <span className="rounded-full bg-warn-soft px-1.5 text-xs font-semibold text-warn">{pendentes}</span>
                )}
              </Link>
            ))}
          </nav>
          <form action={sair} className="ml-auto">
            <button className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm text-accent hover:bg-fill" title="Sair">
              <LogOut size={17} /> <span className="hidden sm:inline">Sair</span>
            </button>
          </form>
        </div>
      </header>
      <nav aria-label="Seções" className="ios-abas ios-vidro md:hidden">
        {ABAS.map(({ id, href, rotulo, Icone }) => (
          <Link key={id} href={href} className="ios-aba" aria-current={aba === id ? "page" : undefined}>
            <Icone size={23} strokeWidth={aba === id ? 2.3 : 1.8} aria-hidden />
            <span className="max-w-full truncate px-0.5">{rotulo}</span>
            {id === "mesa" && pendentes > 0 && (
              <span className="ios-selo">
                {pendentes}
                <span className="sr-only"> aguardando você</span>
              </span>
            )}
          </Link>
        ))}
      </nav>
    </>
  );
}

export function SemAcesso() {
  return (
    <main className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-xl font-semibold">Sem acesso ao Gestor.IA</h1>
      <p className="mt-2 text-muted">Seu login existe, mas não está liberado no Gestor.IA. Peça ao administrador para incluir seu e-mail.</p>
      <form action={sair} className="mt-6">
        <button className="min-h-11 rounded-full bg-fill px-5 text-sm font-semibold text-accent">Sair</button>
      </form>
    </main>
  );
}
