# Gestor.IA

Seu escritório remoto 24 horas. Sua empresa e seu grupo em um só lugar.

No banco, as tabelas e funções continuam com o prefixo `central_` (nome interno da primeira versão).

## Navegação

- **Hoje** (`/`): o que aconteceu enquanto você estava fora, o que espera a sua decisão e quanto já roda sem você.
- **Empresas** (`/empresas`): o grupo consolidado e a entrada em cada empresa.
- **Escritório** (`/escritorio`): os agentes trabalhando agora, em 3D ou em planta 2D. Tem duas áreas internas:
  - **Reuniões** (`/reunioes`): a conversa fala por fala, a ata e as decisões.
  - **Infra** (`/escritorio/infra`): o subsolo, como uma rede elétrica. Mostra de onde vem a energia, onde fica a memória, o
    que depende de quê e o que para se uma peça cair. O mapa está em `src/lib/infra/mapa.ts` e o que é medido ao vivo em
    `src/lib/infra/medidores.ts`.
- **Funções** (`/funcoes`): cada função do gestor, quem prepara, quem pode executar, a autonomia e os gargalos.
- **Arquivo** (`/arquivo`): relatórios, rascunhos e PDFs entregues pelos agentes, por setor.

## Stack

Next.js 15 (App Router, Server Actions) + Tailwind 4 + Supabase (tabelas `central_*`).
Login: o mesmo Supabase Auth do PaviMax. Só entra quem está em `central_usuarios`.

## Como os dados chegam

Os agentes rodam na máquina dos agentes (pasta da central) e gravam pelo `painel/painel.py`, chamando funções `central_*` que
exigem um token. O token fica só nessa máquina (`painel/.central.json`); no banco existe só o hash.
A decisão do gestor passa por `central_decidir`, que confere o acesso e devolve a demanda ao agente que pediu.

## Rodando

```bash
npm install
npm run dev
```

`.env.local` só é necessário para sobrescrever o endereço e a chave pública do Supabase. O acesso é protegido por RLS.
Para a conversa com os agentes, cadastre `ANTHROPIC_API_KEY`; para a voz real, `ELEVENLABS_API_KEY`.

## Migrations

`supabase/migrations/`. Nem todas estão aplicadas: arquivos com "PROPOSTA" no início só entram com aprovação explícita.
O banco é compartilhado com o ERP: nenhuma tabela fora do prefixo `central_` pode ser alterada.
Os valores legados do banco ficam isolados em `src/lib/banco.ts`.
