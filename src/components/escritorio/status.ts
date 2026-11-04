// O status que aparece na cabeça de cada agente (3D e planta 2D). Vem do estado real dos eventos.
import type { EstadoAgente } from "@/lib/escritorio/modelo";

export type TipoStatus = "trabalhando" | "livre" | "atencao" | "reuniao" | "andando" | "pausa";

export const COR_STATUS: Record<TipoStatus, string> = {
  trabalhando: "#22d3ee",
  livre: "#34d399",
  atencao: "#f87171",
  reuniao: "#fbbf24",
  andando: "#60a5fa",
  pausa: "#a78bfa",
};

export function situacaoDe(estado: EstadoAgente | undefined, emReuniao: boolean, andando: boolean, pausa = false): { tipo: TipoStatus; texto: string } {
  if (emReuniao) return { tipo: "reuniao", texto: "em reunião" };
  if (pausa) return { tipo: "pausa", texto: "na copa" };
  if (andando) return { tipo: "andando", texto: "entregando" };
  if (estado?.status === "trabalhando") return { tipo: "trabalhando", texto: "trabalhando" };
  if (estado?.status === "erro") return { tipo: "atencao", texto: "atenção" };
  return { tipo: "livre", texto: "livre" };
}
