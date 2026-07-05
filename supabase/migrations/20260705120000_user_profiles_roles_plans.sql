-- ============================================================================
-- Profili utente: ruolo (admin/user) + piano abbonamento (base/premium)
-- Una riga 1:1 con auth.users, creata automaticamente alla registrazione.
-- La RLS impedisce all'utente di auto-assegnarsi ruolo o piano.
-- Helper is_admin() / current_plan() pronti per il gating futuro (app e RLS).
-- ============================================================================
create table public.profiles (
  id         uuid        primary key references auth.users (id) on delete cascade,
  email      text,
  full_name  text,
  role       text        not null default 'user'  check (role in ('admin','user')),
  plan       text        not null default 'base'  check (plan in ('base','premium')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Profilo per utente: ruolo (admin/user) e piano (base/premium).';
comment on column public.profiles.role is 'admin | user — controllo accessi.';
comment on column public.profiles.plan is 'base | premium — abbonamento, per limitare funzioni.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Helper (SECURITY DEFINER per non innescare ricorsione con la RLS di profiles).
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = '' stable as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.current_plan()
returns text language sql security definer set search_path = '' stable as $$
  select coalesce((select plan from public.profiles where id = auth.uid()), 'base');
$$;

-- Crea il profilo alla registrazione.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Un end-user non-admin NON può cambiarsi role/plan (anti privilege-escalation).
-- service_role, accesso diretto (auth.uid() null) e admin restano liberi.
create or replace function public.enforce_profile_privileges()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (new.role is distinct from old.role or new.plan is distinct from old.plan) then
    if auth.uid() is not null and not public.is_admin() then
      new.role := old.role;
      new.plan := old.plan;
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_enforce_privileges
  before update on public.profiles
  for each row execute function public.enforce_profile_privileges();

-- Le funzioni-trigger non devono essere esposte come RPC (il grant EXECUTE di
-- default è su PUBLIC, quindi si revoca da lì).
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.enforce_profile_privileges() from public;

-- RLS
alter table public.profiles enable row level security;
create policy "profiles_select_own"   on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own"   on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_select_admin" on public.profiles for select using (public.is_admin());
create policy "profiles_update_admin" on public.profiles for update using (public.is_admin()) with check (public.is_admin());

-- Backfill: crea i profili mancanti per gli utenti già registrati.
insert into public.profiles (id, email, full_name)
select u.id, u.email, u.raw_user_meta_data->>'name'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
