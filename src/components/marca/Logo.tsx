// Logotipo oficial do Gestor.IA. Os arquivos vêm do design system e não devem ser recoloridos nem esticados.
/* eslint-disable @next/next/no-img-element */

export function Logo({ altura = 28, simbolo = false, escuro = false, className = "" }: {
  altura?: number;
  simbolo?: boolean; // só o símbolo, sem o nome
  escuro?: boolean; // sempre a versão para fundo escuro (escritório e infra, que não seguem o tema do aparelho)
  className?: string;
}) {
  if (simbolo) {
    return <img src="/marca/gestor-ia-simbolo.svg" alt="Gestor.IA" width={altura} height={altura} className={`block shrink-0 ${className}`} style={{ height: altura, width: altura }} />;
  }
  const largura = altura * 4;
  const estilo = { height: altura, width: largura };
  if (escuro) return <img src="/marca/gestor-ia-logo-negativo.svg" alt="Gestor.IA" className={`block shrink-0 ${className}`} style={estilo} />;
  return (
    <span className={`inline-flex shrink-0 ${className}`}>
      <img src="/marca/gestor-ia-logo.svg" alt="Gestor.IA" className="block dark:hidden" style={estilo} />
      <img src="/marca/gestor-ia-logo-negativo.svg" alt="" aria-hidden className="hidden dark:block" style={estilo} />
    </span>
  );
}
