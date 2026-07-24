-- ============================================================================
-- LUOGHI (venues) — la città smette di essere testo libero.
--
-- `tournaments.city` è `text not null default ''` senza normalizzazione: la
-- stessa spiaggia si scrive "Riccione", "riccione " o "Riccione (RN)" e vale
-- tre posti diversi in ogni conteggio. Questa migration promuove il posto a
-- entità: nome, città, coordinate, superficie tipica.
--
-- CATALOGO GLOBALE (scelta di prodotto, ≠ dalle altre tabelle che sono
-- owner-only): "Bagno 26 · Riccione" è lo stesso posto per tutti, quindi la
-- riga è unica su (city_key, name_key) e leggibile da ogni utente autenticato.
-- Solo chi l'ha creata può modificarla o eliminarla (`user_id`), come per una
-- voce di rubrica condivisa. Conseguenza: niente policy "select_shared" sul
-- modello di partner_user_link_sharing — la lettura è già di tutti.
--
-- PURAMENTE ADDITIVA: `tournaments.city` resta `not null` e popolato (snapshot
-- testuale scritto insieme a `venue_id`), `venue_id` è nullable. Un torneo
-- inserito senza luogo — da un client che non conosce i venue, o creato prima
-- di oggi — continua a funzionare e a leggersi.
--
-- Applicata via MCP (apply_migration "venues"). NON usare `supabase db push`:
-- la cronologia migration remota è disallineata (vedi nota di progetto).
-- ============================================================================

