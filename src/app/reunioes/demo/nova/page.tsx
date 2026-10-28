import { notFound } from "next/navigation";
import { Convocar } from "@/components/reunioes/Convocar";
import { DEMO_AGENTES } from "@/lib/escritorio/demo";

export const dynamic = "force-dynamic";

export default function DemoNova() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <>
      <header className="border-b border-line bg-card px-4 py-3 text-[15px] font-semibold">
        Gestor.IA <span className="font-normal text-muted">· convocar (demonstração com dados fictícios)</span>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="mb-1 text-xl font-semibold sm:text-2xl">Convocar uma reunião</h1>
        <p className="mb-6 text-sm text-muted">Na demonstração as respostas são fixas e nada vai para o banco.</p>
        <Convocar modo="demo" base="/reunioes/demo" agentes={DEMO_AGENTES} />
      </main>
    </>
  );
}
