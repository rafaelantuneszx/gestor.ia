-- Central Web: mesa de aprovações, arquivo por setor e eventos dos agentes.
-- Fica no banco do Pavimax-ERP com prefixo central_, isolada das tabelas do ERP:
-- nenhuma tabela, função ou policy existente é alterada.

-- Quem pode entrar na Central (login do Supabase Auth, o mesmo do PaviMax).
create table public.central_usuarios (
  email text primary key,
  nome text not null,
  criado_em timestamptz not null default now()
);

create table public.central_setores (
  id text primary key,
  nome text not null,
  descricao text,
  ordem int not null default 0
);

create table public.central_agentes (
  id text primary key,
  nome text not null,
  cargo text not null,
  grupo text not null,
  setor text references public.central_setores(id)
);

create table public.central_documentos (
  id uuid primary key default gen_random_uuid(),
  setor text not null references public.central_setores(id),
  agente text references public.central_agentes(id),
  rotina text,
  titulo text not null,
  tipo text not null default 'relatorio' check (tipo in ('relatorio', 'pdf', 'rascunho', 'outro')),
  conteudo_md text,
  storage_path text,
  data_ref date,
  criado_em timestamptz not null default now()
);
create index central_documentos_setor_idx on public.central_documentos (setor, criado_em desc);

create table public.central_demandas (
  id bigint generated always as identity primary key,
  de text not null,
  para text not null,
  titulo text not null,
  detalhe text not null default '',
  prioridade text not null default 'media' check (prioridade in ('alta', 'media', 'baixa')),
  estado text not null default 'aberta'
    check (estado in ('aberta', 'andamento', 'aguardando-rafael', 'feita', 'cancelada')),
  setor text references public.central_setores(id),
  documento_id uuid references public.central_documentos(id) on delete set null,
  decisao text check (decisao in ('aprovada', 'recusada', 'ajuste')),
  decisao_nota text,
  decidida_em timestamptz,
  decidida_por text,
  criada timestamptz not null default now(),
  atualizada timestamptz not null default now()
);
create index central_demandas_estado_idx on public.central_demandas (estado, prioridade);

create table public.central_demanda_historico (
  id bigint generated always as identity primary key,
  demanda_id bigint not null references public.central_demandas(id) on delete cascade,
  ts timestamptz not null default now(),
  por text not null,
  acao text not null,
  nota text not null default ''
);

create table public.central_eventos (
  id bigint generated always as identity primary key,
  ts timestamptz not null default now(),
  tipo text not null check (tipo in ('inicio', 'passo', 'fim', 'nota', 'demanda')),
  agente text not null,
  rotina text not null default '',
  resumo text not null default '',
  status text,
  alertas int,
  documento_id uuid references public.central_documentos(id) on delete set null
);
create index central_eventos_ts_idx on public.central_eventos (ts desc);

-- Hash do token dos agentes (o token em si fica só no Mac do Rafael).
create table public.central_tokens (
  id text primary key,
  hash text not null,
  criado_em timestamptz not null default now()
);

-- ---------- acesso ----------

create or replace function public.central_autorizado()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.central_usuarios u
    where lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function public.central_token_ok(p_token text)
returns boolean language sql stable security definer set search_path = public, extensions as $$
  select exists (
    select 1 from public.central_tokens t
    where t.hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
  );
$$;

alter table public.central_usuarios enable row level security;
alter table public.central_setores enable row level security;
alter table public.central_agentes enable row level security;
alter table public.central_documentos enable row level security;
alter table public.central_demandas enable row level security;
alter table public.central_demanda_historico enable row level security;
alter table public.central_eventos enable row level security;
alter table public.central_tokens enable row level security;

-- Só leitura para quem está em central_usuarios. Escrita só pelas funções abaixo.
create policy central_ler on public.central_setores for select to authenticated using (public.central_autorizado());
create policy central_ler on public.central_agentes for select to authenticated using (public.central_autorizado());
create policy central_ler on public.central_documentos for select to authenticated using (public.central_autorizado());
create policy central_ler on public.central_demandas for select to authenticated using (public.central_autorizado());
create policy central_ler on public.central_demanda_historico for select to authenticated using (public.central_autorizado());
create policy central_ler on public.central_eventos for select to authenticated using (public.central_autorizado());
create policy central_ler on public.central_usuarios for select to authenticated using (public.central_autorizado());
-- central_tokens: sem policy nenhuma, ninguém lê pela API.

-- ---------- decisão do Rafael (pela tela) ----------