-- ===========================================================================
-- VENUES (luoghi di gioco)
-- ===========================================================================
create table public.venues (
  id         uuid        primary key default gen_random_uuid(),
  -- Chi ha creato la voce del catalogo. ON DELETE SET NULL (non CASCADE come
  -- le tabelle owner-only): il luogo sopravvive a chi l'ha inserito, altrimenti
  -- cancellare un account svuoterebbe i tornei altrui del loro posto.
  user_id    uuid        default auth.uid() references auth.users (id) on delete set null,
  name       text        not null check (char_length(btrim(name)) between 1 and 80),
  -- Chiavi normalizzate come `check_ins.city_key`: "Bagno 26" e " bagno 26 "
  -- sono lo stesso posto. Generate dal DB, non scrivibili dal client.
  name_key   text        generated always as (lower(btrim(name))) stored,
  city       text        not null default '' check (char_length(btrim(city)) <= 80),
  city_key   text        generated always as (lower(btrim(city))) stored,
  -- Coordinate facoltative: o entrambe o nessuna (un solo valore non è un punto).
  lat        double precision check (lat between  -90 and  90),
  lng        double precision check (lng between -180 and 180),
  -- Superficie tipica: è un default SUGGERITO al form torneo, non un vincolo —
  -- il torneo conserva la propria `surface`. Stesso CHECK di tournaments.
  surface    text        check (surface in ('Sabbia outdoor','Indoor','Erba')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint venues_coords_paired check ((lat is null) = (lng is null)),
  -- Un solo "Bagno 26 · Riccione" per tutti: è ciò che rende il catalogo un
  -- catalogo invece di N elenchi paralleli.
  unique (city_key, name_key)
);

comment on table public.venues is
  'Luoghi di gioco (spiagge/impianti). Catalogo globale: leggibile da tutti gli autenticati, modificabile da chi ha creato la riga.';
comment on column public.venues.name_key is 'lower(btrim(name)) — metà della chiave di unicità del catalogo.';
comment on column public.venues.city_key is 'lower(btrim(city)) — stessa normalizzazione di check_ins.city_key.';
comment on column public.venues.surface is 'Superficie tipica del luogo: default suggerito nel form torneo, non un vincolo.';

-- L'unique (city_key, name_key) crea già l'indice che serve alle ricerche per
-- città (city_key ne è il prefisso): un `venues_city_key_idx` sarebbe ridondante.
-- Resta l'indice sulla FK, che Supabase segnala altrimenti come "unindexed FK".
create index venues_user_id_idx on public.venues (user_id);

create trigger venues_set_updated_at
  before update on public.venues
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- TOURNAMENTS.VENUE_ID — copia esatta di tournaments_partner.sql.
-- ON DELETE SET NULL: eliminare un luogo non tocca i tornei, che restano
-- leggibili grazie allo snapshot `city`.
-- ===========================================================================
alter table public.tournaments
  add column venue_id uuid references public.venues (id) on delete set null;

create index tournaments_venue_id_idx on public.tournaments (venue_id);

comment on column public.tournaments.venue_id is
  'Luogo di gioco (catalogo condiviso). Null = torneo senza luogo: vale lo snapshot testuale in `city`.';

-- ===========================================================================
-- ROW LEVEL SECURITY
-- Lettura per tutti gli autenticati (è un catalogo), scrittura owner-only
-- secondo la convenzione *_own di init.sql.
-- ===========================================================================
alter table public.venues enable row level security;

-- `auth.uid()` è avvolto in `(select …)` — le policy più vecchie del progetto
-- usano la forma nuda e l'advisor `auth_rls_initplan` le segnala tutte: così
-- la funzione è valutata una volta invece che per riga. Stessa semantica.
-- `(select auth.uid()) is not null` = "sei autenticato": anon non legge il catalogo.
create policy "venues_select_all" on public.venues for select using ((select auth.uid()) is not null);
create policy "venues_insert_own" on public.venues for insert with check ((select auth.uid()) = user_id);
create policy "venues_update_own" on public.venues for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "venues_delete_own" on public.venues for delete using ((select auth.uid()) = user_id);

-- ===========================================================================
-- BACKFILL — un luogo per ogni città già scritta, i tornei ci si agganciano.
-- Fonde SOLO le varianti di maiuscole/spazi ("Rimini" / "rimini "), che sono
-- oggettive. "Riccione" vs "Riccione (RN)" resta separato: capire se sono lo
-- stesso posto richiede l'occhio di chi c'era → "Unisci a…" nella UI.
-- ===========================================================================

-- Ortografia da tenere: quella del torneo più recente in quella città.
-- La riga è attribuita a chi ha giocato lì per ultimo (è chi potrà correggerla).
insert into public.venues (user_id, name, city)
select distinct on (lower(btrim(t.city)))
       t.user_id, btrim(t.city), btrim(t.city)
from public.tournaments t
where btrim(t.city) <> ''
order by lower(btrim(t.city)), t.date desc, t.created_at desc;

-- Aggancio: match sulle DUE chiavi, così punta esattamente alla riga appena
-- creata dal backfill e non a un eventuale omonimo con nome diverso.
update public.tournaments t
   set venue_id = v.id
  from public.venues v
 where t.venue_id is null
   and btrim(t.city) <> ''
   and v.city_key = lower(btrim(t.city))
   and v.name_key = lower(btrim(t.city));

-- ===========================================================================
-- RI-SINCRONIZZAZIONE DELLO SNAPSHOT
-- Rinominare un luogo deve raccontare la stessa storia anche a chi legge solo
-- `tournaments.city` (client senza venue). SECURITY INVOKER di proposito: la
-- propagazione si ferma ai tornei che il chiamante può già scrivere — nessuno
-- riscrive righe altrui rinominando una voce del catalogo condiviso. Per gli
-- altri utenti lo snapshot resta quello vecchio, ma l'app legge comunque il
-- nome vivo dal join, quindi la differenza si vede solo fuori dall'app.
-- ===========================================================================
create or replace function public.sync_tournament_city()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.city_key is distinct from old.city_key
     or new.name_key is distinct from old.name_key then
    update public.tournaments
       set city = coalesce(nullif(btrim(new.city), ''), btrim(new.name))
     where venue_id = new.id;
  end if;
  return new;
end;
$$;

comment on function public.sync_tournament_city() is
  'Propaga la rinomina di un luogo sullo snapshot tournaments.city (solo sui tornei scrivibili dal chiamante).';

-- Le funzioni-trigger nascono con EXECUTE su PUBLIC: va revocato lì
-- (vedi revoke_trigger_fn_public.sql). Il trigger continua a funzionare.
revoke execute on function public.sync_tournament_city() from public;

-- AFTER update: in un BEFORE le colonne generate (name_key/city_key) non sono
-- ancora calcolate e il confronto sarebbe sempre falso.
create trigger venues_sync_tournament_city
  after update on public.venues
  for each row execute function public.sync_tournament_city();

-- ===========================================================================
-- RPC — il luogo accanto agli aggregati di schermata.
-- `city` resta nel payload (contratto invariato per chi non conosce i venue);
-- `venue` è la chiave nuova, null quando il torneo non ha un luogo.
-- Invariati: security invoker + search_path=''.
-- NB: `placement_rank` NON viene ridefinita qui — la sua versione corrente
-- (che gestisce 'Semifinale') resta quella che trova.
-- ===========================================================================
create or replace function public.tornei_list()
returns jsonb language sql security invoker set search_path='' stable as $$
  with per as (
    select t.id, t.name, t.category, t.city, t.date, t.format, t.placement, t.partner_id, t.venue_id,
           public.placement_rank(t.placement) as rank,
           count(x.match_id) as match_count,
           count(x.match_id) filter (where x.won) as won
    from public.tournaments t
    left join public.match_scores x on x.tournament_id = t.id
    where t.user_id = auth.uid()
    group by t.id
  )
  select jsonb_build_object(
    'tornei', coalesce((select jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'category', category, 'city', city, 'date', date, 'format', format,
        'placement', placement, 'rank', rank,
        'partner', (select p.name from public.partners p where p.id = per.partner_id),
        'venue', (select jsonb_build_object('id', v.id, 'name', v.name, 'city', v.city, 'lat', v.lat, 'lng', v.lng)
                    from public.venues v where v.id = per.venue_id),
        'match_count', match_count, 'won', won, 'lost', match_count - won,
        'win_pct', case when match_count > 0 then round(100.0 * won / match_count) else 0 end
      ) order by date desc) from per), '[]'::jsonb),
    't_played', (select count(*) from per),
    'podi',     (select count(*) filter (where rank <= 3) from per),
    'best_rank',(select coalesce(min(rank), 9) from per)
  );
