-- ============================================================================
-- Segnalazioni di problemi (versione alpha).
--
-- L'app è dichiaratamente in alpha: il banner in Home lo dice e porta qui.
-- Una riga per problema segnalato, scritta dal client sotto le policy
-- owner-only. Chi segnala rivede solo le PROPRIE segnalazioni; l'elenco
-- completo — con nome e email di chi ha scritto — è riservato agli admin.
--
-- Contenimento come per `check_ins`: la lettura cross-utente non passa dalla
-- RLS ma dalla RPC `bug_reports_list`, che è gated su `is_admin()`. Un non
-- admin che la chiamasse otterrebbe zero righe, non un errore (stessa forma
-- del cancello di reciprocità di `who_is_here`).
--
-- `area` è uno slug, non un'etichetta: le stringhe mostrate ("Chi c'è oggi")
-- vivono nel frontend (src/lib/segnalazioni.ts) e possono cambiare senza
-- toccare il CHECK. Gli slug coincidono con le schermate del tipo `Screen`.
-- ============================================================================

create table public.bug_reports (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  title       text        not null check (char_length(btrim(title)) between 3 and 120),
  description text        not null check (char_length(btrim(description)) between 10 and 2000),
  area        text        not null default 'altro'
              check (area in ('home','tornei','diario','compagni','oggi','profilo','accesso','altro')),
  -- Ciclo di vita della segnalazione, mosso solo dagli admin.
  status      text        not null default 'nuovo'
              check (status in ('nuovo','in_corso','risolto','chiuso')),
  -- Contesto tecnico raccolto dal client (browser/sistema). Serve a riprodurre
  -- il bug: senza, metà delle segnalazioni "non funziona" resta irriproducibile.
  user_agent  text        not null default '' check (char_length(user_agent) <= 400),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.bug_reports is
  'Segnalazioni di problemi degli utenti (alpha). Chi segnala vede le proprie; l''elenco completo passa dalla RPC bug_reports_list, riservata agli admin.';
comment on column public.bug_reports.area is
  'Slug della schermata coinvolta (home|tornei|diario|compagni|oggi|profilo|accesso|altro). Le etichette stanno nel frontend.';
comment on column public.bug_reports.status is
  'nuovo | in_corso | risolto | chiuso — lo cambiano solo gli admin.';

-- Indice della query della bacheca admin: le più recenti, filtrabili per stato.
create index bug_reports_status_created_idx on public.bug_reports (status, created_at desc);
-- Indice della query "le mie segnalazioni" (policy owner-only).
create index bug_reports_user_id_idx on public.bug_reports (user_id);

create trigger bug_reports_set_updated_at
  before update on public.bug_reports
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- ROW LEVEL SECURITY
-- Owner-only in scrittura (convenzione *_own di init.sql) + lettura e avanzamento
-- di stato per gli admin. Nessuna policy di DELETE: una segnalazione si chiude,
-- non si cancella (e cancellarla toglierebbe la traccia del bug).
-- ===========================================================================
alter table public.bug_reports enable row level security;

create policy "bug_reports_insert_own"   on public.bug_reports for insert with check (auth.uid() = user_id);
create policy "bug_reports_select_own"   on public.bug_reports for select using (auth.uid() = user_id);
create policy "bug_reports_select_admin" on public.bug_reports for select using (public.is_admin());
create policy "bug_reports_update_admin" on public.bug_reports for update using (public.is_admin()) with check (public.is_admin());

-- `anon` non ha privilegi sulle tabelle (vedi 20260729120000_security_hardening):
-- lo si ribadisce qui perché la tabella è nuova, e si concede l'essenziale agli
-- autenticati.
--
-- ⚠️ Il `grant` qui sotto è ADDITIVO: Supabase concede da sé ALL ad
-- `authenticated` sulle nuove tabelle in public, quindi elencare i tre
-- privilegi che servono NON toglie il DELETE — va revocato a mano. La RLS lo
-- neutralizzerebbe comunque (non esiste policy di DELETE, quindi cancella zero
-- righe), ma è privilegio a perdere: stessa logica dell'hardening.
revoke all on public.bug_reports from anon;
grant  select, insert, update on public.bug_reports to authenticated;
revoke delete, truncate, references, trigger on public.bug_reports from authenticated;

-- ===========================================================================
-- RPC bug_reports_list() — la bacheca dell'admin.
-- SECURITY DEFINER (legge `profiles` di tutti bypassando la RLS del chiamante),
-- search_path='', gated su is_admin(): a un non admin restituisce zero righe.
-- L'email in chiaro non aggiunge esposizione — un admin può già leggere tutti i
-- profili (policy `profiles_select_admin`) — ed è l'unico modo per rispondere a
-- chi ha segnalato.
-- ===========================================================================
create or replace function public.bug_reports_list()
returns table (
  id             uuid,
  created_at     timestamptz,
  title          text,
  description    text,
  area           text,
  status         text,
  user_agent     text,
  reporter_name  text,
  reporter_email text
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    b.id,
    b.created_at,
    b.title,
    b.description,
    b.area,
    b.status,
    b.user_agent,
    coalesce(
      nullif(btrim(p.full_name), ''),
      nullif(split_part(coalesce(p.email, ''), '@', 1), ''),
      'Utente'
    ) as reporter_name,
    coalesce(p.email, '') as reporter_email
  from public.bug_reports b
  left join public.profiles p on p.id = b.user_id
  where public.is_admin()
  order by b.created_at desc
  limit 500;
$$;

comment on function public.bug_reports_list() is
  'Elenco completo delle segnalazioni con nome/email di chi ha segnalato. Zero righe se il chiamante non è admin.';

-- Supabase auto-concede EXECUTE ad anon/authenticated sulle nuove funzioni
-- public: si revoca esplicitamente ad anon (solo autenticati).
revoke execute on function public.bug_reports_list() from public, anon;
grant  execute on function public.bug_reports_list() to authenticated;
