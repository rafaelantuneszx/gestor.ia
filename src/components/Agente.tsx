// Indicador de IA em ação: cápsula em sinal com ponto pulsante. O pulso respeita prefers-reduced-motion (ver .gi-agente).
export function Agente({ texto, ativo = true, className = "" }: { texto: string; ativo?: boolean; className?: string }) {
  return (
    <span className={`gi-agente ${ativo ? "" : "gi-agente--parado"} ${className}`} data-ativo={ativo}>
      {texto}
    </span>
  );
}
