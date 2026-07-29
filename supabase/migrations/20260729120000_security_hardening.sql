-- ===========================================================================
-- Hardening di sicurezza — 2026-07-29
--
-- APPLICATO alla base dati viva via MCP `apply_migration` in quattro passi
-- (`harden_search_users_and_partner_unlink`, `unlink_me_rpc_replaces_broken_policy`,
-- `harden_avatars_bucket_and_set_avatar`, `revoke_unneeded_rpc_surface`,
-- `revoke_anon_table_privileges`). Questo file è la copia consolidata per il
-- repo: NON rieseguirlo senza controllare, è già dentro.
--
-- Contesto: audit di sicurezza. Quattro problemi sfruttabili da chiunque si
-- registri, più pulizia di superficie. Vedi i commenti blocco per blocco.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1) search_users distribuiva l'anagrafica completa
--
-- Con query vuota restituiva id + nome + EMAIL IN CHIARO di TUTTI gli utenti,
-- 50 alla volta. Bastava registrarsi. Verificato sul DB vivo prima del fix.
-- Ora: minimo 3 caratteri, email solo per corrispondenza esatta e restituita
-- mascherata, limite 10.
-- ---------------------------------------------------------------------------
create or replace function public.search_users(p_query text default '')
returns table(id uuid, name text, email text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id,
         coalesce(nullif(btrim(p.full_name), ''), split_part(p.email, '@', 1)) as name,
         -- Mascherata: distingue due omonimi, non costruisce una lista di
         -- indirizzi da usare per phishing o rivendita.
         left(p.email, 2) || '***@' || split_part(p.email, '@', 2) as email
  from public.profiles p
  where p.id <> auth.uid()
    -- Query vuota e ricerca a una lettera erano i due modi per farsi
    -- restituire tutti gli utenti in una richiesta sola.
    and length(btrim(coalesce(p_query, ''))) >= 3
    and (
      p.full_name ilike '%' || btrim(p_query) || '%'
      -- Chi l'indirizzo lo conosce già trova la persona; chi vuole enumerare no.
      or lower(p.email) = lower(btrim(p_query))
    )
  order by name
  limit 10;
$$;

revoke execute on function public.search_users(text) from public, anon;
grant  execute on function public.search_users(text) to authenticated;


-- ---------------------------------------------------------------------------
-- 2) Il collegamento socio→utente era a senso unico e irreversibile
--
-- A poteva impostare partners.linked_user_id su QUALSIASI utente B senza
-- avviso, e i tornei di A entravano nel diario e nelle statistiche di B. B non
-- aveva modo di togliersi: la riga `partners` è di A.
--
-- ⚠️ Una policy RLS di UPDATE NON funziona per questo caso: su UPDATE Postgres
-- applica le policy SELECT anche alla riga NUOVA, e sganciandosi il collegato
-- rende la riga invisibile a sé stesso → "new row violates row-level security
-- policy". Verificato su tabella isolata. Serve una SECURITY DEFINER.
-- ---------------------------------------------------------------------------
create or replace function public.unlink_me(p_partner_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if auth.uid() is null then
    raise exception 'Non autenticato';
  end if;

  update public.partners
     set linked_user_id = null
   -- Il filtro su auth.uid() è ciò che rende sicura la SECURITY DEFINER:
   -- si toccano solo le righe che puntano a CHI CHIAMA.
   where linked_user_id = auth.uid()
     and (p_partner_id is null or id = p_partner_id);

  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function public.unlink_me(uuid) from public, anon;
grant  execute on function public.unlink_me(uuid) to authenticated;


-- ---------------------------------------------------------------------------
-- 3) Bucket `avatars`: nessun tetto di dimensione, nessun filtro sui tipi
--
-- Un utente registrato poteva caricare file da GB (costo Storage senza freno)
-- o SVG/HTML serviti da un URL pubblico *.supabase.co.
-- Resta `public = true`: serve perché gli avatar si vedano fra utenti in
-- "Chi c'è oggi".
-- ---------------------------------------------------------------------------
update storage.buckets
set file_size_limit    = 2 * 1024 * 1024,
    allowed_mime_types = array['image/jpeg','image/png','image/webp']
