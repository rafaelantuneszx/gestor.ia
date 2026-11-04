-- PROPOSTA, NÃO APLICADA. Aplicar só com o ok do Rafael.
-- Painel de produtividade dos agentes (reunião #5, 30/10/2026, decisão 4). O painel já funciona sem esta migration:
-- a régua está em src/lib/produtividade.ts e o tempo de aprovação é medido pelo intervalo entre decisões seguidas.
-- Esta migration deixa duas coisas melhores:
--   1. central_regua_horas: a régua de horas economizadas por tipo de tarefa vira tabela, para o Rafael ajustar
--      os números sem novo deploy (o painel passa a ler daqui quando ela existir).
--   2. central_demanda_historico.duracao_seg: quanto tempo o Rafael ficou com o cartão aberto na Mesa antes de
--      decidir, gravado pela Mesa logo depois de central_decidir. Troca a estimativa pelo tempo real.
-- Nenhuma tabela, função ou policy existente é alterada (só uma coluna nova, que aceita vazio).

-- ---------- 1. régua de horas economizadas ----------
create table public.central_regua_horas (
  id text primary key,
  nome text not null,
  horas numeric(5, 2) not null check (horas >= 0), -- horas do Rafael por rotina concluída (estimativa)
  exemplo text not null default '',
  padroes text[] not null default '{}', -- expressões regulares testadas no nome da rotina
  ordem integer not null default 0,
  atualizado_em timestamptz not null default now()
);

alter table public.central_regua_horas enable row level security;
create policy central_ler on public.central_regua_horas for select to authenticated using (public.central_autorizado());
-- escrita: o Rafael ajusta pelo Supabase (ou por uma tela futura); nenhuma escrita pela API

insert into public.central_regua_horas (id, nome, horas, exemplo, padroes, ordem) values
  ('mes', 'Relatório ou análise do mês', 2, 'resultado por obra, conferência do mês, prévia de medição, custos por obra',
    array['^resultado-obras', '^conferencia-\d+$', '^previa-medicao', '^acompanhamento-custos', '^projecoes', '^rateio'], 1),
  ('semana', 'Conferência ou análise da semana', 1, 'produção × receita, contratos vencendo, CA × ERP, medições e recebimentos',
    array['^producao-receita', '^contratos', '^conferencia-ca-erp', '^medicoes', '^acompanhamento-socios', '^conversao',
      '^condutores', '^multas', '^reuniao-'], 2),
  ('dia', 'Conferência do dia', 0.5, 'monitor de faturas, vigia do caixa, RDO, KM e revisões, pedidos parados',
    array['^monitor-', '^vigia-', '^conferencia-rdo', '^km-', '^pedidos-', '^financeiro-do-dia', '^fluxo-'], 3),
  ('execucao', 'Execução no sistema ou demanda resolvida', 1, 'lançar e ajustar no ERP, resolver uma demanda, reembolso, compras, passagens',
    array['^demanda', '^execucao-', '-aplicar$', '^mesa-', '^reembolso', '^compras', '^passagens', '^alojamento',
      '^beliches', '^logistica'], 4),
  ('agenda', 'Agenda, e-mail e registro', 0.25, 'agenda do dia, rascunho de e-mail, pauta, lembretes, registro no Monday',
    array['^agenda', '^rascunho', '^pauta', '^lembretes', '^monday', '^registro', '^anotacoes'], 5),
  ('triagem', 'Plantão e triagem', 0.25, 'plantão da Helena, triagem dos sistemas 7h30 e 13h30',
    array['^plantao', '^triagem'], 6),
  ('reuniao', 'Reunião entre agentes', 0, 'conta nas horas trabalhadas; o ganho aparece nas entregas que saem dela',
    array['^reuniao#'], 7),
  ('interno', 'Aprendizado e ajustes internos', 0, 'melhoria do próprio agente, sem entrega para o Rafael',
    array['^aprendizado', '^autonomia', '^comunicacao', '^gestoria'], 8),
  ('outra', 'Outra tarefa', 0.5, 'rotina que ainda não está na régua', '{}', 99);

-- ---------- 2. tempo real de cada decisão na Mesa ----------
alter table public.central_demanda_historico add column duracao_seg integer check (duracao_seg is null or duracao_seg >= 0);

-- A Mesa chama logo depois de central_decidir, com os segundos entre abrir o cartão e clicar na decisão.
-- Grava na última decisão do Rafael sobre aquela demanda (a que acabou de ser feita).
create or replace function public.central_tempo_decisao(p_demanda bigint, p_segundos integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.central_autorizado() then
    raise exception 'sem acesso à Central';
  end if;
  update public.central_demanda_historico set duracao_seg = least(greatest(p_segundos, 0), 3600)
  where id = (
    select id from public.central_demanda_historico
    where demanda_id = p_demanda and por = 'rafael' and acao like 'decisão:%' and duracao_seg is null
      and ts > now() - interval '10 minutes'
    order by ts desc limit 1
  );
end;
$$;
revoke all on function public.central_tempo_decisao(bigint, integer) from public, anon;
grant execute on function public.central_tempo_decisao(bigint, integer) to authenticated;
