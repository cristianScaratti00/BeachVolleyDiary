-- ============================================================================
-- Compagno "principale" del torneo (con chi l'ho giocato). Opzionale.
-- Usato dalla creazione rapida. ON DELETE SET NULL così eliminare un socio
-- non blocca né cancella il torneo. Le singole partite mantengono il proprio
-- partner_id (es. formato King/Queen dove cambia ad ogni partita).
-- ============================================================================
alter table public.tournaments
  add column partner_id uuid references public.partners (id) on delete set null;

create index tournaments_partner_id_idx on public.tournaments (partner_id);

comment on column public.tournaments.partner_id is 'Compagno principale del torneo (con chi è stato giocato). Le partite possono comunque avere compagni diversi (es. King/Queen).';
