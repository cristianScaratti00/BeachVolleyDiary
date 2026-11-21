-- ============================================================================
-- Campionato Italiano per Società (CIPS, FIPAV): le tappe giocate, a parte.
--
-- Nel CIPS non ci sono incontri fra società: è un circuito di tornei 2vs2 (le
-- «tappe») in cui ogni coppia gioca per la sua società, e la società somma i
-- 3 migliori piazzamenti delle sue coppie in ogni tappa. Si registra quindi la
-- tappa come un torneo, con i campi della FIPAV.
--
-- Scelta dell'utente (21/11/2026): le tappe NON entrano nelle statistiche
-- esistenti. Per questo vivono in tabelle loro e non in `tournaments`: nessuna
-- RPC di oggi (dashboard_stats, tornei_list, torneo_detail, compagni_list,
-- compagno_detail, gallery), nessun `derive*` del client e nemmeno l'app Expo
-- le leggono, quindi i numeri attuali non possono cambiare per costruzione.
--
--   club_seasons     l'iscrizione: stagione FIPAV («2026/27») · società · M/F
--   club_stages      la tappa giocata, dentro un'iscrizione
--   club_matches     le partite della tappa (coppia contro coppia)
--   club_match_sets  i set di ogni partita
--
-- Ownership: `user_id = auth.uid()` sulle prime tre; i set la ereditano dalla
-- partita (stesso schema di `match_sets`). Il compagno è una riga di
-- `partners` (lo stesso elenco dei tornei): eliminarlo lascia la tappa con
-- «nessuno» (on delete set null), come per i tornei.
--
-- I valori ammessi stanno anche in src/lib/campionato.ts (CIPS_*): si cambiano
-- insieme. Le lunghezze dei testi seguono src/lib/lunghezze.ts (LIMITI).
--
-- Additiva e idempotente: si applica via CLI (`supabase db query --linked`,
-- non `db push`) e si registra in supabase_migrations.schema_migrations.
-- ============================================================================

