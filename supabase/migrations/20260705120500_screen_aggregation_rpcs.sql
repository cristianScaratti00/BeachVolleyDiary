-- ============================================================================
-- Aggregazioni server-side per gli altri screen (coerenti col dashboard).
-- SECURITY INVOKER: rispettano la RLS (solo dati dell'utente). La presentazione
-- (colori/badge/chip/date) resta lato client, che mappa questi aggregati.
-- Sfruttano la view public.match_scores (esito e punti per partita).
-- ============================================================================

create or replace function public.placement_rank(l text)
returns int language sql immutable set search_path='' as $$
  select case
    when l like '1°%' then 1 when l like '2°%' then 2 when l like '3°%' then 3
    when l = 'Quarti' then 4 when l = 'Ottavi' then 6 when l = 'Gironi' then 8
    else 9 end;
$$;

create or replace function public.tornei_list()
returns jsonb language sql security invoker set search_path='' stable as $$
  with per as (
    select t.id, t.name, t.category, t.city, t.date, t.format, t.placement, t.partner_id,
           public.placement_rank(t.placement) as rank,
           count(x.match_id) as match_count,
           count(x.match_id) filter (where x.won) as won
    from public.tournaments t
    left join public.match_scores x on x.tournament_id = t.id
    where t.user_id = auth.uid()
    group by t.id
  )
  select jsonb_build_object(
    'tornei', coalesce((select jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'category', category, 'city', city, 'date', date, 'format', format,
        'placement', placement, 'rank', rank,
        'partner', (select p.name from public.partners p where p.id = per.partner_id),
        'match_count', match_count, 'won', won, 'lost', match_count - won,
        'win_pct', case when match_count > 0 then round(100.0 * won / match_count) else 0 end
      ) order by date desc) from per), '[]'::jsonb),
    't_played', (select count(*) from per),
    'podi',     (select count(*) filter (where rank <= 3) from per),
    'best_rank',(select coalesce(min(rank), 9) from per)
  );
$$;

create or replace function public.compagni_list()
returns jsonb language sql security invoker set search_path='' stable as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', p.id, 'name', p.name,
           'played', c.played, 'won', c.won, 'lost', c.played - c.won,
           'win_pct', case when c.played > 0 then round(100.0 * c.won / c.played) else 0 end
         ) order by p.created_at), '[]'::jsonb)
  from public.partners p
  left join lateral (
    select count(x.match_id) as played, count(x.match_id) filter (where x.won) as won
    from public.match_scores x where x.partner_id = p.id
  ) c on true
  where p.user_id = auth.uid();
$$;

create or replace function public.gallery()
returns jsonb language sql security invoker set search_path='' stable as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'color', ph.color, 'caption', ph.caption,
           'tag', coalesce((select t.name from public.tournaments t where t.id = ph.tournament_id), '')
         ) order by ph.created_at desc), '[]'::jsonb)
  from public.photos ph where ph.user_id = auth.uid();
$$;

