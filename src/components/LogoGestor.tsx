// Marca do Gestor.IA: um hexágono (o núcleo da operação) com o "G" que termina num nó de rede (os agentes).
import { useId } from "react";

export function MarcaGestor({ tamanho = 28, className }: { tamanho?: number; className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" width={tamanho} height={tamanho} fill="none" className={className} role="img" aria-label="Gestor.IA">
      <defs>
        <linearGradient id={id} x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22d3ee" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <path d="M32 4 56 18v28L32 60 8 46V18Z" stroke={`url(#${id})`} strokeWidth="4.5" strokeLinejoin="round" />
      <path d="M43.5 24.5a14 14 0 1 0 2.3 11.5H33" stroke={`url(#${id})`} strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="33" cy="36" r="4.2" fill={`url(#${id})`} />
    </svg>
  );
}

export function LogoGestor({ tamanho = 24, className }: { tamanho?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <MarcaGestor tamanho={tamanho} />
      <span className="font-semibold tracking-tight">
        Gestor<span className="text-accent">.IA</span>
      </span>
    </span>
  );
}
