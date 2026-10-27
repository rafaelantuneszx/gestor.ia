import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { SUPABASE_ANON, SUPABASE_URL } from "./config";
import { cookies } from "next/headers";

// Cliente do servidor com a sessão do usuário: tudo que ele lê passa pelo RLS das tabelas central_.
export async function supabaseServidor() {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (lista: { name: string; value: string; options: CookieOptions }[]) => {
        try {
          lista.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Server Component não grava cookie; o middleware renova a sessão.
        }
      },
    },
  });
}