where id = 'avatars';

-- avatars_update_own controllava la riga di partenza ma non quella di arrivo:
-- si poteva rinominare un proprio file dentro la cartella altrui.
drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects
  for update
  to authenticated
  using      (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);


-- ---------------------------------------------------------------------------
-- 4) set_avatar accettava qualunque stringa come URL
--
-- who_is_here restituisce l'avatar_url agli altri utenti e ChiCeOggi lo rende
-- in un <img>: si poteva far scaricare un URL proprio dal browser di chiunque,
-- e loggarne IP e user-agent.
-- ---------------------------------------------------------------------------
create or replace function public.set_avatar(p_url text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_url is not null and p_url !~
     '^https://whgotqljwmtsoulwbzyf\.supabase\.co/storage/v1/object/public/avatars/' then
    raise exception 'URL avatar non valido';
  end if;
  update public.profiles
     set avatar_url = p_url, updated_at = now()
   where id = auth.uid();
end;
$$;

revoke execute on function public.set_avatar(text) from public, anon;
grant  execute on function public.set_avatar(text) to authenticated;


-- ---------------------------------------------------------------------------
-- 5) Superficie REST inutile (WARN del security advisor)
--
-- I trigger non ricontrollano EXECUTE a runtime — il privilegio è verificato
-- alla CREATE TRIGGER — quindi revocare le funzioni trigger non li rompe.
-- Verificato con INSERT + UPDATE reali dopo l'applicazione.
-- ---------------------------------------------------------------------------
revoke execute on function public.seed_demo(uuid)        from public, anon, authenticated;
revoke execute on function public.enforce_plan_limits()  from public, anon, authenticated;
revoke execute on function public.rls_auto_enable()      from public, anon, authenticated;
revoke execute on function public.set_updated_at()       from public, anon, authenticated;
revoke execute on function public.sync_tournament_city() from public, anon, authenticated;
revoke execute on function public.gallery()              from public, anon, authenticated;

-- ⚠️ is_admin() e current_plan() NON si possono revocare ad `authenticated`:
-- is_admin() vive dentro le policy RLS di `profiles`, e le policy sono valutate
-- con i privilegi di chi interroga. Si toglie solo a PUBLIC e anon.
revoke execute on function public.is_admin()     from public, anon;
grant  execute on function public.is_admin()     to authenticated;
revoke execute on function public.current_plan() from public, anon;
grant  execute on function public.current_plan() to authenticated;

revoke execute on function public.dashboard_stats(uuid, text) from public, anon;
revoke execute on function public.tornei_list()               from public, anon;
revoke execute on function public.compagni_list()             from public, anon;
revoke execute on function public.torneo_detail(uuid)         from public, anon;
revoke execute on function public.compagno_detail(uuid)       from public, anon;
revoke execute on function public.placement_rank(text)        from public, anon;
grant  execute on function public.dashboard_stats(uuid, text) to authenticated;
grant  execute on function public.tornei_list()               to authenticated;
grant  execute on function public.compagni_list()             to authenticated;
grant  execute on function public.torneo_detail(uuid)         to authenticated;
grant  execute on function public.compagno_detail(uuid)       to authenticated;
grant  execute on function public.placement_rank(text)        to authenticated;


-- ---------------------------------------------------------------------------
-- 6) `anon` non ha più privilegi sulle tabelle
--
-- Default Supabase: anon aveva SELECT/INSERT/UPDATE/DELETE/TRUNCATE su tutto
-- lo schema public. La RLS lo bloccava e PostgREST non espone TRUNCATE, ma
-- nessuna parte dell'app legge dati senza login: è privilegio a perdere.
-- Difesa in profondità — se un domani una policy venisse scritta male, anon
-- non avrebbe comunque da dove entrare.
-- ---------------------------------------------------------------------------
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables    from anon;
alter default privileges in schema public revoke all on sequences from anon;
