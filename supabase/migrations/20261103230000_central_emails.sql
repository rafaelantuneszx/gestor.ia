-- PROPOSTA, NÃO APLICADA. Aplicar só com o ok do Rafael.
-- Cartões da tela "Supervisão de e-mails" do escritório. Guarda só o necessário para o cartão: conta, pasta, data, nome do
-- remetente, assunto, quantos anexos e o agente que supervisiona. NÃO guarda o texto do e-mail, o endereço do remetente nem os
-- anexos. Só quem está em central_usuarios lê; só o token dos agentes grava; cada cartão some depois de 30 dias.

create table public.central_emails (
  id text primary key, -- hash de conta, pasta e uid (o script local calcula)
  conta text not null,
  pasta text,
  data timestamptz,
  remetente text,
  assunto text,
  anexos integer not null default 0 check (anexos >= 0),
  agente text,
  situacao text not null default 'novo',
  atualizado_em timestamptz not null default now()
);
create index central_emails_data on public.central_emails (data desc);

alter table public.central_emails enable row level security;
create policy central_ler on public.central_emails for select to authenticated using (public.central_autorizado());

create or replace function public.central_emails_publicar(p_token text, p_itens jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare
  n integer;
begin
  if not public.central_token_ok(p_token) then
    raise exception 'token inválido';
  end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) > 500 then
    raise exception 'envie uma lista de até 500 itens';
  end if;
  insert into public.central_emails (id, conta, pasta, data, remetente, assunto, anexos, agente)
  select i->>'id', i->>'conta', left(i->>'pasta', 120), nullif(i->>'data', '')::timestamptz, left(i->>'remetente', 120), left(i->>'assunto', 200),
    greatest(coalesce((i->>'anexos')::integer, 0), 0), i->>'agente'
  from jsonb_array_elements(p_itens) i
  where coalesce(i->>'id', '') <> '' and coalesce(i->>'conta', '') <> ''
  on conflict (id) do update set agente = excluded.agente, atualizado_em = now();
  get diagnostics n = row_count;
  delete from public.central_emails where data < now() - interval '30 days';
  return n;
end;
$$;
revoke all on function public.central_emails_publicar(text, jsonb) from public;
grant execute on function public.central_emails_publicar(text, jsonb) to anon, authenticated;
