-- PROPOSTA, NÃO APLICADA. Aplicar só com aprovação explícita.
-- Grupo › Empresa: tabela de empresas e coluna opcional de empresa em agentes, demandas, documentos e eventos.
-- O painel.py continua funcionando sem mudança: o gatilho preenche a empresa a partir do agente quando ela vem vazia.
-- Sem seed: a lista de empresas (nome e sigla) entra num arquivo separado, depois de confirmada.

create table public.central_empresas (
  id text primary key,
  nome text not null,
  sigla text not null check (char_length(sigla) between 1 and 3),
  ordem int not null default 0
);
alter table public.central_empresas enable row level security;
create policy central_ler on public.central_empresas for select to authenticated using (public.central_autorizado());

alter table public.central_agentes add column empresa text references public.central_empresas(id);
alter table public.central_demandas add column empresa text references public.central_empresas(id);
alter table public.central_documentos add column empresa text references public.central_empresas(id);
alter table public.central_eventos add column empresa text references public.central_empresas(id);

create index central_demandas_empresa on public.central_demandas (empresa);
create index central_documentos_empresa on public.central_documentos (empresa);
create index central_eventos_empresa on public.central_eventos (empresa);

-- Empresa vazia: herda a do agente que escreveu (de, nas demandas; agente, nos documentos e eventos).
create or replace function public.central_preencher_empresa()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  quem text;
begin
  if new.empresa is not null then
    return new;
  end if;
  if tg_table_name = 'central_demandas' then
    quem := new.de;
  else
    quem := new.agente;
  end if;
  select a.empresa into new.empresa from public.central_agentes a where a.id = quem;
  return new;
end;
$$;
revoke all on function public.central_preencher_empresa() from public;

create trigger central_demandas_empresa before insert on public.central_demandas
  for each row execute function public.central_preencher_empresa();
create trigger central_documentos_empresa before insert on public.central_documentos
  for each row execute function public.central_preencher_empresa();
create trigger central_eventos_empresa before insert on public.central_eventos
  for each row execute function public.central_preencher_empresa();
