-- ============================================================================
-- Tabellone finale del torneo: Gold / Silver / Bronze.
-- Molti tornei, finiti i gironi, smistano le coppie in tabelloni separati: un
-- "1°" nel Silver non è un "1°" nel Gold. Il piazzamento resta dov'è; questa
-- colonna dice *in quale tabellone* è stato ottenuto.
--
-- Facoltativa (NULL = torneo senza tabelloni, o dato non inserito): le righe
-- esistenti restano valide così come sono, e i client che non conoscono la
-- colonna (app mobile) continuano a funzionare — non la selezionano e, non
-- scrivendola negli update, non la azzerano.
--
-- Non entra nelle statistiche (podi, miglior piazzamento, placement_rank):
-- è un dato descrittivo, le RPC aggregate non vanno toccate.
-- ============================================================================
alter table public.tournaments
  add column bracket text
  constraint tournaments_bracket_check check (bracket in ('Gold','Silver','Bronze'));

comment on column public.tournaments.bracket is
  'Tabellone in cui si è concluso il torneo (Gold/Silver/Bronze). NULL = nessuno.';