$$;

create or replace function public.torneo_detail(p_id uuid)
returns jsonb language sql security invoker set search_path='' stable as $$
  with t as (select * from public.tournaments where id = p_id and user_id = auth.uid()),
  ms as (
    select m.id, m.phase, m.opponents, m.note, m.created_at,
           (select p.name from public.partners p where p.id = m.partner_id) as partner_name,
           coalesce(x.won, false) as won,
           coalesce(x.sets_us, 0) as sets_us, coalesce(x.sets_them, 0) as sets_them,
           coalesce(x.points_us, 0) as pf, coalesce(x.points_them, 0) as pa,
           (select jsonb_agg(jsonb_build_object('us', s.us, 'them', s.them) order by s.set_number)
              from public.match_sets s where s.match_id = m.id) as sets
    from public.matches m
    left join public.match_scores x on x.match_id = m.id
    where m.tournament_id = p_id
  ),
  agg as (
    select count(*) as played, count(*) filter (where won) as won,
           coalesce(sum(sets_us),0) as sw, coalesce(sum(sets_them),0) as sl,
           coalesce(sum(pf),0) as pf, coalesce(sum(pa),0) as pa
    from ms
  )
  select case when not exists (select 1 from t) then jsonb_build_object('error','not_found')
  else jsonb_build_object(
    'id', (select id from t), 'name', (select name from t), 'category', (select category from t),
    'city', (select city from t), 'date', (select date from t), 'surface', (select surface from t),
    'placement', (select placement from t), 'rank', public.placement_rank((select placement from t)),
    'partner', (select p.name from public.partners p where p.id = (select partner_id from t)),
    'venue', (select jsonb_build_object('id', v.id, 'name', v.name, 'city', v.city, 'lat', v.lat, 'lng', v.lng)
                from public.venues v where v.id = (select venue_id from t)),
    'played', (select played from agg), 'won', (select won from agg), 'lost', (select played - won from agg),
    'win_pct', (select case when played > 0 then round(100.0 * won / played) else 0 end from agg),
    'sets_won', (select sw from agg), 'sets_lost', (select sl from agg),
    'point_diff', (select pf - pa from agg),
    'matches', coalesce((select jsonb_agg(jsonb_build_object(
        'id', id, 'phase', phase, 'opponents', opponents, 'note', note,
        'partner_name', partner_name, 'won', won, 'sets', coalesce(sets, '[]'::jsonb)
      ) order by created_at) from ms), '[]'::jsonb),
    'photos', coalesce((select jsonb_agg(jsonb_build_object('color', color, 'caption', caption) order by created_at desc)
                          from public.photos where tournament_id = p_id), '[]'::jsonb)
  ) end;
