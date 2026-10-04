-- ============================================================================
-- Tabellone: + "Girone unico" (tornei senza tabelloni Gold/Silver/Bronze, in
-- cui tutte le coppie giocano un solo girone). Allinea il CHECK a BRACKETS in
-- src/lib/db.enums.ts.
-- Il nuovo insieme è un superset del precedente: nessuna riga esistente viola
-- il vincolo aggiornato.
-- ============================================================================
alter table public.tournaments drop constraint tournaments_bracket_check;
alter table public.tournaments add constraint tournaments_bracket_check
  check (bracket in ('Gold','Silver','Bronze','Girone unico'));

comment on column public.tournaments.bracket is
  'Tabellone in cui si è concluso il torneo (Gold/Silver/Bronze/Girone unico). NULL = nessuno.';
