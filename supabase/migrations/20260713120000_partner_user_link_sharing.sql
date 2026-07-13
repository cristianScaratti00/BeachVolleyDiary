-- ============================================================================
-- Collegamento socio ↔ utente app + condivisione tornei (una via, sola lettura).
-- Un utente A collega un proprio socio (partners.linked_user_id) all'account di
-- un altro utente B: da quel momento B può LEGGERE i tornei di A il cui compagno
-- principale è quel socio (e le relative partite/set). Nessuna scrittura: B non
-- può modificare i dati di A. La condivisione è additiva rispetto alle policy
-- "own" esistenti (RLS = OR delle policy). Le foto NON sono condivise (restano
-- nel bucket privato per-utente).
-- ============================================================================

-- 1) Colonna: a quale utente app corrisponde questo socio (null = non collegato).
alter table public.partners
  add column linked_user_id uuid references auth.users (id) on delete set null;

create index partners_linked_user_id_idx on public.partners (linked_user_id);

comment on column public.partners.linked_user_id is
  'Utente app rappresentato da questo socio: se valorizzato, quell''utente vede in sola lettura i tornei giocati con questo socio.';

-- 2) Elenco/ricerca degli utenti a cui collegare un socio (ricerca per nome).
--    SECURITY DEFINER: legge public.profiles bypassando la RLS del chiamante.
--    Esclude sé stessi; query vuota = elenco (max 50). NB: espone la rubrica
--    utenti (nome + email) a chi è autenticato — accettabile per il "collega
--    socio". Solo utenti autenticati possono chiamarla.
create or replace function public.search_users(p_query text default '')
returns table (id uuid, name text, email text)
language sql security definer set search_path = '' stable as $$
  select p.id,
         coalesce(nullif(trim(p.full_name), ''), split_part(p.email, '@', 1)) as name,
         p.email
  from public.profiles p
  where p.id <> auth.uid()
    and (
      coalesce(trim(p_query), '') = ''
      or p.full_name ilike '%' || p_query || '%'
      or p.email     ilike '%' || p_query || '%'
    )
  order by name
  limit 50;
$$;

-- Supabase auto-concede EXECUTE ad anon/authenticated sulle nuove funzioni public:
-- revochiamo esplicitamente anche ad anon (solo gli autenticati possono cercare).
revoke execute on function public.search_users(text) from public, anon;
grant  execute on function public.search_users(text) to authenticated;

-- 3) Policy di sola lettura per l'utente collegato (additive).

-- partners: B può leggere il record del socio che lo rappresenta.
create policy "partners_select_linked" on public.partners for select
  using (linked_user_id = auth.uid());

-- tournaments: leggibili da B se il compagno principale del torneo è collegato a B.
create policy "tournaments_select_shared" on public.tournaments for select
  using (exists (
    select 1 from public.partners p
    where p.id = tournaments.partner_id and p.linked_user_id = auth.uid()
  ));

-- matches: le partite dei tornei condivisi con B.
create policy "matches_select_shared" on public.matches for select
  using (exists (
    select 1 from public.tournaments t
    join public.partners p on p.id = t.partner_id
    where t.id = matches.tournament_id and p.linked_user_id = auth.uid()
  ));

-- match_sets: i set delle partite dei tornei condivisi con B.
create policy "match_sets_select_shared" on public.match_sets for select
  using (exists (
    select 1
    from public.matches m
    join public.tournaments t on t.id = m.tournament_id
    join public.partners p on p.id = t.partner_id
    where m.id = match_sets.match_id and p.linked_user_id = auth.uid()
  ));
