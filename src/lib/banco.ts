// Valores legados do banco; não exibir. Os agentes gravam com eles pelo painel.py, então ainda não podem mudar
// (ver supabase/migrations/PROPOSTA_neutralizar_nomes.sql). Este é o único arquivo do código com o nome do dono.
export const ESTADO_AGUARDANDO_GESTOR = "aguardando-rafael" as const;
export const ID_GESTOR = "rafael" as const;
export const CONTA_GESTOR = "rafael@fpav.com.br" as const;

// Textos escritos pelos agentes ainda podem citar o nome do dono. Na tela, ele vira "gestor" ou "você".
export function semNomeDoGestor<T extends string | null | undefined>(texto: T): T {
  if (!texto) return texto;
  return texto
    .replace(/Rafael Enterprises/gi, "Gestor.IA")
    .replace(/\b([Pp]ara|[Cc]om) rafael\b(?![@.\w])/g, "$1 você")
    .replace(/,\s*Rafael\b(?![@.\w])/g, "")
    .replace(/\bRafael\b(?![@.\w])/g, "gestor")
    .replace(/\brafael\b(?![@.\w-])/g, "você") as T;
}
