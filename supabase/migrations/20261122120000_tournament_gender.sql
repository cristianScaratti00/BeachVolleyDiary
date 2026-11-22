-- ============================================================================
-- Il genere del torneo: maschile, femminile o misto (proposta A + B, scelta
-- dell'utente il 22/11/2026). Serve a separare le statistiche: maschile e
-- misto non si sommano.
--
-- Nullable di proposito: i tornei di prima e quelli dell'app mobile (che non
-- conosce il campo) restano «non indicato» e contano solo in «Tutti» finché
-- l'utente non li riordina dall'app. Nessun backfill: il genere non si indovina.
--
-- I valori sono quelli di GENDERS in src/lib/db.enums.ts: si cambiano insieme.
-- Le statistiche per genere oggi le calcola il client (il filtro restringe i
-- dati prima di deriveDashboard); dashboard_stats resta invariata e vale per
-- «Tutti».
--
-- Il client regge anche PRIMA di questa migration (useDiary riprova senza la
-- colonna se il DB non la conosce), ma senza non si salva il genere.
-- Additiva e idempotente: si applica via CLI (`supabase db query --linked`) e
-- si registra in supabase_migrations.schema_migrations.
-- ============================================================================
alter table public.tournaments add column if not exists gender text;

alter table public.tournaments drop constraint if exists tournaments_gender_check;
alter table public.tournaments add constraint tournaments_gender_check
  check (gender is null or gender in ('Maschile', 'Femminile', 'Misto'));

comment on column public.tournaments.gender is 'Maschile, Femminile o Misto; null = non indicato (conta solo in «Tutti»).';
