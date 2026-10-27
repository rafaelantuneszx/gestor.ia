"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServidor } from "@/lib/supabase/server";

export type Resultado = { ok: boolean; erro?: string };

export async function entrar(_: Resultado | null, form: FormData): Promise<Resultado> {
  const email = String(form.get("email") ?? "").trim();
  const senha = String(form.get("senha") ?? "");
  if (!email || !senha) return { ok: false, erro: "Informe e-mail e senha." };
  const sb = await supabaseServidor();
  const { error } = await sb.auth.signInWithPassword({ email, password: senha });
  if (error) return { ok: false, erro: "E-mail ou senha incorretos." };
  redirect("/");
}

export async function sair() {
  const sb = await supabaseServidor();
  await sb.auth.signOut();
  redirect("/login");
}

// A decisão passa pela função central_decidir, que confere se quem clicou está liberado,
// se a demanda ainda espera decisão e se recusa ou ajuste têm motivo.
export async function decidir(_: Resultado | null, form: FormData): Promise<Resultado> {
  const id = Number(form.get("id"));
  const decisao = String(form.get("decisao") ?? "");
  const nota = String(form.get("nota") ?? "").trim();
  if (!["aprovada", "recusada", "ajuste"].includes(decisao)) return { ok: false, erro: "Escolha uma decisão." };
  if (decisao !== "aprovada" && !nota) {
    return { ok: false, erro: decisao === "recusada" ? "Escreva o motivo da recusa." : "Escreva o que precisa ser ajustado." };
  }
  const sb = await supabaseServidor();
  const { error } = await sb.rpc("central_decidir", { p_id: id, p_decisao: decisao, p_nota: nota });
  if (error) return { ok: false, erro: error.message };
  revalidatePath("/");
  return { ok: true };
}
