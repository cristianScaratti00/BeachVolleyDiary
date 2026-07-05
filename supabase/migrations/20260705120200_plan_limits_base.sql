-- ============================================================================
-- Limiti del piano BASE: max 5 tornei e 2 compagni per utente.
-- Premium e admin: illimitati. Enforcement autoritativo via trigger BEFORE INSERT
-- (non aggirabile dal client). L'accesso diretto/service (auth.uid() null) bypassa.
-- ============================================================================
create or replace function public.enforce_plan_limits()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_plan  text;
  v_admin boolean;
  v_count int;
  v_limit int;
begin
  if auth.uid() is null then
    return new;
  end if;

  select plan, (role = 'admin') into v_plan, v_admin
  from public.profiles where id = auth.uid();

  if coalesce(v_plan, 'base') <> 'base' or coalesce(v_admin, false) then
    return new; -- premium o admin: nessun limite
  end if;

  if tg_table_name = 'tournaments' then
    v_limit := 5;
    select count(*) into v_count from public.tournaments where user_id = auth.uid();
    if v_count >= v_limit then
      raise exception 'Piano base: massimo % tornei. Passa a Premium per aggiungerne altri.', v_limit
        using errcode = 'check_violation';
    end if;
  elsif tg_table_name = 'partners' then
    v_limit := 2;
    select count(*) into v_count from public.partners where user_id = auth.uid();
    if v_count >= v_limit then
      raise exception 'Piano base: massimo % compagni. Passa a Premium per aggiungerne altri.', v_limit
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

create trigger tournaments_enforce_plan_limits
  before insert on public.tournaments
  for each row execute function public.enforce_plan_limits();

create trigger partners_enforce_plan_limits
  before insert on public.partners
  for each row execute function public.enforce_plan_limits();

revoke execute on function public.enforce_plan_limits() from public;
