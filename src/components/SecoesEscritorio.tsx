"use client";

// Abas internas do Escritório: os agentes, as reuniões, os e-mails e a infra (o subsolo).
import Link from "next/link";
import { Cable, Mail, Users, UsersRound } from "lucide-react";

export function SecoesEscritorio({ atual, demo = false, onInfra, className = "" }: {
  atual: "agentes" | "reunioes" | "emails" | "infra";
  demo?: boolean;
  onInfra?: (e: React.MouseEvent) => void; // a descida animada, quando sai do 3D
  className?: string;
}) {
  const itens = [
    { id: "agentes", rotulo: "Agentes", href: demo ? "/escritorio/demo" : "/escritorio", Icone: Users },
    { id: "reunioes", rotulo: "Reuniões", href: demo ? "/reunioes/demo" : "/reunioes", Icone: UsersRound },
    { id: "emails", rotulo: "E-mails", href: demo ? "/escritorio/emails/demo" : "/escritorio/emails", Icone: Mail },
    { id: "infra", rotulo: "Infra", href: demo ? "/escritorio/infra/demo" : "/escritorio/infra", Icone: Cable },
  ] as const;
  return (
    <nav aria-label="Áreas do escritório" className={`ios-segmento max-w-full overflow-x-auto [scrollbar-width:none] ${className}`}>
      {itens.map(({ id, rotulo, href, Icone }) => (
        <Link key={id} href={href} className="ios-segmento-item" data-ativo={atual === id} aria-current={atual === id ? "page" : undefined}
          onClick={id === "infra" ? onInfra : undefined}>
          <Icone size={16} aria-hidden /> {rotulo}
        </Link>
      ))}
    </nav>
  );
}
