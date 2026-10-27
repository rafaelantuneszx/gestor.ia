import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON, SUPABASE_URL } from "./config";

// Cliente do navegador com a sessão do usuário (cookies). Lê pelo mesmo RLS das telas do servidor.
export function supabaseNavegador() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON);
}
