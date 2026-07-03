-- ============================================================================
-- Funzione di seed demo (opzionale)
-- Ricrea gli stessi dati iniziali del frontend per l'utente indicato.
-- Uso (da autenticato):   select public.seed_demo();
-- La funzione NON viene eseguita automaticamente: crea solo la routine.
-- ============================================================================
create or replace function public.seed_demo(p_user uuid default auth.uid())
returns void
language plpgsql
security invoker
as $$
declare
  luca uuid; andrea uuid;
  t1 uuid; t2 uuid; t3 uuid;
  m uuid;
begin
  if p_user is null then
    raise exception 'seed_demo: user id mancante — esegui da una sessione autenticata';
  end if;

  -- soci
  insert into public.partners (user_id, name, color) values (p_user, 'Luca',   '#00B4D8') returning id into luca;
  insert into public.partners (user_id, name, color) values (p_user, 'Andrea', '#FF477E') returning id into andrea;

  -- tornei
  insert into public.tournaments (user_id, name, date, city, category, format, surface, placement, color, emoji)
    values (p_user, 'Sunset Series Cervia', '2025-06-28', 'Cervia', 'Amatoriale', '2vs2', 'Sabbia outdoor', '1° 🏆', '#FF6B35', '🌅') returning id into t1;
  insert into public.tournaments (user_id, name, date, city, category, format, surface, placement, color, emoji)
    values (p_user, 'Beach Open Jesolo',    '2025-07-19', 'Jesolo', 'Open',       '2vs2', 'Sabbia outdoor', 'Gironi', '#00B4D8', '🏐') returning id into t2;
  insert into public.tournaments (user_id, name, date, city, category, format, surface, placement, color, emoji)
    values (p_user, 'Summer Cup Rimini',    '2025-08-14', 'Rimini', 'Amatoriale', '2vs2', 'Sabbia outdoor', '2°',     '#FFD23F', '🏖️') returning id into t3;

  -- partite + set
  insert into public.matches (user_id, tournament_id, partner_id, opponents, phase, note)
    values (p_user, t1, luca, 'Rossi / Neri', 'Girone', '') returning id into m;
  insert into public.match_sets (match_id, set_number, us, them) values (m,1,21,14),(m,2,21,16);

  insert into public.matches (user_id, tournament_id, partner_id, opponents, phase, note)
    values (p_user, t1, luca, 'Gialli / Blu', 'Quarti', '') returning id into m;
  insert into public.match_sets (match_id, set_number, us, them) values (m,1,21,18),(m,2,21,19);

  insert into public.matches (user_id, tournament_id, partner_id, opponents, phase, note)
    values (p_user, t1, luca, 'Ferrari / Conti', 'Semifinale', 'Rimonta nel terzo set!') returning id into m;
  insert into public.match_sets (match_id, set_number, us, them) values (m,1,21,19),(m,2,19,21),(m,3,15,12);

  insert into public.matches (user_id, tournament_id, partner_id, opponents, phase, note)
    values (p_user, t1, luca, 'Marini / Sala', 'Finale', 'Titolo vinto 🏆') returning id into m;
  insert into public.match_sets (match_id, set_number, us, them) values (m,1,21,18),(m,2,22,20);

  insert into public.matches (user_id, tournament_id, partner_id, opponents, phase, note)
    values (p_user, t2, andrea, 'Costa / Riva', 'Girone', '') returning id into m;
  insert into public.match_sets (match_id, set_number, us, them) values (m,1,15,21),(m,2,18,21);

  insert into public.matches (user_id, tournament_id, partner_id, opponents, phase, note)
    values (p_user, t2, andrea, 'Greco / Villa', 'Girone', '') returning id into m;
  insert into public.match_sets (match_id, set_number, us, them) values (m,1,21,19),(m,2,19,21),(m,3,10,15);

  insert into public.matches (user_id, tournament_id, partner_id, opponents, phase, note)
    values (p_user, t2, andrea, 'De Luca / Fabbri', 'Girone', '') returning id into m;
  insert into public.match_sets (match_id, set_number, us, them) values (m,1,21,17),(m,2,21,15);

  insert into public.matches (user_id, tournament_id, partner_id, opponents, phase, note)
    values (p_user, t3, luca, 'Longo / Serra', 'Girone', '') returning id into m;
  insert into public.match_sets (match_id, set_number, us, them) values (m,1,21,15),(m,2,21,18);

  insert into public.matches (user_id, tournament_id, partner_id, opponents, phase, note)
    values (p_user, t3, luca, 'Basile / Rizzo', 'Girone', '') returning id into m;
  insert into public.match_sets (match_id, set_number, us, them) values (m,1,19,21),(m,2,21,17),(m,3,15,12);

  insert into public.matches (user_id, tournament_id, partner_id, opponents, phase, note)
    values (p_user, t3, luca, 'Palumbo / Testa', 'Quarti', '') returning id into m;
  insert into public.match_sets (match_id, set_number, us, them) values (m,1,21,16),(m,2,21,19);

  insert into public.matches (user_id, tournament_id, partner_id, opponents, phase, note)
    values (p_user, t3, luca, 'Moretti / Fontana', 'Semifinale', '') returning id into m;
  insert into public.match_sets (match_id, set_number, us, them) values (m,1,22,20),(m,2,18,21),(m,3,15,11);

  insert into public.matches (user_id, tournament_id, partner_id, opponents, phase, note)
    values (p_user, t3, luca, 'Barbieri / Gatti', 'Finale', 'Persa al terzo, che peccato') returning id into m;
  insert into public.match_sets (match_id, set_number, us, them) values (m,1,18,21),(m,2,21,19),(m,3,12,15);

  -- foto
  insert into public.photos (user_id, tournament_id, color, caption) values
    (p_user, t1, '#FF6B35', 'Trofeo Cervia'),
    (p_user, t1, '#00B4D8', 'Match point finale'),
    (p_user, t3, '#FFD23F', 'Campo centrale Rimini'),
    (p_user, t3, '#FF477E', 'Tramonto sul mare'),
    (p_user, t2, '#1B2A4A', 'Warm-up Jesolo');
end;
$$;

comment on function public.seed_demo(uuid) is 'Popola i dati demo per l''utente indicato (default: utente loggato).';
