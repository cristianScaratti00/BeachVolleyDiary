-- ============================================================================
-- placement_rank: 'Semifinale' vale più di 'Gironi', non meno.
--
-- 'Semifinale' è un piazzamento legittimo (CHECK esteso da
-- `20260703120300_extend_category_placement.sql`, «+ Semifinale (tra 3° e
-- Quarti)») ma nessuna scala di ranking lo gestiva: cadeva nel fallback 9,
-- lo stesso di 'In corso', cioè PEGGIO di 'Gironi' (8). Conseguenze visibili:
-- "miglior piazzamento —" in Tornei/dashboard per chi ha come miglior
-- risultato una semifinale.
--
-- Non esiste un intero tra 3 (3° posto) e 4 (Quarti), quindi Semifinale
-- prende 4 e Quarti scala a 5. La scala resta:
--   1° → 1 · 2° → 2 · 3° → 3 · Semifinale → 4 · Quarti → 5 · Ottavi → 6
--   Gironi → 8 · altro/In corso → 9
-- I buchi sono voluti: contano solo l'ordine e le soglie già usate ovunque
-- (= 1 vittoria, <= 3 podio, <= 8 risultato reale, 9 nessun risultato), che
-- restano invariate.
--
-- ATTENZIONE: il numero di rank viaggia sul filo (le RPC lo restituiscono, il
-- client lo rimappa in etichetta). Questa scala deve restare allineata a
-- `placementRank` in `src/lib/stats.ts` e a `PLACEMENT_LABELS` in
-- `src/lib/derive.ts`.
--
-- `dashboard_stats` viene ri-emessa perché aveva la stessa `case` INLINATA
-- nella CTE `tt` (da `20260705120400_dashboard_stats_full.sql`): ora chiama
-- `public.placement_rank`, così lato DB la scala esiste in un posto solo.
-- Firma, volatilità, `security invoker` e `search_path` restano identici.
-- ============================================================================

create or replace function public.placement_rank(l text)
returns int language sql immutable set search_path='' as $$
  select case
    when l like '1°%' then 1 when l like '2°%' then 2 when l like '3°%' then 3
    when l = 'Semifinale' then 4 when l = 'Quarti' then 5
    when l = 'Ottavi' then 6 when l = 'Gironi' then 8
    else 9 end;
$$;

comment on function public.placement_rank(text) is
  'Ordina i piazzamenti (più basso = migliore): 1°=1, 2°=2, 3°=3, Semifinale=4, Quarti=5, Ottavi=6, Gironi=8, altro/In corso=9. Allineata a placementRank in src/lib/stats.ts.';

-- Identica a 20260705120400, tranne la CTE `tt` che ora delega a placement_rank.
create or replace function public.dashboard_stats(p_partner uuid default null, p_year text default null)
returns jsonb language plpgsql security invoker set search_path = '' stable as $$
declare
  v_uid uuid := auth.uid();
  v_premium boolean;
  result jsonb;
begin
  if v_uid is null then return jsonb_build_object('error','not_authenticated'); end if;
  v_premium := (public.current_plan() = 'premium') or public.is_admin();
  if not v_premium then p_partner := null; p_year := null; end if;

  with mm as (
    select m.id, m.partner_id, m.phase, t.date,
           coalesce(sum(s.us),0) as pf, coalesce(sum(s.them),0) as pa,
           count(s.id) filter (where s.us  > s.them) as sets_us,
           count(s.id) filter (where s.them > s.us) as sets_them,
           (count(s.id) filter (where s.us > s.them)) > (count(s.id) filter (where s.them > s.us)) as won
    from public.matches m
    join public.tournaments t on t.id = m.tournament_id
    left join public.match_sets s on s.match_id = m.id
    where m.user_id = v_uid
      and (p_partner is null or m.partner_id = p_partner)
      and (p_year is null or to_char(t.date,'YYYY') = p_year)
    group by m.id, m.partner_id, m.phase, t.date
  ),
  agg as (
    select count(*) as played, count(*) filter (where won) as won,
           coalesce(sum(sets_us),0) as sw, coalesce(sum(sets_them),0) as sl,
           coalesce(sum(pf),0) as pf, coalesce(sum(pa),0) as pa
    from mm
  ),
  by_month as (
    select to_char(date,'YYYY-MM') as ym,
           round(100.0*count(*) filter (where won)/nullif(count(*),0)) as pct
    from mm group by 1
  ),
  ord as (select won, row_number() over (order by date, id) as rn from mm),
  grp as (select won, rn - row_number() over (partition by won order by rn) as g from ord),
  streak as (select coalesce(max(c),0) as s from (select count(*) c from grp where won group by g) z),
  by_partner as (
    select mm.partner_id, p.name, count(*) as played, count(*) filter (where won) as won,
           round(100.0*count(*) filter (where won)/nullif(count(*),0)) as win_pct
    from mm join public.partners p on p.id = mm.partner_id
    group by mm.partner_id, p.name having count(*)>0
    order by round(100.0*count(*) filter (where won)/nullif(count(*),0)) desc nulls last
  ),
  by_phase as (
    select phase, count(*) as played, count(*) filter (where won) as won,
           round(100.0*count(*) filter (where won)/nullif(count(*),0)) as win_pct
    from mm group by phase
  ),
  tt as (
    select t.placement, public.placement_rank(t.placement) as rank
    from public.tournaments t
    where t.user_id = v_uid and (p_year is null or to_char(t.date,'YYYY') = p_year)
  ),
  tstats as (
    select count(*) as t_played, count(*) filter (where rank=1) as t_won,
           count(*) filter (where rank<=3) as podi, coalesce(min(rank),9) as best_rank
    from tt
  ),
  placements as (select placement, count(*) as cnt from tt group by placement)
  select jsonb_build_object(
    'plan', public.current_plan(),
    'is_premium', v_premium,
    'filter_applied', jsonb_build_object('partner', p_partner, 'year', p_year),
    'played', a.played, 'won', a.won, 'lost', a.played - a.won,
    'win_pct', case when a.played>0 then round(100.0*a.won/a.played) else 0 end,
    'sets_won', a.sw, 'sets_lost', a.sl,
    'set_pct', case when (a.sw+a.sl)>0 then round(100.0*a.sw/(a.sw+a.sl)) else 0 end,
    'points_for', a.pf, 'points_against', a.pa, 'point_diff', a.pf - a.pa,
    'avg_for', case when a.played>0 then round(a.pf::numeric/a.played) else 0 end,
    'avg_against', case when a.played>0 then round(a.pa::numeric/a.played) else 0 end,
    'streak', (select s from streak),
    'trend', coalesce((select jsonb_agg(jsonb_build_object('ym',ym,'pct',pct) order by ym) from by_month), '[]'::jsonb),
    'partners', coalesce((select jsonb_agg(jsonb_build_object('id',partner_id,'name',name,'played',played,'won',won,'win_pct',win_pct)) from by_partner), '[]'::jsonb),
    'phases', coalesce((select jsonb_agg(jsonb_build_object('phase',phase,'played',played,'won',won,'win_pct',win_pct)) from by_phase), '[]'::jsonb),
    'placements', coalesce((select jsonb_agg(jsonb_build_object('placement',placement,'count',cnt)) from placements), '[]'::jsonb),
    't_played', (select t_played from tstats),
    't_won', (select t_won from tstats),
    'podi', (select podi from tstats),
    'best_rank', (select best_rank from tstats)
  ) into result from agg a;
  return result;
end;
$$;
