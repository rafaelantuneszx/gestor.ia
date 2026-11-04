// Placar de independência: quantas das suas funções já rodam sem você.
import { NIVEIS_AUTONOMIA, contarAutonomia, FUNCOES } from "@/lib/funcoes-gestor";

export function Autonomia({ titulo = true, frase = false, barra = true }: { titulo?: boolean; frase?: boolean; barra?: boolean }) {
  const contagem = contarAutonomia(FUNCOES);
  const total = FUNCOES.length;
  const descricao = `${contagem.sozinha} sozinhas, ${contagem.aprova} você aprova, ${contagem.depende} dependem de você, ${contagem["sem-dono"]} sem dono`;
  return (
    <div>
      {titulo && (
        <div className="mb-1 flex flex-wrap items-baseline gap-x-2.5">
          <span className="gi-numero text-[28px] leading-none">{contagem.sozinha} de {total}</span>
          <span className="text-sm text-muted">funções já rodam sem você</span>
        </div>
      )}
      {frase && <p className="mb-3 text-[13px] text-muted">Cada função que sai de “depende de você” é uma cópia sua a mais trabalhando.</p>}
      {barra && (
        <div className="gi-autonomia mt-3" role="img" aria-label={descricao}>
          {NIVEIS_AUTONOMIA.map((n) => contagem[n.id] > 0 && (
            <span key={n.id} className={n.classe} style={{ width: `${(contagem[n.id] / total) * 100}%` }} />
          ))}
        </div>
      )}
      <div className="gi-legenda-autonomia mt-2.5">
        {NIVEIS_AUTONOMIA.map((n) => (
          <span key={n.id}><i style={{ background: `var(--${n.cor})` }} />{n.rotulo} · {contagem[n.id]}</span>
        ))}
      </div>
    </div>
  );
}
