import { Agente } from "@/components/Agente";
import { Autonomia } from "@/components/Autonomia";
import { AbrirEmpresa } from "@/components/Escopo";
import { SemAcesso, Topo } from "@/components/Topo";
import { agentesAtivos, autorizado, cadastros, empresasComPendencias, pendentesNoEscopo } from "@/lib/dados";

export const dynamic = "force-dynamic";

const TONS = ["var(--marca-500)", "var(--marca-700)", "var(--marca-600)"];

export default async function Empresas() {
  if (!(await autorizado())) return <SemAcesso />;
  const [{ agentes }, empresas, pendentes] = await Promise.all([cadastros(), empresasComPendencias(), pendentesNoEscopo("grupo")]);
  const ativos = await Promise.all(empresas.map((e) => agentesAtivos(e.id)));
  const fraseEmpresas = `${empresas.length} ${empresas.length === 1 ? "empresa" : "empresas"}`;
  const fraseDecisoes = `${pendentes} ${pendentes === 1 ? "decisão esperando" : "decisões esperando"} você`;
  return (
    <>
      <Topo aba="empresas" />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="ios-titulo">Empresas</h1>
        <p className="mb-5 mt-1 text-sm text-muted">{fraseEmpresas} · {agentes.size} agentes · {fraseDecisoes}</p>

        {empresas.length === 0 && (
          <div className="ios-card max-w-2xl p-5">
            <h2 className="text-[15px] font-semibold">Nenhuma empresa cadastrada ainda.</h2>
            <p className="mt-1 text-sm text-muted">Por enquanto, tudo aparece no grupo. Quando as empresas forem cadastradas, cada uma ganha um cartão aqui e o seletor do topo passa a filtrar todas as telas.</p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {empresas.map((e, i) => (
            <article key={e.id} className="ios-card flex flex-col p-4">
              <div className="mb-3 flex items-center gap-2.5">
                <span className="gi-monograma" style={{ background: TONS[i % TONS.length] }}>{e.sigla.slice(0, 2)}</span>
                <h2 className="min-w-0 truncate text-[15px] font-semibold">{e.nome}</h2>
                <Agente className="ml-auto" texto={ativos[i] === 1 ? "1 agente" : `${ativos[i]} agentes`} ativo={ativos[i] > 0} />
              </div>
              <p className="text-sm text-muted">Caixa: em breve</p>
              <div className="mt-auto flex items-center justify-between pt-3">
                <span className="text-xs text-muted">
                  {e.pendencias === 0 ? "Nada pendente" : e.pendencias === 1 ? "1 decisão" : `${e.pendencias} decisões`}
                </span>
                <AbrirEmpresa id={e.id} />
              </div>
            </article>
          ))}
        </div>

        <h2 className="ios-secao mb-2 mt-6">Autonomia do grupo</h2>
        <div className="ios-card p-4"><Autonomia frase /></div>
      </main>
    </>
  );
}
