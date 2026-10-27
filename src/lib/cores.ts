// Uma cor de lombada por rotina, para a prateleira não virar uma parede da mesma cor.
const CORES = ["#7F77DD", "#1D9E75", "#D85A30", "#378ADD", "#BA7517", "#D4537E", "#639922"];
export function corDa(rotina: string | null) {
  const s = rotina ?? "";
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return CORES[h % CORES.length];
}
