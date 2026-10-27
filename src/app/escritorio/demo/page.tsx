import { notFound } from "next/navigation";
import { EscritorioCliente } from "@/components/escritorio/EscritorioCliente";

// Demonstração com dados fictícios, sem login. Só existe em desenvolvimento.
export default function DemoEscritorio() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <>
      <header className="border-b border-line bg-card px-4 py-3 text-[15px] font-semibold">
        Gestor.IA <span className="font-normal text-muted">· escritório (demonstração com dados fictícios)</span>
      </header>
      <EscritorioCliente modo="demo" />
    </>
  );
}
