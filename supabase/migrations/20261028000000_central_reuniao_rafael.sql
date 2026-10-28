-- O Rafael nas reuniões pelo Gestor.IA: abrir uma reunião, falar nela (e gravar as respostas dos agentes geradas
-- no servidor) e encerrar. As três funções exigem o usuário logado na allowlist (central_autorizado) e só são
-- executáveis por "authenticated". Nenhuma tabela, função ou policy existente é alterada.
-- As falas usam o mesmo formato que os agentes já gravam: evento 'nota', rotina 'reuniao#<id>', resumo 'fala: <texto>'.

-- ---------- falar ----------
create or replace function public.central_reuniao_falar(p_reuniao_id bigint, p_agente text, p_texto text)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  r public.central_reunioes;
  v_texto text := trim(coalesce(p_texto, ''));
  v_agente text := trim(coalesce(p_agente, ''));
  v_id bigint;
begin
  if not public.central_autorizado() then raise exception 'sem acesso ao Gestor.IA'; end if;
  select * into r from public.central_reunioes where id = p_reuniao_id;
  if not found then raise exception 'reunião % não existe', p_reuniao_id; end if;
  if r.estado in ('encerrada', 'cancelada') then raise exception 'a reunião % já está %', p_reuniao_id, r.estado; end if;
  if v_agente <> 'rafael' and not (v_agente = r.convocada_por or v_agente = any(r.participantes)) then
    raise exception '% não participa da reunião %', v_agente, p_reuniao_id;
  end if;
  if v_texto = '' then raise exception 'a fala está vazia'; end if;
  if length(v_texto) > 2000 then v_texto := left(v_texto, 2000); end if;

  -- quem fala numa reunião agendada a coloca em andamento
  if r.estado = 'agendada' then
    update public.central_reunioes
       set estado = 'em_andamento', iniciada_em = coalesce(iniciada_em, now()), atualizado_em = now()
     where id = r.id;
    insert into public.central_eventos (tipo, agente, rotina, resumo)
    values ('nota', r.convocada_por, 'reuniao#' || r.id, 'em_andamento · ' || r.titulo);
  end if;

  insert into public.central_eventos (tipo, agente, rotina, resumo)
  values ('nota', v_agente, 'reuniao#' || r.id, 'fala: ' || v_texto)
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------- abrir (o Rafael convoca e a reunião já começa) ----------
create or replace function public.central_reuniao_abrir(p_titulo text, p_participantes text[], p_pauta jsonb)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  v_titulo text := trim(coalesce(p_titulo, ''));
  v_part text[];
  v_pauta jsonb := coalesce(p_pauta, '[]'::jsonb);
  v_id bigint;
begin
  if not public.central_autorizado() then raise exception 'sem acesso ao Gestor.IA'; end if;
  if v_titulo = '' then raise exception 'informe o título da reunião'; end if;
  if jsonb_typeof(v_pauta) <> 'array' then raise exception 'a pauta precisa ser uma lista'; end if;
  -- só agentes cadastrados, sem repetir
  select coalesce(array_agg(distinct a.id), '{}') into v_part
    from public.central_agentes a where a.id = any(coalesce(p_participantes, '{}'));
  if cardinality(v_part) = 0 then raise exception 'escolha ao menos um participante'; end if;

  insert into public.central_reunioes (titulo, convocada_por, participantes, pauta, agendada_para, estado, iniciada_em)
  values (left(v_titulo, 200), 'rafael', v_part, v_pauta, now(), 'em_andamento', now())
  returning id into v_id;

  insert into public.central_eventos (tipo, agente, rotina, resumo)
  values ('nota', 'rafael', 'reuniao#' || v_id, 'em_andamento · ' || left(v_titulo, 200));
  return v_id;
end;
$$;

-- ---------- fechar ----------
create or replace function public.central_reuniao_fechar(p_id bigint, p_ata text)
returns void language plpgsql security definer set search_path = public as $$
declare
  r public.central_reunioes;
begin
  if not public.central_autorizado() then raise exception 'sem acesso ao Gestor.IA'; end if;
  select * into r from public.central_reunioes where id = p_id for update;
  if not found then raise exception 'reunião % não existe', p_id; end if;
  if r.estado in ('encerrada', 'cancelada') then raise exception 'a reunião % já está %', p_id, r.estado; end if;

  update public.central_reunioes
     set estado = 'encerrada',
         iniciada_em = coalesce(iniciada_em, now()),
         encerrada_em = now(),
         ata = coalesce(nullif(trim(p_ata), ''), ata),
         atualizado_em = now()
   where id = p_id;

  insert into public.central_eventos (tipo, agente, rotina, resumo)
  values ('nota', r.convocada_por, 'reuniao#' || p_id, 'encerrada · ' || r.titulo);
end;
$$;

revoke all on function public.central_reuniao_falar(bigint, text, text) from public, anon;
revoke all on function public.central_reuniao_abrir(text, text[], jsonb) from public, anon;
revoke all on function public.central_reuniao_fechar(bigint, text) from public, anon;
grant execute on function public.central_reuniao_falar(bigint, text, text) to authenticated;
grant execute on function public.central_reuniao_abrir(text, text[], jsonb) to authenticated;
grant execute on function public.central_reuniao_fechar(bigint, text) to authenticated;
