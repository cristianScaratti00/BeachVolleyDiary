-- Foto reali dei tornei: path su Storage + bucket privato + RLS per-utente.
-- Applicata via MCP (apply_migration "tournament_photos_storage"). Idempotente.

-- 1) Path dell'oggetto su Storage (null = vecchio segnaposto solo-colore).
alter table public.photos add column if not exists storage_path text;

-- 2) Bucket privato per le foto dei tornei (max 5 MB, solo immagini).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tournament-photos', 'tournament-photos', false, 5242880,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 3) RLS su storage.objects: ogni utente vede/scrive solo la propria cartella.
--    Convenzione path: {auth.uid()}/{tournament_id}/{uuid}.{ext}
drop policy if exists "tournament_photos_select_own" on storage.objects;
drop policy if exists "tournament_photos_insert_own" on storage.objects;
drop policy if exists "tournament_photos_update_own" on storage.objects;
drop policy if exists "tournament_photos_delete_own" on storage.objects;

create policy "tournament_photos_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'tournament-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "tournament_photos_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'tournament-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "tournament_photos_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'tournament-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'tournament-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "tournament_photos_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'tournament-photos' and (storage.foldername(name))[1] = auth.uid()::text);
