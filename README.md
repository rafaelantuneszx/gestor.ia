# Central · Rafael Enterprises

Mesa de aprovações e arquivo por setor dos agentes da Rafael Enterprises.

- **Mesa** (`/`): demandas que os agentes mandaram para o Rafael decidir (aprovar, pedir ajuste, recusar).
- **Arquivo** (`/arquivo`): relatórios, rascunhos e PDFs entregues pelos agentes, por setor.

## Stack

Next.js 15 (App Router, Server Actions) + Tailwind 4 + Supabase (projeto `Pavimax-ERP`, tabelas `central_*`).
Login: o mesmo Supabase Auth do PaviMax. Só entra quem está em `central_usuarios`.

## Como os dados chegam

Os agentes rodam no Mac do Rafael (pasta `rafael-enterprises`) e gravam pelo `painel/painel.py`, chamando
funções `central_*` que exigem um token. O token fica só no Mac (`painel/.central.json`); no banco existe só o hash.
A decisão do Rafael passa por `central_decidir`, que confere o acesso e devolve a demanda ao agente que pediu.

## Rodando

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.local` só precisa de `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (públicas; o acesso é
protegido por RLS).

## Migrations

`supabase/migrations/` (aplicadas no projeto Pavimax-ERP). A `..._central_arquivo_pdf.sql` (bucket de PDFs)
ainda **não** foi aplicada.
