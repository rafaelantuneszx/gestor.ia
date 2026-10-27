-- Bucket privado para os PDFs do arquivo da Central. Só quem está em central_usuarios lê,
-- e só por link assinado gerado no servidor. Nenhuma policy existente do Storage é alterada.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('central-arquivo', 'central-arquivo', false, 20971520, array['application/pdf', 'text/markdown', 'image/png', 'image/jpeg']);

create policy central_arquivo_ler on storage.objects for select to authenticated
  using (bucket_id = 'central-arquivo' and public.central_autorizado());
