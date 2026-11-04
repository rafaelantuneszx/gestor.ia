// Escopo da tela: o grupo inteiro ou uma empresa. Fica no cookie gia_escopo e vale para todas as seções.
import { cookies } from "next/headers";

export const ESCOPO_GRUPO = "grupo";

export async function escopoAtual(): Promise<string> {
  const c = await cookies();
  return c.get("gia_escopo")?.value || ESCOPO_GRUPO;
}

// Com o grupo, não filtra: registros sem empresa aparecem normalmente.
export function comEscopo<Q>(consulta: Q, escopo: string): Q {
  if (escopo === ESCOPO_GRUPO) return consulta;
  return (consulta as unknown as { eq: (coluna: string, valor: string) => Q }).eq("empresa", escopo);
}