create or replace function public.central_decidir(p_id bigint, p_decisao text, p_nota text default '')
returns void language plpgsql security definer set search_path = public as $$
declare
  d public.central_demandas;
  quem text := coalesce(auth.jwt() ->> 'email', '');
begin
  if not public.central_autorizado() then
    raise exception 'sem acesso à Central';
  end if;
  if p_decisao not in ('aprovada', 'recusada', 'ajuste') then
    raise exception 'decisão inválida: %', p_decisao;
  end if;
  select * into d from public.central_demandas where id = p_id for update;
  if not found then
    raise exception 'demanda % não existe', p_id;
  end if;
  if d.estado <> 'aguardando-rafael' then
    raise exception 'a demanda % não está aguardando decisão (estado: %)', p_id, d.estado;
  end if;
  if p_decisao in ('recusada', 'ajuste') and coalesce(trim(p_nota), '') = '' then
    raise exception 'escreva o motivo para recusar ou pedir ajuste';
  end if;

  -- Aprovada ou ajuste: volta para quem pediu, que continua o trabalho. Recusada: encerra.
  update public.central_demandas set
    decisao = p_decisao,
    decisao_nota = coalesce(p_nota, ''),
    decidida_em = now(),
    decidida_por = quem,
    estado = case when p_decisao = 'recusada' then 'cancelada' else 'aberta' end,
    para = case when p_decisao = 'recusada' then para else de end,
    atualizada = now()
  where id = p_id;

  insert into public.central_demanda_historico (demanda_id, por, acao, nota)
  values (p_id, 'rafael', 'decisão: ' || p_decisao, coalesce(p_nota, ''));
  insert into public.central_eventos (tipo, agente, rotina, resumo)
  values ('demanda', 'rafael', 'demanda #' || p_id || ': ' || p_decisao, d.titulo);
end;
$$;

-- ---------- funções dos agentes (chamadas com o token) ----------

create or replace function public.central_registrar_evento(
  p_token text, p_tipo text, p_agente text, p_rotina text, p_resumo text default '',
  p_status text default null, p_alertas int default null, p_documento uuid default null)
returns bigint language plpgsql security definer set search_path = public as $$
declare novo bigint;
begin
  if not public.central_token_ok(p_token) then raise exception 'token inválido'; end if;
  insert into public.central_eventos (tipo, agente, rotina, resumo, status, alertas, documento_id)
  values (p_tipo, p_agente, coalesce(p_rotina, ''), coalesce(p_resumo, ''), p_status, p_alertas, p_documento)
  returning id into novo;
  return novo;
end;
$$;

create or replace function public.central_salvar_documento(
  p_token text, p_setor text, p_agente text, p_rotina text, p_titulo text,
  p_conteudo_md text, p_data_ref date default null, p_tipo text default 'relatorio')
returns uuid language plpgsql security definer set search_path = public as $$
declare novo uuid;
begin
  if not public.central_token_ok(p_token) then raise exception 'token inválido'; end if;
  insert into public.central_documentos (setor, agente, rotina, titulo, tipo, conteudo_md, data_ref)
  values (p_setor, p_agente, p_rotina, p_titulo, p_tipo, p_conteudo_md, p_data_ref)
  returning id into novo;
  return novo;
end;
$$;

create or replace function public.central_criar_demanda(
  p_token text, p_de text, p_para text, p_titulo text, p_detalhe text default '',
  p_prioridade text default 'media', p_precisa_rafael boolean default false,
  p_setor text default null, p_documento uuid default null)
returns bigint language plpgsql security definer set search_path = public as $$
declare novo bigint;
begin
  if not public.central_token_ok(p_token) then raise exception 'token inválido'; end if;
  insert into public.central_demandas (de, para, titulo, detalhe, prioridade, estado, setor, documento_id)
  values (p_de, case when p_precisa_rafael then 'rafael' else p_para end, p_titulo, coalesce(p_detalhe, ''),
          p_prioridade, case when p_precisa_rafael then 'aguardando-rafael' else 'aberta' end, p_setor, p_documento)
  returning id into novo;
  insert into public.central_demanda_historico (demanda_id, por, acao) values (novo, p_de, 'criou');
  insert into public.central_eventos (tipo, agente, rotina, resumo)
  values ('demanda', p_de, 'criou a demanda #' || novo || ' para ' || case when p_precisa_rafael then 'rafael' else p_para end, p_titulo);
  return novo;
end;
$$;

