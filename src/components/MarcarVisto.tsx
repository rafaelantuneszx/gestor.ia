"use client";

// Guarda quando você passou por Hoje, para a próxima visita mostrar o que aconteceu desde então.
import { useEffect } from "react";

export function MarcarVisto() {
  useEffect(() => {
    document.cookie = `gia_visto=${encodeURIComponent(new Date().toISOString())}; path=/; max-age=31536000; samesite=lax`;
  }, []);
  return null;
}