-- --------------------------------------------------------------- iscrizioni
create table if not exists public.club_seasons (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  season     text        not null check (season ~ '^[0-9]{4}/[0-9]{2}$'),
  club       text        not null check (char_length(btrim(club)) between 2 and 60),
  gender     text        not null check (gender in ('F', 'M')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Chi cambia società a metà stagione apre una seconda iscrizione; la stessa
  -- società due volte nella stessa stagione no.
  unique (user_id, season, club)
);
comment on table public.club_seasons is 'Campionato per Società: l''iscrizione di un utente (stagione FIPAV, società, classifica M/F).';

-- -------------------------------------------------------------------- tappe
create table if not exists public.club_stages (
  id                 uuid        primary key default gen_random_uuid(),
  user_id            uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  season_id          uuid        not null references public.club_seasons (id) on delete cascade,
  kind               text        not null default 'Tappa'
                                 check (kind in ('Tappa', 'Platinum', 'Coppa Italia', 'Finale')),
  category           text        not null
                                 check (category in ('Platinum', 'Gold', 'Silver', 'Bronze', 'Beginners', 'Under', 'Master')),
  date               date        not null,
  city               text        not null default '' check (char_length(city) <= 50),
  organizer          text        not null default '' check (char_length(organizer) <= 60),
  partner_id         uuid        references public.partners (id) on delete set null,
  -- Nel 2026/27 la coppia può essere di due società: i punti si dividono.
  partner_other_club boolean     not null default false,
  set_points         smallint    not null default 15 check (set_points in (15, 21)),
  -- null = in corso (piazzamento non ancora noto).
  placement          smallint    check (placement between 1 and 999),
  teams              smallint    check (teams between 2 and 999),
  pair_points        integer     check (pair_points between 0 and 100000),
  -- La società conta solo i 3 piazzamenti migliori delle sue coppie.
  counts_for_club    boolean     not null default true,
  club_points        integer     check (club_points between 0 and 100000),
  note               text        not null default '' check (char_length(note) <= 500),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
comment on table public.club_stages is 'Campionato per Società: una tappa giocata. Fuori da ogni statistica dei tornei.';
create index if not exists club_stages_season_idx on public.club_stages (season_id);
create index if not exists club_stages_partner_idx on public.club_stages (partner_id);

-- ------------------------------------------------------------------ partite
create table if not exists public.club_matches (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  stage_id      uuid        not null references public.club_stages (id) on delete cascade,
  phase         text        not null default 'Pool'
                            check (phase in ('Pool', 'Vincenti', 'Perdenti', 'Quarti', 'Semifinale', 'Finale', '3° posto', 'Classificazione')),
  opponents     text        not null default '' check (char_length(opponents) <= 60),
  opponents_club text       not null default '' check (char_length(opponents_club) <= 60),
  -- Ritiro o assenza: la partita è vinta o persa, ma i suoi punti non contano.
  outcome       text        not null default 'giocata' check (outcome in ('giocata', 'forfait_noi', 'forfait_loro')),
  note          text        not null default '' check (char_length(note) <= 500),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table public.club_matches is 'Campionato per Società: una partita di una tappa (coppia contro coppia).';
create index if not exists club_matches_stage_idx on public.club_matches (stage_id);

create table if not exists public.club_match_sets (
  id         uuid     primary key default gen_random_uuid(),
  match_id   uuid     not null references public.club_matches (id) on delete cascade,
  set_number smallint not null check (set_number between 1 and 3),
  us         smallint not null check (us   between 0 and 99),
  them       smallint not null check (them between 0 and 99),
  unique (match_id, set_number)
);
comment on table public.club_match_sets is 'Campionato per Società: un record per set (us = punti nostri).';

-- --------------------------------------------------------------- updated_at
drop trigger if exists club_seasons_set_updated_at on public.club_seasons;
create trigger club_seasons_set_updated_at before update on public.club_seasons
  for each row execute function public.set_updated_at();
drop trigger if exists club_stages_set_updated_at on public.club_stages;
create trigger club_stages_set_updated_at before update on public.club_stages
  for each row execute function public.set_updated_at();
drop trigger if exists club_matches_set_updated_at on public.club_matches;
create trigger club_matches_set_updated_at before update on public.club_matches
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------- RLS
alter table public.club_seasons    enable row level security;
alter table public.club_stages     enable row level security;
alter table public.club_matches    enable row level security;
alter table public.club_match_sets enable row level security;

drop policy if exists "club_seasons_select_own" on public.club_seasons;
drop policy if exists "club_seasons_insert_own" on public.club_seasons;
drop policy if exists "club_seasons_update_own" on public.club_seasons;
drop policy if exists "club_seasons_delete_own" on public.club_seasons;
create policy "club_seasons_select_own" on public.club_seasons for select using (auth.uid() = user_id);
create policy "club_seasons_insert_own" on public.club_seasons for insert with check (auth.uid() = user_id);
create policy "club_seasons_update_own" on public.club_seasons for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "club_seasons_delete_own" on public.club_seasons for delete using (auth.uid() = user_id);

-- La tappa deve stare in un'iscrizione propria, e il compagno (se c'è) deve
-- essere proprio: senza, si potrebbe agganciare una riga di un altro utente.
drop policy if exists "club_stages_select_own" on public.club_stages;
drop policy if exists "club_stages_insert_own" on public.club_stages;
drop policy if exists "club_stages_update_own" on public.club_stages;
drop policy if exists "club_stages_delete_own" on public.club_stages;
create policy "club_stages_select_own" on public.club_stages for select using (auth.uid() = user_id);
create policy "club_stages_insert_own" on public.club_stages for insert with check (
  auth.uid() = user_id
  and exists (select 1 from public.club_seasons s where s.id = season_id and s.user_id = auth.uid())
  and (partner_id is null or exists (select 1 from public.partners p where p.id = partner_id and p.user_id = auth.uid()))
);
create policy "club_stages_update_own" on public.club_stages for update using (auth.uid() = user_id) with check (
  auth.uid() = user_id
  and exists (select 1 from public.club_seasons s where s.id = season_id and s.user_id = auth.uid())
  and (partner_id is null or exists (select 1 from public.partners p where p.id = partner_id and p.user_id = auth.uid()))
);
create policy "club_stages_delete_own" on public.club_stages for delete using (auth.uid() = user_id);

drop policy if exists "club_matches_select_own" on public.club_matches;
drop policy if exists "club_matches_insert_own" on public.club_matches;
drop policy if exists "club_matches_update_own" on public.club_matches;
drop policy if exists "club_matches_delete_own" on public.club_matches;
create policy "club_matches_select_own" on public.club_matches for select using (auth.uid() = user_id);
create policy "club_matches_insert_own" on public.club_matches for insert with check (
  auth.uid() = user_id
  and exists (select 1 from public.club_stages st where st.id = stage_id and st.user_id = auth.uid())
);
create policy "club_matches_update_own" on public.club_matches for update using (auth.uid() = user_id) with check (
  auth.uid() = user_id
  and exists (select 1 from public.club_stages st where st.id = stage_id and st.user_id = auth.uid())
);
create policy "club_matches_delete_own" on public.club_matches for delete using (auth.uid() = user_id);

-- I set ereditano l'ownership dalla partita (come match_sets).
drop policy if exists "club_match_sets_select_own" on public.club_match_sets;
drop policy if exists "club_match_sets_insert_own" on public.club_match_sets;
drop policy if exists "club_match_sets_update_own" on public.club_match_sets;
drop policy if exists "club_match_sets_delete_own" on public.club_match_sets;
create policy "club_match_sets_select_own" on public.club_match_sets for select
  using (exists (select 1 from public.club_matches m where m.id = match_id and m.user_id = auth.uid()));
create policy "club_match_sets_insert_own" on public.club_match_sets for insert
  with check (exists (select 1 from public.club_matches m where m.id = match_id and m.user_id = auth.uid()));
create policy "club_match_sets_update_own" on public.club_match_sets for update
  using (exists (select 1 from public.club_matches m where m.id = match_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.club_matches m where m.id = match_id and m.user_id = auth.uid()));
create policy "club_match_sets_delete_own" on public.club_match_sets for delete
  using (exists (select 1 from public.club_matches m where m.id = match_id and m.user_id = auth.uid()));

-- ----------------------------------------------------------------- privilegi
-- `anon` non ha privilegi sulle tabelle (20260729120000_security_hardening):
-- i default privileges già lo escludono, qui lo si dice anche in chiaro.
revoke all on public.club_seasons    from anon;
revoke all on public.club_stages     from anon;
revoke all on public.club_matches    from anon;
revoke all on public.club_match_sets from anon;
