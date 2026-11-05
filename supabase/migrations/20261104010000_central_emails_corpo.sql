-- Aplicada no projeto Pavimax-ERP em 04/11/2026, com a autorização explícita do dono da caixa.
-- Muda o combinado de central_emails: até aqui o banco guardava só remetente, assunto e data. Esta tabela guarda também o texto,
-- os endereços e os nomes dos anexos, para a caixa de e-mail do Gestor.IA mostrar o corpo ao clicar.
--
-- Não guarda os arquivos anexos. Só quem está em central_usuarios lê; só o token dos agentes grava; cada corpo some junto com
-- o cartão em central_emails, depois de 30 dias.

create table public.central_emails_corpo (
  id text primary key references public.central_emails (id) on delete cascade,
  de text,
  para text,
  cc text,
  texto text,
  html text,
  anexos_nomes jsonb not null default '[]'::jsonb,
  atualizado_em timestamptz not null default now()
);

alter table public.central_emails_corpo enable row level security;
create policy central_ler on public.central_emails_corpo for select to authenticated using (public.central_autorizado());

-- Devolve os ids gravados: e-mail ainda sem cartão não entra e o publicador tenta de novo na próxima rodada.
create or replace function public.central_emails_corpo_publicar(p_token text, p_itens jsonb)
returns text[] language plpgsql security definer set search_path = public as $$
declare
  gravados text[];
begin
  if not public.central_token_ok(p_token) then
    raise exception 'token inválido';
  end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) > 50 then
    raise exception 'envie uma lista de até 50 itens';
  end if;
  with novos as (
    insert into public.central_emails_corpo (id, de, para, cc, texto, html, anexos_nomes)
    select i->>'id', left(i->>'de', 500), left(i->>'para', 2000), left(i->>'cc', 2000), left(i->>'texto', 200000), left(i->>'html', 400000),
      coalesce(i->'anexos_nomes', '[]'::jsonb)
    from jsonb_array_elements(p_itens) i
    join public.central_emails e on e.id = i->>'id'
    on conflict (id) do update set de = excluded.de, para = excluded.para, cc = excluded.cc, texto = excluded.texto, html = excluded.html,
      anexos_nomes = excluded.anexos_nomes, atualizado_em = now()
    returning id
  )
  select coalesce(array_agg(id), '{}') into gravados from novos;
  return gravados;
end;
$$;
revoke all on function public.central_emails_corpo_publicar(text, jsonb) from public;
grant execute on function public.central_emails_corpo_publicar(text, jsonb) to anon, authenticated;
