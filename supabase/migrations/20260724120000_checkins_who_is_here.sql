-- ============================================================================
-- "Chi c'è oggi?" — check-in di giornata + stanza reciproca.
-- Un utente segnala che è in una città oggi (opt-in) e, SE è a sua volta in
-- check-in lì, vede gli ALTRI utenti presenti nella stessa città lo stesso
-- giorno, per collegarsi come compagno sul posto.
--
-- Contenimento come per `partner_user_link_sharing`: le righe altrui NON sono
-- leggibili direttamente (RLS owner-only), la lettura cross-utente passa solo
-- dalla RPC SECURITY DEFINER `who_is_here`, che espone il minimo (nome, avatar,
-- "cerco compagno", nota) e mai l'email. Le scritture (check-in / check-out)
-- restano lato client (upsert / delete) sotto le policy owner-only.
-- ============================================================================

-- ===========================================================================
-- CHECK_INS (presenza di giornata)
-- ===========================================================================
create table public.check_ins (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  city                text        not null check (char_length(btrim(city)) between 1 and 80),
  -- Chiave di match normalizzata: "Rimini" e " rimini " finiscono nella stessa
  -- stanza. Generata dal DB, non scrivibile dal client.
  city_key            text        generated always as (lower(btrim(city))) stored,
  date                date        not null default current_date,
  -- Torneo proprio eventualmente collegato (prefill / deep-link). Non è la
  -- chiave della stanza: quella è city_key + date. ON DELETE SET NULL così
  -- cancellare il torneo non cancella il check-in.
  tournament_id       uuid        references public.tournaments (id) on delete set null,
  looking_for_partner boolean     not null default true,
  note                text        not null default '' check (char_length(note) <= 200),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  -- Un solo check-in per utente / città / giorno.
  unique (user_id, city_key, date)
);

comment on table public.check_ins is
  'Presenza opt-in di giornata: chi è in una città oggi e se cerca compagno. La lettura cross-utente passa solo dalla RPC who_is_here.';
comment on column public.check_ins.city_key is
  'lower(btrim(city)) — chiave di match della stanza (città normalizzata).';

-- Indice della query "stanza": tutti i presenti in una città in un giorno.
create index check_ins_city_key_date_idx on public.check_ins (city_key, date);

create trigger check_ins_set_updated_at
  before update on public.check_ins
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- ROW LEVEL SECURITY — owner-only (convenzione *_own di init.sql)
-- Nessuno legge il tuo check-in direttamente: la stanza passa dalla RPC.
-- ===========================================================================
alter table public.check_ins enable row level security;

create policy "check_ins_select_own" on public.check_ins for select using (auth.uid() = user_id);
create policy "check_ins_insert_own" on public.check_ins for insert with check (auth.uid() = user_id);
create policy "check_ins_update_own" on public.check_ins for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "check_ins_delete_own" on public.check_ins for delete using (auth.uid() = user_id);

-- ===========================================================================
-- RPC who_is_here(p_city, p_date) — la stanza reciproca.
-- Modellata su search_users: SECURITY DEFINER (legge profiles bypassando la
-- RLS del chiamante), search_path='', esclude sé stessi, EXECUTE revocato ad
-- anon e concesso solo agli autenticati.
--
-- Reciprocità (Q3): restituisce righe SOLO se il chiamante è a sua volta in
-- check-in nella stessa città+giorno — devi metterti in vetrina per vedere gli
-- altri. Espone il minimo: nome + avatar + "cerco compagno" + nota. Mai email.
-- ===========================================================================
create or replace function public.who_is_here(p_city text, p_date date default current_date)
returns table (
  id                  uuid,
  name                text,
  avatar_url          text,
  looking_for_partner boolean,
  note                text
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    c.user_id as id,
    coalesce(
      nullif(btrim(p.full_name), ''),
      nullif(split_part(coalesce(p.email, ''), '@', 1), ''),
      'Utente'
    ) as name,
    p.avatar_url,
    c.looking_for_partner,
    c.note
  from public.check_ins c
  join public.profiles p on p.id = c.user_id
  where c.date = p_date
    and c.city_key = lower(btrim(p_city))
    and c.user_id <> auth.uid()
    -- Reciprocità: vedi la stanza solo se anche tu sei in check-in qui oggi.
    and exists (
      select 1 from public.check_ins me
      where me.user_id = auth.uid()
        and me.date = p_date
        and me.city_key = lower(btrim(p_city))
    )
  order by c.looking_for_partner desc, name asc;
$$;

comment on function public.who_is_here(text, date) is
  'Altri utenti in check-in nella stessa città (city_key) e giorno del chiamante, con reciprocità. Nome+avatar+nota, niente email.';

-- Supabase auto-concede EXECUTE ad anon/authenticated sulle nuove funzioni
-- public: revochiamo esplicitamente anche ad anon (solo autenticati).
revoke execute on function public.who_is_here(text, date) from public, anon;
grant  execute on function public.who_is_here(text, date) to authenticated;