$$;

-- ===========================================================================
-- SEED DEMO — i tre tornei demo nascono con il loro luogo e le coordinate.
-- CREATE OR REPLACE azzera i settings della funzione: `set search_path = ''`
-- va ri-dichiarato (vedi harden_function_search_path.sql).
-- I luoghi sono nel catalogo globale: `on conflict do nothing` + rilettura,
-- così un secondo utente che chiama seed_demo riusa le righe già esistenti.
-- ===========================================================================
create or replace function public.seed_demo(p_user uuid default auth.uid())
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  luca uuid; andrea uuid;
  v_cervia uuid; v_jesolo uuid; v_rimini uuid;
  t1 uuid; t2 uuid; t3 uuid;
  m uuid;
begin
  if p_user is null then
    raise exception 'seed_demo: user id mancante — esegui da una sessione autenticata';
  end if;

  -- soci
  insert into public.partners (user_id, name, color) values (p_user, 'Luca',   '#00B4D8') returning id into luca;
  insert into public.partners (user_id, name, color) values (p_user, 'Andrea', '#FF477E') returning id into andrea;

  -- luoghi (catalogo condiviso: se ci sono già, si riusano)
  insert into public.venues (user_id, name, city, lat, lng, surface) values
    (p_user, 'Cervia', 'Cervia', 44.26170, 12.35360, 'Sabbia outdoor'),
    (p_user, 'Jesolo', 'Jesolo', 45.49000, 12.64000, 'Sabbia outdoor'),
    (p_user, 'Rimini', 'Rimini', 44.06780, 12.56950, 'Sabbia outdoor')
  on conflict (city_key, name_key) do nothing;

  select id into v_cervia from public.venues where city_key = 'cervia' and name_key = 'cervia';
  select id into v_jesolo from public.venues where city_key = 'jesolo' and name_key = 'jesolo';
  select id into v_rimini from public.venues where city_key = 'rimini' and name_key = 'rimini';

  -- tornei (city resta scritta accanto a venue_id: è lo snapshot)
  insert into public.tournaments (user_id, name, date, city, venue_id, category, format, surface, placement, color, emoji)
    values (p_user, 'Sunset Series Cervia', '2025-06-28', 'Cervia', v_cervia, 'Amatoriale', '2vs2', 'Sabbia outdoor', '1° 🏆', '#FF6B35', '🌅') returning id into t1;
  insert into public.tournaments (user_id, name, date, city, venue_id, category, format, surface, placement, color, emoji)
    values (p_user, 'Beach Open Jesolo',    '2025-07-19', 'Jesolo', v_jesolo, 'Open',       '2vs2', 'Sabbia outdoor', 'Gironi', '#00B4D8', '🏐') returning id into t2;
  insert into public.tournaments (user_id, name, date, city, venue_id, category, format, surface, placement, color, emoji)
    values (p_user, 'Summer Cup Rimini',    '2025-08-14', 'Rimini', v_rimini, 'Amatoriale', '2vs2', 'Sabbia outdoor', '2°',     '#FFD23F', '🏖️') returning id into t3;

  -- partite + set
  insert into public.matches (user_id, tournament_id, partner_id, opponents, phase, note)
    values (p_user, t1, luca, 'Rossi / Neri', 'Girone', '') returning id into m;
  insert into public.match_sets (match_id, set_number, us, them) values (m,1,21,14),(m,2,21,16);

  insert into public.matches (user_id, tournament_id, partner_id, opponents, phase, note)
    values (p_user, t1, luca, 'Gialli / Blu', 'Quarti', '') returning id into m;
  insert into public.match_sets (match_id, set_number, us, them) values (m,1,21,18),(m,2,21,19);

  insert into public.matches (user_id, tournament_id, partner_id, opponents, phase, note)
    values (p_user, t1, luca, 'Ferrari / Conti', 'Semifinale', 'Rimonta nel terzo set!') returning id into m;
  insert into public.match_sets (match_id, set_number, us, them) values (m,1,21,19),(m,2,19,21),(m,3,15,12);

  insert into public.matches (user_id, tournament_id, partner_id, opponents, phase, note)
    values (p_user, t1, luca, 'Marini / Sala', 'Finale', 'Titolo vinto 🏆') returning id into m;
  insert into public.match_sets (match_id, set_number, us, them) values (m,1,21,18),(m,2,22,20);

  insert into public.matches (user_id, tournament_id, partner_id, opponents, phase, note)
    values (p_user, t2, andrea, 'Costa / Riva', 'Girone', '') returning id into m;
  insert into public.match_sets (match_id, set_number, us, them) values (m,1,15,21),(m,2,18,21);

  insert into public.matches (user_id, tournament_id, partner_id, opponents, phase, note)
    values (p_user, t2, andrea, 'Greco / Villa', 'Girone', '') returning id into m;
  insert into public.match_sets (match_id, set_number, us, them) values (m,1,21,19),(m,2,19,21),(m,3,10,15);

  insert into public.matches (user_id, tournament_id, partner_id, opponents, phase, note)
    values (p_user, t2, andrea, 'De Luca / Fabbri', 'Girone', '') returning id into m;
  insert into public.match_sets (match_id, set_number, us, them) values (m,1,21,17),(m,2,21,15);

  insert into public.matches (user_id, tournament_id, partner_id, opponents, phase, note)
    values (p_user, t3, luca, 'Longo / Serra', 'Girone', '') returning id into m;
  insert into public.match_sets (match_id, set_number, us, them) values (m,1,21,15),(m,2,21,18);

  insert into public.matches (user_id, tournament_id, partner_id, opponents, phase, note)
    values (p_user, t3, luca, 'Basile / Rizzo', 'Girone', '') returning id into m;
  insert into public.match_sets (match_id, set_number, us, them) values (m,1,19,21),(m,2,21,17),(m,3,15,12);

  insert into public.matches (user_id, tournament_id, partner_id, opponents, phase, note)
    values (p_user, t3, luca, 'Palumbo / Testa', 'Quarti', '') returning id into m;
  insert into public.match_sets (match_id, set_number, us, them) values (m,1,21,16),(m,2,21,19);

  insert into public.matches (user_id, tournament_id, partner_id, opponents, phase, note)
    values (p_user, t3, luca, 'Moretti / Fontana', 'Semifinale', '') returning id into m;
  insert into public.match_sets (match_id, set_number, us, them) values (m,1,22,20),(m,2,18,21),(m,3,15,11);

  insert into public.matches (user_id, tournament_id, partner_id, opponents, phase, note)
    values (p_user, t3, luca, 'Barbieri / Gatti', 'Finale', 'Persa al terzo, che peccato') returning id into m;
  insert into public.match_sets (match_id, set_number, us, them) values (m,1,18,21),(m,2,21,19),(m,3,12,15);

  -- foto
  insert into public.photos (user_id, tournament_id, color, caption) values
    (p_user, t1, '#FF6B35', 'Trofeo Cervia'),
    (p_user, t1, '#00B4D8', 'Match point finale'),
    (p_user, t3, '#FFD23F', 'Campo centrale Rimini'),
    (p_user, t3, '#FF477E', 'Tramonto sul mare'),
    (p_user, t2, '#1B2A4A', 'Warm-up Jesolo');
end;
$$;

comment on function public.seed_demo(uuid) is 'Popola i dati demo per l''utente indicato (default: utente loggato).';
