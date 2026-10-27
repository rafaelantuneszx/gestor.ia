// Endereço e chave anon do Supabase do Pavimax-ERP. São públicos (o navegador do PaviMax já recebe os
// dois) e o acesso é protegido pelo RLS das tabelas central_. As variáveis de ambiente, se existirem, têm
// prioridade; o padrão abaixo evita que o sistema caia quando elas não foram cadastradas na Vercel.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://svggsgdxoftbkvfwxruc.supabase.co";
export const SUPABASE_ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2Z2dzZ2R4b2Z0Ymt2Znd4cnVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNzcwNTksImV4cCI6MjA5MzY1MzA1OX0.8OEZ_lWmUORZqdKdW4VOJXfsETt_IKEQCfoSuqwkIx4";