create or replace function public.central_mover_demanda(
  p_token text, p_id bigint, p_estado text, p_por text, p_para text default null, p_nota text default '')
returns void language plpgsql security definer set search_path = public as $$
declare d public.central_demandas; acao text;
begin
  if not public.central_token_ok(p_token) then raise exception 'token inválido'; end if;
  select * into d from public.central_demandas where id = p_id for update;
  if not found then raise exception 'demanda % não existe', p_id; end if;
  acao := d.estado || ' → ' || p_estado;
  if p_para is not null and p_para <> d.para then
    acao := acao || ', repassou de ' || d.para || ' para ' || p_para;
  end if;
  update public.central_demandas set
    estado = p_estado,
    para = coalesce(p_para, para),
    atualizada = now()
  where id = p_id;
  insert into public.central_demanda_historico (demanda_id, por, acao, nota) values (p_id, p_por, acao, coalesce(p_nota, ''));
  insert into public.central_eventos (tipo, agente, rotina, resumo)
  values ('demanda', p_por, 'demanda #' || p_id || ': ' || acao, coalesce(nullif(p_nota, ''), d.titulo));
end;
$$;

create or replace function public.central_listar_demandas(p_token text)
returns setof public.central_demandas language plpgsql stable security definer set search_path = public as $$
begin
  if not public.central_token_ok(p_token) then raise exception 'token inválido'; end if;
  return query select * from public.central_demandas order by id;
end;
$$;

revoke all on function public.central_decidir(bigint, text, text) from public, anon;
grant execute on function public.central_decidir(bigint, text, text) to authenticated;
revoke all on function public.central_token_ok(text) from public, anon, authenticated;
grant execute on function public.central_registrar_evento(text, text, text, text, text, text, int, uuid) to anon, authenticated;
grant execute on function public.central_salvar_documento(text, text, text, text, text, text, date, text) to anon, authenticated;
grant execute on function public.central_criar_demanda(text, text, text, text, text, text, boolean, text, uuid) to anon, authenticated;
grant execute on function public.central_mover_demanda(text, bigint, text, text, text, text) to anon, authenticated;
grant execute on function public.central_listar_demandas(text) to anon, authenticated;

-- ---------- dados iniciais ----------

insert into public.central_usuarios (email, nome) values ('rafael@fpav.com.br', 'Rafael Antunes');

insert into public.central_setores (id, nome, descricao, ordem) values
  ('direcao', 'Direção', 'Status do grupo, plantão e decisões', 1),
  ('financeiro', 'Financeiro', 'Caixa, lançamentos, conciliação, rateio, contabilidade', 2),
  ('custos', 'Custos e Contratos', 'Resultado por obra, produção x receita, RDO, contratos', 3),
  ('frota-rh', 'Frota e RH', 'KM, revisões, manutenções, folha, benefícios, FGTS e DARF', 4),
  ('suprimentos', 'Suprimentos', 'Pedidos, cotações, EPIs, fornecedores', 5),
  ('sistemas', 'Sistemas', 'Triagem, saúde dos sistemas, integrações', 6),
  ('agenda', 'Agenda e e-mails', 'Agenda do dia, pautas, rascunhos de e-mail', 7);

insert into public.central_agentes (id, nome, cargo, grupo, setor) values
  ('helena', 'Helena', 'Diretora de Operações', 'Direção', 'direcao'),
  ('ricardo-diretor-sistemas', 'Ricardo', 'Diretor de Sistemas do Grupo', 'Direção', 'sistemas'),
  ('clara-assistente', 'Clara', 'Assistente Executiva', 'Direção', 'agenda'),
  ('marina-custos', 'Marina', 'Analista de Custos e Contratos', 'Equipe de rotinas', 'custos'),
  ('sofia-adm-rh-frota', 'Sofia', 'Assistente Administrativa, RH e Frota', 'Equipe de rotinas', 'frota-rh'),
  ('bruno-financeiro', 'Bruno', 'Assistente Financeiro', 'Equipe de rotinas', 'financeiro'),
  ('caio-suprimentos', 'Caio', 'Suprimentos e Logística', 'Equipe de rotinas', 'suprimentos'),
  ('otavio-pavimax', 'Otávio', 'Diretor do PaviMax ERP', 'Sistemas', 'sistemas'),
  ('lucia-financeiro', 'Lúcia', 'Diretora do FPAV Financeiro', 'Sistemas', 'financeiro'),
  ('paulo-rh', 'Paulo', 'Diretor do FPAV RH', 'Sistemas', 'frota-rh');
