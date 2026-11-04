-- PROPOSTA, NÃO APLICADA. Aplicar só com aprovação explícita, depois de mudar o painel.py e o src/lib/banco.ts.
-- Objetivo: tirar do banco o nome do dono, sem quebrar quem ainda grava os valores antigos.
-- Enquanto o painel.py não mudar, os valores antigos continuam aceitos e são convertidos na escrita.
-- Antes de aplicar: conferir restrições (check) de estado em central_demandas e as funções central_* que comparam esses valores.

-- 1. Converte os valores antigos ao gravar.
create or replace function public.central_neutralizar_demanda()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.estado = 'aguardando-' || 'rafael' then new.estado := 'aguardando-voce'; end if;
  if new.para = 'rafael' then new.para := 'gestor'; end if;
  if new.de = 'rafael' then new.de := 'gestor'; end if;
  return new;
end;
$$;
create trigger central_demandas_neutralizar before insert or update on public.central_demandas
  for each row execute function public.central_neutralizar_demanda();

-- 2. Nova assinatura com nome neutro. A antiga passa a delegar para ela, com os mesmos parâmetros.
-- (O corpo atual de central_criar_demanda deve ser movido para central_criar_demanda_gestor na hora de aplicar.)
-- create function public.central_criar_demanda_gestor(p_token text, p_de text, p_para text, p_titulo text, p_detalhe text,
--   p_prioridade text, p_precisa_gestor boolean, p_setor text, p_documento uuid) ...
-- create or replace function public.central_criar_demanda(p_token text, p_de text, p_para text, p_titulo text, p_detalhe text,
--   p_prioridade text, p_precisa_rafael boolean, p_setor text, p_documento uuid) ...
--   select public.central_criar_demanda_gestor(p_token, p_de, p_para, p_titulo, p_detalhe, p_prioridade, p_precisa_rafael, p_setor, p_documento);

-- 3. Só depois de tudo acima, converter o histórico:
-- update public.central_demandas set estado = 'aguardando-voce' where estado = 'aguardando-' || 'rafael';
-- update public.central_demandas set para = 'gestor' where para = 'rafael';
-- update public.central_demandas set de = 'gestor' where de = 'rafael';
-- update public.central_eventos set agente = 'gestor' where agente = 'rafael';