create or replace function public.torneo_detail(p_id uuid)
returns jsonb language sql security invoker set search_path='' stable as $$
  with t as (select * from public.tournaments where id = p_id and user_id = auth.uid()),
  ms as (
    select m.id, m.phase, m.opponents, m.note, m.created_at,
           (select p.name from public.partners p where p.id = m.partner_id) as partner_name,
           coalesce(x.won, false) as won,
           coalesce(x.sets_us, 0) as sets_us, coalesce(x.sets_them, 0) as sets_them,
           coalesce(x.points_us, 0) as pf, coalesce(x.points_them, 0) as pa,
           (select jsonb_agg(jsonb_build_object('us', s.us, 'them', s.them) order by s.set_number)
              from public.match_sets s where s.match_id = m.id) as sets
    from public.matches m
    left join public.match_scores x on x.match_id = m.id
    where m.tournament_id = p_id
  ),
  agg as (
    select count(*) as played, count(*) filter (where won) as won,
           coalesce(sum(sets_us),0) as sw, coalesce(sum(sets_them),0) as sl,
           coalesce(sum(pf),0) as pf, coalesce(sum(pa),0) as pa
    from ms
  )
  select case when not exists (select 1 from t) then jsonb_build_object('error','not_found')
  else jsonb_build_object(
    'id', (select id from t), 'name', (select name from t), 'category', (select category from t),
    'city', (select city from t), 'date', (select date from t), 'surface', (select surface from t),
    'placement', (select placement from t), 'rank', public.placement_rank((select placement from t)),
    'partner', (select p.name from public.partners p where p.id = (select partner_id from t)),
    'played', (select played from agg), 'won', (select won from agg), 'lost', (select played - won from agg),
    'win_pct', (select case when played > 0 then round(100.0 * won / played) else 0 end from agg),
    'sets_won', (select sw from agg), 'sets_lost', (select sl from agg),
    'point_diff', (select pf - pa from agg),
    'matches', coalesce((select jsonb_agg(jsonb_build_object(
        'id', id, 'phase', phase, 'opponents', opponents, 'note', note,
        'partner_name', partner_name, 'won', won, 'sets', coalesce(sets, '[]'::jsonb)
      ) order by created_at) from ms), '[]'::jsonb),
    'photos', coalesce((select jsonb_agg(jsonb_build_object('color', color, 'caption', caption) order by created_at desc)
                          from public.photos where tournament_id = p_id), '[]'::jsonb)
  ) end;
$$;

create or replace function public.compagno_detail(p_id uuid)
returns jsonb language sql security invoker set search_path='' stable as $$
  with p as (select * from public.partners where id = p_id and user_id = auth.uid()),
  ms as (
    select m.id, m.phase, m.opponents, m.created_at, tt.date as tdate, tt.name as tournament_name,
           coalesce(x.won, false) as won,
           coalesce(x.sets_us, 0) as sets_us, coalesce(x.sets_them, 0) as sets_them,
           coalesce(x.points_us, 0) as pf, coalesce(x.points_them, 0) as pa,
           (select jsonb_agg(jsonb_build_object('us', s.us, 'them', s.them) order by s.set_number)
              from public.match_sets s where s.match_id = m.id) as sets
    from public.matches m
    join public.tournaments tt on tt.id = m.tournament_id
    left join public.match_scores x on x.match_id = m.id
    where m.partner_id = p_id
  ),
  agg as (
    select count(*) as played, count(*) filter (where won) as won,
           coalesce(sum(sets_us),0) as sw, coalesce(sum(sets_them),0) as sl,
           coalesce(sum(pf),0) as pf, coalesce(sum(pa),0) as pa
    from ms
  ),
  ordd as (select won, row_number() over (order by tdate, id) as rn from ms),
  grp  as (select won, rn - row_number() over (partition by won order by rn) as g from ordd),
  streak as (select coalesce(max(c),0) as s from (select count(*) c from grp where won group by g) z)
  select case when not exists (select 1 from p) then jsonb_build_object('error','not_found')
  else jsonb_build_object(
    'id', (select id from p), 'name', (select name from p),
    'played', (select played from agg), 'won', (select won from agg),
    'win_pct', (select case when played > 0 then round(100.0 * won / played) else 0 end from agg),
    'set_pct', (select case when (sw + sl) > 0 then round(100.0 * sw / (sw + sl)) else 0 end from agg),
    'point_diff', (select pf - pa from agg),
    'streak', (select s from streak),
    'matches', coalesce((select jsonb_agg(jsonb_build_object(
        'id', id, 'tournament_name', tournament_name, 'phase', phase, 'opponents', opponents,
        'won', won, 'sets', coalesce(sets, '[]'::jsonb)
      ) order by created_at) from ms), '[]'::jsonb)
  ) end;
$$;
