-- Reuniões entre os agentes: pauta, participantes, ata e decisões.
-- Mesmo padrão das outras tabelas central_: leitura para quem está em central_usuarios
-- (central_autorizado) e escrita só pela função central_reuniao_salvar, com o token dos agentes.
-- Nenhuma tabela, função ou policy existente é alterada.

create table public.central_reunioes (
  id bigserial primary key,
  titulo text not null,
  convocada_por text not null, -- id do agente (central_agentes.id) ou 'rafael'
  participantes text[] not null default '{}',
  pauta jsonb not null default '[]'::jsonb check (jsonb_typeof(pauta) = 'array'), -- [{ "texto": "..." }]
  agendada_para timestamptz,
  estado text not null default 'agendada'
    check (estado in ('agendada', 'em_andamento', 'encerrada', 'cancelada')),
  iniciada_em timestamptz,
  encerrada_em timestamptz,
  ata text, -- markdown
  -- [{ "texto", "responsavel", "aprovacao": "diretor"|"rafael"|null, "aprovador", "estado": "pendente"|"aprovada"|"recusada"|"feita" }]
  decisoes jsonb not null default '[]'::jsonb check (jsonb_typeof(decisoes) = 'array'),
  demanda_id bigint references public.central_demandas(id) on delete set null,
  documento_id uuid references public.central_documentos(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index central_reunioes_estado_idx on public.central_reunioes (estado, agendada_para);
create index central_reunioes_atualizado_idx on public.central_reunioes (atualizado_em desc);

alter table public.central_reunioes enable row level security;

-- Só leitura pela API; insert/update só pela função abaixo.
create policy central_ler on public.central_reunioes for select to authenticated using (public.central_autorizado());

-- ---------- função dos agentes (chamada com o token) ----------
-- Sem "id": cria a reunião. Com "id": altera só os campos enviados no JSON.
-- iniciada_em e encerrada_em são preenchidas sozinhas na mudança de estado, se não vierem.
-- Toda gravação registra um evento 'nota' com rotina 'reuniao#<id>' para o escritório reagir.

create or replace function public.central_reuniao_salvar(p_token text, p_reuniao jsonb)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  p jsonb := coalesce(p_reuniao, '{}'::jsonb);
  v_id bigint;
  r public.central_reunioes;
begin
  if not public.central_token_ok(p_token) then raise exception 'token inválido'; end if;
  if jsonb_typeof(p) <> 'object' then raise exception 'p_reuniao precisa ser um objeto JSON'; end if;
  v_id := nullif(p ->> 'id', '')::bigint;

  if v_id is not null then
    select * into r from public.central_reunioes where id = v_id for update;
    if not found then raise exception 'reunião % não existe', v_id; end if;
  end if;

  if p ? 'titulo' then r.titulo := nullif(trim(p ->> 'titulo'), ''); end if;
  if p ? 'convocada_por' then r.convocada_por := nullif(trim(p ->> 'convocada_por'), ''); end if;
  if p ? 'participantes' then
    r.participantes := case when jsonb_typeof(p -> 'participantes') = 'array'
      then array(select jsonb_array_elements_text(p -> 'participantes')) else '{}'::text[] end;
  end if;
  if p ? 'pauta' then
    r.pauta := case when jsonb_typeof(p -> 'pauta') = 'array' then p -> 'pauta' else '[]'::jsonb end;
  end if;
  if p ? 'agendada_para' then r.agendada_para := nullif(p ->> 'agendada_para', '')::timestamptz; end if;
  if p ? 'estado' then r.estado := p ->> 'estado'; end if;
  if p ? 'iniciada_em' then r.iniciada_em := nullif(p ->> 'iniciada_em', '')::timestamptz; end if;
  if p ? 'encerrada_em' then r.encerrada_em := nullif(p ->> 'encerrada_em', '')::timestamptz; end if;
  if p ? 'ata' then r.ata := p ->> 'ata'; end if;
  if p ? 'decisoes' then
    r.decisoes := case when jsonb_typeof(p -> 'decisoes') = 'array' then p -> 'decisoes' else '[]'::jsonb end;
  end if;
  if p ? 'demanda_id' then r.demanda_id := nullif(p ->> 'demanda_id', '')::bigint; end if;
  if p ? 'documento_id' then r.documento_id := nullif(p ->> 'documento_id', '')::uuid; end if;

  r.estado := coalesce(r.estado, 'agendada');
  r.participantes := coalesce(r.participantes, '{}'::text[]);
  r.pauta := coalesce(r.pauta, '[]'::jsonb);
  r.decisoes := coalesce(r.decisoes, '[]'::jsonb);
  if r.titulo is null then raise exception 'informe o título da reunião'; end if;
  if r.convocada_por is null then raise exception 'informe quem convocou (convocada_por)'; end if;
  if r.estado not in ('agendada', 'em_andamento', 'encerrada', 'cancelada') then
    raise exception 'estado inválido: % (use agendada, em_andamento, encerrada ou cancelada)', r.estado;
  end if;
  if exists (
    select 1 from jsonb_array_elements(r.decisoes) d
    where jsonb_typeof(d) <> 'object'
       or coalesce(trim(d ->> 'texto'), '') = ''
       or coalesce(d ->> 'estado', 'pendente') not in ('pendente', 'aprovada', 'recusada', 'feita')
       or coalesce(d ->> 'aprovacao', 'nenhuma') not in ('nenhuma', 'diretor', 'rafael')
  ) then
    raise exception 'decisões inválidas: cada item precisa de "texto"; "aprovacao" é diretor, rafael ou null; "estado" é pendente, aprovada, recusada ou feita';
  end if;

  -- datas da reunião, quando o agente não manda
  if r.estado in ('em_andamento', 'encerrada') and r.iniciada_em is null then r.iniciada_em := now(); end if;
  if r.estado in ('encerrada', 'cancelada') and r.encerrada_em is null then r.encerrada_em := now(); end if;

  if v_id is null then
    insert into public.central_reunioes (
      titulo, convocada_por, participantes, pauta, agendada_para, estado, iniciada_em, encerrada_em,
      ata, decisoes, demanda_id, documento_id)
    values (
      r.titulo, r.convocada_por, r.participantes, r.pauta, r.agendada_para, r.estado, r.iniciada_em, r.encerrada_em,
      r.ata, r.decisoes, r.demanda_id, r.documento_id)
    returning * into r;
  else
    update public.central_reunioes set
      titulo = r.titulo,
      convocada_por = r.convocada_por,
      participantes = r.participantes,
      pauta = r.pauta,
      agendada_para = r.agendada_para,
      estado = r.estado,
      iniciada_em = r.iniciada_em,
      encerrada_em = r.encerrada_em,
      ata = r.ata,
      decisoes = r.decisoes,
      demanda_id = r.demanda_id,
      documento_id = r.documento_id,
      atualizado_em = now()
    where id = v_id
    returning * into r;
  end if;

  insert into public.central_eventos (tipo, agente, rotina, resumo)
  values ('nota', r.convocada_por, 'reuniao#' || r.id, r.estado || ' · ' || r.titulo);
  return r.id;
end;
$$;

grant execute on function public.central_reuniao_salvar(text, jsonb) to anon, authenticated;

-- ---------- dados iniciais ----------

insert into public.central_setores (id, nome, descricao, ordem) values
  ('reunioes', 'Reuniões', 'Atas e decisões das reuniões entre os agentes', 8)
on conflict (id) do nothing;

insert into public.central_agentes (id, nome, cargo, grupo, setor) values
  ('davi-faturas', 'Davi', 'Monitor de Faturas e Boletos', 'Equipe de rotinas', 'financeiro'),
  ('igor-folha-financeiro', 'Igor', 'Analista RH × Financeiro', 'Equipe de rotinas', 'financeiro'),
  ('beatriz-fiscal', 'Beatriz', 'Assistente Fiscal', 'Equipe de rotinas', 'financeiro'),
  ('henrique-analise-custos', 'Henrique', 'Analista de Acompanhamento de Custos', 'Equipe de rotinas', 'custos'),
  ('laura-calculos-custos', 'Laura', 'Calculista de Custos e Orçamento', 'Equipe de rotinas', 'custos')
on conflict (id) do nothing;
