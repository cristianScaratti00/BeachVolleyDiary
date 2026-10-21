-- ============================================================================
-- Lunghezza massima dei testi scritti a mano: il backstop dei limiti di
-- src/lib/lunghezze.ts (LIMITI), gli stessi dell'assistente (CreaChat) e dei
-- moduli (maxLength). I massimi qui non scendono MAI sotto quelli di un
-- modulo: cambiarne uno vuol dire cambiare insieme lunghezze.ts e questo file.
--
--   tournaments.name  ≤ 60   tournaments.city ≤ 50
--   partners.name     ≤ 40
--   venues.name       ≤ 60   venues.city      ≤ 50
--
-- `venues.city` è in più rispetto al piano: `citySnapshot()` (useDiary) copia
-- la città del luogo in `tournaments.city`, quindi deve stare nello stesso
-- limite, o un luogo valido renderebbe impossibile salvare il torneo.
-- Solo il massimo: `tournaments.city` vuota ('') resta legittima.
--
-- `char_length` conta i caratteri (un'emoji è uno), come `verificaTesto`;
-- `maxLength` dei campi conta le unità UTF-16, quindi è sempre ≤.
--
-- ⚠️ Il DB è condiviso con l'app mobile (BVDiaryApp), che non ha limiti nei
-- campi: un nome più lungo scritto da lì viene rifiutato (23514
-- check_violation). Scelta dell'utente (2026-10-21).
--
-- Verificato prima di applicarla: nessuna riga oltre i limiti (massimi
-- attuali: tornei 27, città 15, compagni 18, luoghi 19, città dei luoghi 15).
-- Applicata via CLI (`supabase db query --linked`, non `db push`) e
-- registrata in supabase_migrations.schema_migrations. Idempotente.
-- ============================================================================
alter table public.tournaments drop constraint if exists tournaments_name_length;
alter table public.tournaments add constraint tournaments_name_length check (char_length(name) <= 60);

alter table public.tournaments drop constraint if exists tournaments_city_length;
alter table public.tournaments add constraint tournaments_city_length check (char_length(city) <= 50);

alter table public.partners drop constraint if exists partners_name_length;
alter table public.partners add constraint partners_name_length check (char_length(name) <= 40);

alter table public.venues drop constraint if exists venues_name_length;
alter table public.venues add constraint venues_name_length check (char_length(name) <= 60);

alter table public.venues drop constraint if exists venues_city_length;
alter table public.venues add constraint venues_city_length check (char_length(city) <= 50);
