-- ============================================================================
-- Piani SOSPESI — tutte le funzioni sono disponibili per ogni utente.
-- In attesa dell'integrazione dei pagamenti il freemium è disattivato:
--   * i nuovi account nascono già 'premium' (default della colonna, letto da
--     handle_new_user che non passa `plan`);
--   * gli account esistenti vengono promossi;
--   * enforce_plan_limits diventa un no-op (il trigger resta installato).
-- Niente viene rimosso: colonna, trigger e helper restano al loro posto.
--
-- PER RIATTIVARE IL FREEMIUM:
--   1. alter table public.profiles alter column plan set default 'base';
--   2. ripristina il corpo di enforce_plan_limits dalla migration
--      20260705120200_plan_limits_base.sql;
--   3. rimetti coalesce(..., 'base') in current_plan();
--   4. PLANS_ENABLED = true in src/lib/limits.ts.
-- ============================================================================

-- Nuove registrazioni: premium fin da subito.
alter table public.profiles alter column plan set default 'premium';
comment on column public.profiles.plan is
  'base | premium — abbonamento. Piani sospesi: default premium per tutti.';

-- Utenti già registrati: promossi.
update public.profiles set plan = 'premium' where plan <> 'premium';

-- Profilo mancante → non deve più significare "base" (il gating dei filtri in
-- dashboard_stats si appoggia a questo helper).
create or replace function public.current_plan()
returns text language sql security definer set search_path = '' stable as $$
  select coalesce((select plan from public.profiles where id = auth.uid()), 'premium');
$$;

-- Limiti quantitativi disattivati: la funzione resta (i due trigger su
-- tournaments/partners continuano a chiamarla) ma non blocca più nulla.
create or replace function public.enforce_plan_limits()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Piani sospesi: nessun limite su tornei e compagni.
  return new;
end;
$$;

revoke execute on function public.enforce_plan_limits() from public;
