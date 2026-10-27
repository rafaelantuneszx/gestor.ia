"use client";

import dynamic from "next/dynamic";

// O 3D só existe no navegador (WebGL), então não é renderizado no servidor.
const Escritorio = dynamic(() => import("./Escritorio"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[calc(100vh-57px)] items-center justify-center text-sm text-muted">Montando o escritório…</div>
  ),
});

export function EscritorioCliente({ modo }: { modo: "real" | "demo" }) {
  return <Escritorio modo={modo} />;
}
