// Avatar ilustrado de cada agente e do Rafael, desenhado em SVG (sem imagens de fora): fundo na cor do setor,
// rosto estilizado com o cabelo e o tom de pele do boneco 3D, e um selo com o ícone da função.
// Sem hooks: serve em componentes do servidor e do navegador.
import {
  ArrowLeftRight, Calculator, CalendarDays, ChartLine, Compass, Crown, FileCheck, FileSpreadsheet, HardHat, Landmark,
  Network, Package, Receipt, Sigma, Truck, User, Users, type LucideIcon,
} from "lucide-react";
import { APARENCIA, FUNCAO_ICONE, corDoAgente, iniciais, misturar, type IconeFuncao } from "@/lib/pessoas";

const ICONES: Record<IconeFuncao, LucideIcon> = {
  compass: Compass, calendar: CalendarDays, network: Network, hardhat: HardHat, landmark: Landmark, users: Users,
  calculator: Calculator, receipt: Receipt, arrows: ArrowLeftRight, filecheck: FileCheck, sheet: FileSpreadsheet,
  chart: ChartLine, sigma: Sigma, truck: Truck, package: Package, crown: Crown, user: User,
};

export function Avatar({
  id, nome, setor, tamanho = 40, falando = false, selo = true, className = "", titulo,
}: {
  id: string;
  nome: string;
  setor?: string | null;
  tamanho?: number;
  falando?: boolean; // anel aceso de quem está falando
  selo?: boolean; // ícone da função no canto
  className?: string;
  titulo?: string;
}) {
  const cor = corDoAgente(id, setor);
  const ap = APARENCIA[id];
  const pele = ap?.pele ?? "#e0ac84";
  const cabelo = ap?.cabelo ?? "#2b1d14";
  const estilo = ap?.estilo ?? "curto";
  const terno = !!ap?.terno;
  const camisa = terno ? "#1f2a44" : misturar(cor, "#1b1f24", 0.18);
  const Icone = ICONES[FUNCAO_ICONE[id] ?? "user"];
  const g = `av-${id.replace(/[^a-z0-9]/gi, "")}`;
  const conhecido = !!ap;

  return (
    <svg viewBox="0 0 64 64" width={tamanho} height={tamanho} role="img" aria-label={titulo ?? nome}
      className={`shrink-0 ${className}`} style={{ overflow: "visible" }}>
      <title>{titulo ?? nome}</title>
      <defs>
        <linearGradient id={`${g}-f`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={misturar(cor, "#ffffff", 0.45)} />
          <stop offset="1" stopColor={cor} />
        </linearGradient>
        <clipPath id={`${g}-c`}><circle cx="32" cy="32" r="30" /></clipPath>
      </defs>
      {falando && <circle cx="32" cy="32" r="31.5" fill="none" stroke="#22c55e" strokeWidth="3" />}
      <circle cx="32" cy="32" r="30" fill={`url(#${g}-f)`} />
      <g clipPath={`url(#${g}-c)`}>
        {conhecido ? (
          <>
            {/* cabelo de trás (longo) */}
            {estilo === "longo" && <path d="M18 30 Q17 50 22 58 L42 58 Q47 50 46 30 Z" fill={cabelo} />}
            {/* ombros e roupa */}
            <path d="M8 66 Q9 46 32 44 Q55 46 56 66 Z" fill={camisa} />
            {terno ? (
              <>
                <path d="M27 45 L32 56 L37 45 Z" fill="#eef2f7" />
                <path d="M31 47 L33 47 L34 58 L32 61 L30 58 Z" fill="#7f1d1d" />
              </>
            ) : (
              <path d="M26 45 L32 52 L38 45" fill="none" stroke={misturar(cor, "#ffffff", 0.55)} strokeWidth="2" strokeLinejoin="round" />
            )}
            <rect x="28.5" y="37" width="7" height="9" rx="3" fill={misturar(pele, "#000000", 0.12)} />
            {/* rosto */}
            <ellipse cx="32" cy="28" rx="11" ry="12.5" fill={pele} />
            <ellipse cx="21.2" cy="29" rx="1.8" ry="2.6" fill={pele} />
            <ellipse cx="42.8" cy="29" rx="1.8" ry="2.6" fill={pele} />
            <Cabelo estilo={estilo} cor={cabelo} />
            <ellipse cx="27.6" cy="29" rx="1.4" ry="1.7" fill="#1b1410" />
            <ellipse cx="36.4" cy="29" rx="1.4" ry="1.7" fill="#1b1410" />
            <path d="M25.4 25.4 Q27.6 24.2 29.6 25.2 M34.4 25.2 Q36.4 24.2 38.6 25.4" stroke={cabelo} strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <path d="M28.6 34.4 Q32 37 35.4 34.4" stroke="#9a4a42" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <text x="32" y="39" textAnchor="middle" fontSize="20" fontWeight="700" fill="#fff" fontFamily="system-ui, sans-serif">
            {iniciais(nome)}
          </text>
        )}
      </g>
      {selo && (
        <g>
          <circle cx="52" cy="52" r="11" fill="#fff" stroke={cor} strokeWidth="2" />
          <Icone x={45.5} y={45.5} width={13} height={13} color={cor} strokeWidth={2.4} aria-hidden />
        </g>
      )}
    </svg>
  );
}

function Cabelo({ estilo, cor }: { estilo: string; cor: string }) {
  if (estilo === "raspado") return <path d="M21.5 25 Q22 15 32 14.6 Q42 15 42.5 25 Q38 19.5 32 19.6 Q26 19.5 21.5 25 Z" fill={cor} opacity="0.85" />;
  const capa = <path d="M20.4 28 Q19 13 32 13 Q45 13 43.6 28 Q42 20.5 36 19 Q30 22.5 22.5 21.8 Q21 24 20.4 28 Z" fill={cor} />;
  if (estilo === "coque") return <>{capa}<circle cx="32" cy="12" r="5.2" fill={cor} /></>;
  if (estilo === "ondulado") {
    return (
      <>
        {capa}
        {[[19.5, 26], [44.5, 26], [19, 32], [45, 32], [24, 15], [40, 15]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3.6" fill={cor} />
        ))}
      </>
    );
  }
  return capa;
}

// Fileira de avatares sobrepostos (lista de participantes).
export function Avatares({
  pessoas, tamanho = 28, max = 6,
}: {
  pessoas: { id: string; nome: string; setor?: string | null }[];
  tamanho?: number;
  max?: number;
}) {
  const vis = pessoas.slice(0, max);
  return (
    <div className="flex items-center">
      {vis.map((p, i) => (
        <span key={p.id} className="rounded-full ring-2 ring-card" style={{ marginLeft: i ? -tamanho * 0.28 : 0 }}>
          <Avatar id={p.id} nome={p.nome} setor={p.setor} tamanho={tamanho} selo={false} />
        </span>
      ))}
      {pessoas.length > max && (
        <span className="ml-1 text-xs font-medium text-muted">+{pessoas.length - max}</span>
      )}
    </div>
  );
}
