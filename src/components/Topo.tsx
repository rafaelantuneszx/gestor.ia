import Link from "next/link";
import { Archive, Briefcase, Building2, ListChecks, LogOut, Sunrise } from "lucide-react";
import { sair } from "@/app/acoes";
import { Agente } from "@/components/Agente";
import { Escopo } from "@/components/Escopo";
import { Logo } from "@/components/marca/Logo";
import { agentesAtivos, empresasComPendencias, pendentesNoEscopo } from "@/lib/dados";
import { escopoAtual } from "@/lib/escopo";

type Aba = "hoje" | "empresas" | "escritorio" | "funcoes" | "arquivo";

const ABAS = [
  { id: "hoje", href: "/", rotulo: "Hoje", Icone: Sunrise },
  { id: "empresas", href: "/empresas", rotulo: "Empresas", Icone: Briefcase },
  { id: "escritorio", href: "/escritorio", rotulo: "Escritório", Icone: Building2 },
  { id: "funcoes", href: "/funcoes", rotulo: "Funções", Icone: ListChecks },
  { id: "arquivo", href: "/arquivo", rotulo: "Arquivo", Icone: Archive },
] as const;

// No computador, as seções ficam no topo. No celular, descem para a barra de abas.
export async function Topo({ aba }: { aba: Aba }) {
  const escopo = await escopoAtual();
  const [empresas, pendentes, ativos] = await Promise.all([empresasComPendencias(), pendentesNoEscopo(escopo), agentesAtivos(escopo)]);
  const pendenciasGrupo = escopo === "grupo" ? pendentes : await pendentesNoEscopo("grupo");
  return (
    <>
      <header className="ios-vidro sticky top-0 z-30 h-[57px] border-b border-line">
        <div className="mx-auto flex h-full max-w-6xl items-center gap-2 px-4">
          <Link href="/" aria-label="Gestor.IA, ir para Hoje" className="shrink-0">
            <span className="hidden lg:inline-flex"><Logo /></span>
            <span className="lg:hidden"><Logo simbolo /></span>
          </Link>
          <Escopo empresas={empresas} atual={escopo} pendenciasGrupo={pendenciasGrupo} />
          <nav aria-label="Seções" className="ios-segmento hidden md:inline-flex">
            {ABAS.map(({ id, href, rotulo, Icone }) => (
              <Link key={id} href={href} className="ios-segmento-item" data-ativo={aba === id} aria-current={aba === id ? "page" : undefined}>
                <Icone size={16} aria-hidden /> <span className="hidden min-[900px]:inline">{rotulo}</span>
                <span className="sr-only min-[900px]:hidden">{rotulo}</span>
                {id === "hoje" && pendentes > 0 && (
                  <span className="rounded-full bg-warn-soft px-1.5 text-xs font-semibold text-warn">
                    {pendentes}<span className="sr-only"> decisões esperando você</span>
                  </span>
                )}
              </Link>
            ))}
          </nav>
          <span className="ml-auto" />
          <Agente texto={ativos === 1 ? "1 agente" : `${ativos} agentes`} ativo={ativos > 0} />
          <form action={sair}>
            <button className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-2.5 text-sm text-accent hover:bg-fill" aria-label="Sair">
              <LogOut size={17} aria-hidden /> <span className="hidden xl:inline">Sair</span>
            </button>
          </form>
        </div>
      </header>
      <nav aria-label="Seções" className="ios-abas ios-vidro md:hidden">
        {ABAS.map(({ id, href, rotulo, Icone }) => (
          <Link key={id} href={href} className="ios-aba" aria-current={aba === id ? "page" : undefined}>
            <Icone size={23} strokeWidth={aba === id ? 2.3 : 1.8} aria-hidden />
            <span className="max-w-full truncate px-0.5">{rotulo}</span>
            {id === "hoje" && pendentes > 0 && (
              <span className="ios-selo">
                {pendentes}
                <span className="sr-only"> decisões esperando você</span>
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
      <h1 className="ios-titulo">Sem acesso ao Gestor.IA</h1>
      <p className="mt-2 text-muted">Seu login existe, mas não está liberado no Gestor.IA. Peça ao administrador para incluir seu e-mail.</p>
      <form action={sair} className="mt-6">
        <button className="min-h-11 rounded-full bg-fill px-5 text-sm font-semibold text-accent">Sair</button>
      </form>
    </main>
  );
}
