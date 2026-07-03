-- ============================================================================
-- Beach Volley Diary — schema iniziale
-- Postgres / Supabase · multi-utente con Row Level Security
-- ============================================================================
-- Modello: partners (soci) · tournaments (tornei) · matches (partite)
--          · match_sets (punteggi per set) · photos (galleria)
-- Ogni riga appartiene a un utente (auth.users) ed è isolata via RLS.
-- ============================================================================

-- gen_random_uuid() è nel core di Postgres 13+ (Supabase usa PG15+).

-- ---------------------------------------------------------------------------
-- Helper: aggiorna updated_at ad ogni UPDATE
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ===========================================================================
-- PARTNERS (compagni / soci)
-- ===========================================================================
create table public.partners (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  name       text        not null check (char_length(trim(name)) between 1 and 80),
  color      text        not null default '#00B4D8' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.partners is 'Compagni di gioco (soci), anche generici senza partite.';

create index partners_user_id_idx on public.partners (user_id);

create trigger partners_set_updated_at
  before update on public.partners
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- TOURNAMENTS (tornei)
-- ===========================================================================
create table public.tournaments (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  name       text        not null check (char_length(trim(name)) between 1 and 120),
  date       date        not null,
  city       text        not null default '',
  category   text        not null default 'Amatoriale'    check (category in ('Amatoriale','Open','Serie','Pro')),
  format     text        not null default '2vs2'          check (format   in ('2vs2','3vs3','4vs4')),
  surface    text        not null default 'Sabbia outdoor' check (surface in ('Sabbia outdoor','Indoor','Erba')),
  placement  text        not null default 'Gironi'        check (placement in ('1° 🏆','2°','3°','Quarti','Ottavi','Gironi','In corso')),
  color      text        not null default '#FFD23F' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  emoji      text        not null default '🏖️',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.tournaments is 'Tornei di beach volley.';

create index tournaments_user_id_date_idx on public.tournaments (user_id, date desc);

create trigger tournaments_set_updated_at
  before update on public.tournaments
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- MATCHES (partite)
-- ===========================================================================
create table public.matches (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  tournament_id uuid        not null references public.tournaments (id) on delete cascade,
  partner_id    uuid        not null references public.partners (id)    on delete restrict,
  opponents     text        not null default 'Avversari',
  phase         text        not null default 'Girone' check (phase in ('Girone','Ottavi','Quarti','Semifinale','Finale')),
  note          text        not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.matches is 'Partite giocate in un torneo con un compagno.';
comment on column public.matches.partner_id is 'ON DELETE RESTRICT: non si può eliminare un socio che ha partite.';

create index matches_user_id_idx       on public.matches (user_id);
create index matches_tournament_id_idx on public.matches (tournament_id);
create index matches_partner_id_idx    on public.matches (partner_id);

create trigger matches_set_updated_at
  before update on public.matches
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- MATCH_SETS (punteggi per set) — normalizzato
-- ===========================================================================
create table public.match_sets (
  id         uuid     primary key default gen_random_uuid(),
  match_id   uuid     not null references public.matches (id) on delete cascade,
  set_number smallint not null check (set_number between 1 and 5),
  us         smallint not null check (us   between 0 and 99),
  them       smallint not null check (them between 0 and 99),
  unique (match_id, set_number)
);

comment on table public.match_sets is 'Un record per set: us = punti nostri, them = punti avversari.';

-- ===========================================================================
-- PHOTOS (galleria — segnaposti colorati collegati a un torneo)
-- ===========================================================================
create table public.photos (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  tournament_id uuid        references public.tournaments (id) on delete cascade,
  caption       text        not null default '',
  color         text        not null default '#FF6B35' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.photos is 'Ricordi/foto (placeholder colorati) collegati a un torneo.';

create index photos_user_id_idx       on public.photos (user_id);
create index photos_tournament_id_idx on public.photos (tournament_id);

create trigger photos_set_updated_at
  before update on public.photos
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- VIEW: match_scores — aggrega i set per partita (come res() nel frontend)
-- security_invoker: applica la RLS delle tabelle sottostanti al chiamante.
-- ===========================================================================
create or replace view public.match_scores
with (security_invoker = on) as
select
  m.id            as match_id,
  m.user_id,
  m.tournament_id,
  m.partner_id,
  count(s.id) filter (where s.us  > s.them)                                 as sets_us,
  count(s.id) filter (where s.them > s.us)                                  as sets_them,
  coalesce(sum(s.us),   0)                                                  as points_us,
  coalesce(sum(s.them), 0)                                                  as points_them,
  coalesce(sum(s.us),   0) - coalesce(sum(s.them), 0)                       as point_diff,
  count(s.id) filter (where s.us > s.them)
    > count(s.id) filter (where s.them > s.us)                             as won
from public.matches m
left join public.match_sets s on s.match_id = m.id
group by m.id;

comment on view public.match_scores is 'Esito e punti aggregati per partita, a partire dai set.';

-- ===========================================================================
-- ROW LEVEL SECURITY
-- ===========================================================================
alter table public.partners    enable row level security;
alter table public.tournaments enable row level security;
alter table public.matches     enable row level security;
alter table public.photos      enable row level security;
alter table public.match_sets  enable row level security;

-- ---- partners ----
create policy "partners_select_own" on public.partners for select using (auth.uid() = user_id);
create policy "partners_insert_own" on public.partners for insert with check (auth.uid() = user_id);
create policy "partners_update_own" on public.partners for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "partners_delete_own" on public.partners for delete using (auth.uid() = user_id);

-- ---- tournaments ----
create policy "tournaments_select_own" on public.tournaments for select using (auth.uid() = user_id);
create policy "tournaments_insert_own" on public.tournaments for insert with check (auth.uid() = user_id);
create policy "tournaments_update_own" on public.tournaments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tournaments_delete_own" on public.tournaments for delete using (auth.uid() = user_id);

-- ---- matches ----
create policy "matches_select_own" on public.matches for select using (auth.uid() = user_id);
create policy "matches_insert_own" on public.matches for insert with check (auth.uid() = user_id);
create policy "matches_update_own" on public.matches for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "matches_delete_own" on public.matches for delete using (auth.uid() = user_id);

-- ---- photos ----
create policy "photos_select_own" on public.photos for select using (auth.uid() = user_id);
create policy "photos_insert_own" on public.photos for insert with check (auth.uid() = user_id);
create policy "photos_update_own" on public.photos for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "photos_delete_own" on public.photos for delete using (auth.uid() = user_id);

-- ---- match_sets (eredita l'ownership dalla partita) ----
create policy "match_sets_select_own" on public.match_sets for select
  using (exists (select 1 from public.matches m where m.id = match_id and m.user_id = auth.uid()));
create policy "match_sets_insert_own" on public.match_sets for insert
  with check (exists (select 1 from public.matches m where m.id = match_id and m.user_id = auth.uid()));
create policy "match_sets_update_own" on public.match_sets for update
  using (exists (select 1 from public.matches m where m.id = match_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.matches m where m.id = match_id and m.user_id = auth.uid()));
create policy "match_sets_delete_own" on public.match_sets for delete
  using (exists (select 1 from public.matches m where m.id = match_id and m.user_id = auth.uid()));
