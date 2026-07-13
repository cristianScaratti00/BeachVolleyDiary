-- ============================================================================
-- Il socio passa a livello di TORNEO (le partite lo ereditano) e diventa
-- ELIMINABILE. Alla cancellazione del socio: tournaments.partner_id era già
-- ON DELETE SET NULL; qui rendiamo anche matches.partner_id nullable e
-- ON DELETE SET NULL (prima NOT NULL / RESTRICT, che bloccava l'eliminazione).
-- Le partite senza socio contano nelle statistiche generali ma non in quelle
-- per-compagno (nessun bucket "nessuno").
-- ============================================================================
alter table public.matches drop constraint matches_partner_id_fkey;

alter table public.matches alter column partner_id drop not null;

alter table public.matches
  add constraint matches_partner_id_fkey
  foreign key (partner_id) references public.partners (id) on delete set null;

comment on column public.matches.partner_id is
  'Compagno della partita: ereditato dal torneo. NULL = nessuno (socio eliminato o torneo senza compagno).';
