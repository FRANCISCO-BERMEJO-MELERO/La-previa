begin;
create extension if not exists pgtap with schema extensions;

select plan(43);

-- Utilidades ------------------------------------------------------------------------------

insert into auth.users (id)
select format('00000000-0000-0000-0000-0000000000%s', lpad(i::text, 2, '0'))::uuid
from generate_series(1, 9) as i;

create function pg_temp.u(n integer) returns uuid language sql immutable as $$
  select format('00000000-0000-0000-0000-0000000000%s', lpad(n::text, 2, '0'))::uuid
$$;

create function pg_temp.as_uid(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;

create function pg_temp.as_user(n integer) returns void language sql as $$
  select pg_temp.as_uid(pg_temp.u(n))
$$;

create function pg_temp.as_admin() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end;
$$;

create temp table ctx (key text primary key, value jsonb);
grant all on ctx to authenticated;

create function pg_temp.room() returns uuid language sql stable as $$
  select (value #>> '{}')::uuid from ctx where key = 'room'
$$;

create function pg_temp.game() returns public.games language sql stable as $$
  select g.* from public.games g join public.rooms r on r.current_game_id = g.id where r.id = pg_temp.room()
$$;

-- k-ésimo impostor o jugador normal vivo de la partida, en orden estable.
create function pg_temp.alive_with(role text, k integer) returns uuid language sql stable as $$
  select gp.user_id
  from public.game_players gp
  join public.game_roles gr on gr.game_id = gp.game_id and gr.user_id = gp.user_id
  where gp.game_id = (pg_temp.game()).id and gp.alive and gr.role = alive_with.role
  order by gp.user_id
  offset k - 1 limit 1
$$;

-- Votan todos los vivos al objetivo, salvo el propio objetivo, que vota a otro.
create function pg_temp.everyone_votes(target uuid) returns void language plpgsql as $$
declare
  voter uuid;
  other uuid;
begin
  for voter in
    select gp.user_id from public.game_players gp where gp.game_id = (pg_temp.game()).id and gp.alive
  loop
    select gp.user_id into other from public.game_players gp
    where gp.game_id = (pg_temp.game()).id and gp.alive and gp.user_id <> target limit 1;
    perform pg_temp.as_uid(voter);
    perform public.cast_vote(pg_temp.room(), case when voter = target then other else target end);
    perform pg_temp.as_admin();
  end loop;
  perform pg_temp.as_admin();
end;
$$;

create function pg_temp.host(sql text) returns jsonb language plpgsql as $$
declare
  result jsonb;
begin
  perform pg_temp.as_user(1);
  execute sql into result;
  perform pg_temp.as_admin();
  return result;
end;
$$;

-- Sala de 5 con u1 de anfitrión y partida con 1 impostor.
create function pg_temp.setup(players integer, impostors integer) returns void language plpgsql as $$
declare
  state jsonb;
begin
  perform pg_temp.as_user(1);
  state := public.create_room('Jugador 1');
  for n in 2..players loop
    perform pg_temp.as_user(n);
    perform public.join_room(state -> 'room' ->> 'code', format('Jugador %s', n));
  end loop;
  perform pg_temp.as_user(1);
  perform public.start_game((state -> 'room' ->> 'id')::uuid, impostors);
  perform pg_temp.as_admin();
  delete from ctx where key in ('room', 'code');
  insert into ctx values ('room', to_jsonb(state -> 'room' ->> 'id')), ('code', to_jsonb(state -> 'room' ->> 'code'));
end;
$$;

select pg_temp.setup(5, 1);

-- open_voting -----------------------------------------------------------------------------

select pg_temp.as_user(1);
select throws_ok(format('select public.cast_vote(%L, %L)', pg_temp.room(), pg_temp.u(2)), 'P0001', 'invalid_phase', 'no se vota mientras se habla');
select throws_ok(format('select public.close_voting(%L)', pg_temp.room()), 'P0001', 'invalid_phase', 'no se cierra una votación que no está abierta');
select pg_temp.as_user(2);
select throws_ok(format('select public.open_voting(%L)', pg_temp.room()), 'P0001', 'not_host', 'solo el anfitrión abre la votación');
select pg_temp.as_admin();

select pg_temp.host(format('select public.open_voting(%L)', pg_temp.room()));
select is((pg_temp.game()).phase, 'voting', 'open_voting pasa a votación');
select pg_temp.as_user(1);
select throws_ok(format('select public.open_voting(%L)', pg_temp.room()), 'P0001', 'invalid_phase', 'no se abre dos veces');

-- cast_vote: rechazos -------------------------------------------------------------------------

select throws_ok(format('select public.cast_vote(%L, %L)', pg_temp.room(), pg_temp.u(1)), 'P0001', 'invalid_target', 'nadie se vota a sí mismo');
select throws_ok(format('select public.cast_vote(%L, %L)', pg_temp.room(), pg_temp.u(9)), 'P0001', 'invalid_target', 'solo se vota a participantes');
select throws_ok(format('select public.cast_vote(%L, null)', pg_temp.room()), 'P0001', 'invalid_target', 'hay que votar a alguien');

-- Llega tarde: está en la sala pero no en la partida.
select pg_temp.as_user(6);
select public.join_room((select value #>> '{}' from ctx where key = 'code'), 'Tardón');
select throws_ok(format('select public.cast_vote(%L, %L)', pg_temp.room(), pg_temp.u(2)), 'P0001', 'not_participant', 'quien llegó tarde no vota');
select pg_temp.as_user(7);
select throws_ok(format('select public.cast_vote(%L, %L)', pg_temp.room(), pg_temp.u(2)), 'P0001', 'not_member', 'quien no está en la sala no vota');

-- cast_vote: votar --------------------------------------------------------------------------

select pg_temp.as_admin();
insert into ctx values ('version', to_jsonb((select version from public.rooms where id = pg_temp.room())));
select pg_temp.as_user(1);
select lives_ok(format('select public.cast_vote(%L, %L)', pg_temp.room(), pg_temp.u(2)), 'un vivo vota a otro vivo');
select throws_ok(format('select public.cast_vote(%L, %L)', pg_temp.room(), pg_temp.u(3)), 'P0001', 'already_voted', 'no se vota dos veces ni se cambia el voto');
select pg_temp.as_admin();
select is((select has_voted from public.game_players where game_id = (pg_temp.game()).id and user_id = pg_temp.u(1)), true, 'queda marcado que ha votado');
select is((select target_id from public.votes where game_id = (pg_temp.game()).id and voter_id = pg_temp.u(1)), pg_temp.u(2), 'el voto se guarda');
select is((select version from public.rooms where id = pg_temp.room()), (select value::bigint + 1 from ctx where key = 'version'), 'votar sube la versión');

-- close_voting: un único más votado ----------------------------------------------------------------

-- u3, u4 y u5 votan a u2; u2 vota a u1.
select pg_temp.as_user(3);
select public.cast_vote(pg_temp.room(), pg_temp.u(2));
select pg_temp.as_user(4);
select public.cast_vote(pg_temp.room(), pg_temp.u(2));
select pg_temp.as_user(2);
select public.cast_vote(pg_temp.room(), pg_temp.u(1));
select pg_temp.as_user(2);
select throws_ok(format('select public.close_voting(%L)', pg_temp.room()), 'P0001', 'not_host', 'solo el anfitrión cierra');
select pg_temp.as_admin();

-- Se cierra con los votos que haya, aunque falte u5.
select pg_temp.host(format('select public.close_voting(%L)', pg_temp.room()));
select is((pg_temp.game()).phase, 'reveal', 'cerrar pasa a revelación');
select is((select alive from public.game_players where game_id = (pg_temp.game()).id and user_id = pg_temp.u(2)), false, 'el más votado queda eliminado');
select is(
  (pg_temp.game()).outcome,
  jsonb_build_object(
    'type', 'eliminated',
    'user_id', pg_temp.u(2),
    'name', 'Jugador 2',
    'was_impostor', (select role = 'impostor' from public.game_roles where game_id = (pg_temp.game()).id and user_id = pg_temp.u(2))
  ),
  'outcome dice a quién y si era el impostor'
);

-- continue_game ------------------------------------------------------------------------------

select pg_temp.as_admin();
-- Para la prueba, u2 era jugador normal: la partida sigue.
update public.game_roles set role = case when user_id = pg_temp.u(5) then 'impostor' else 'player' end
where game_id = (pg_temp.game()).id;
select pg_temp.host(format('select public.continue_game(%L)', pg_temp.room()));
select is((pg_temp.game()).phase, 'talking', 'si nadie ha ganado, se vuelve a hablar');
select is((pg_temp.game()).round, 2, 'en la ronda siguiente');
select is((pg_temp.game()).outcome, null, 'sin el resultado anterior');

-- Un eliminado no vota.
select pg_temp.host(format('select public.open_voting(%L)', pg_temp.room()));
select is((select bool_or(has_voted) from public.game_players where game_id = (pg_temp.game()).id), false, 'abrir votación reinicia quién ha votado');
select pg_temp.as_user(2);
select throws_ok(format('select public.cast_vote(%L, %L)', pg_temp.room(), pg_temp.u(1)), 'P0001', 'not_alive', 'un eliminado no vota');
select pg_temp.as_user(1);
select throws_ok(format('select public.cast_vote(%L, %L)', pg_temp.room(), pg_temp.u(2)), 'P0001', 'invalid_target', 'no se vota a un eliminado');

-- close_voting: empate ---------------------------------------------------------------------------

-- u1 y u3 votan a u4; u4 y u5 votan a u3.
select public.cast_vote(pg_temp.room(), pg_temp.u(4));
select pg_temp.as_user(3);
select public.cast_vote(pg_temp.room(), pg_temp.u(4));
select pg_temp.as_user(4);
select public.cast_vote(pg_temp.room(), pg_temp.u(3));
select pg_temp.as_user(5);
select public.cast_vote(pg_temp.room(), pg_temp.u(3));
select pg_temp.as_admin();
select pg_temp.host(format('select public.close_voting(%L)', pg_temp.room()));
select is(
  (pg_temp.game()).outcome,
  jsonb_build_object('type', 'tie', 'user_ids', jsonb_build_array(pg_temp.u(3), pg_temp.u(4))),
  'con empate en cabeza no se elimina a nadie'
);
select is((select count(*) from public.game_players where game_id = (pg_temp.game()).id and not alive), 1::bigint, 'en el empate sigue habiendo un solo eliminado');

-- close_voting: sin votos ----------------------------------------------------------------------

select pg_temp.host(format('select public.continue_game(%L)', pg_temp.room()));
select pg_temp.host(format('select public.open_voting(%L)', pg_temp.room()));
select pg_temp.host(format('select public.close_voting(%L)', pg_temp.room()));
select is((pg_temp.game()).outcome, '{"type": "tie", "user_ids": []}'::jsonb, 'sin votos es un empate vacío');

-- Victoria del grupo: cae el último impostor -------------------------------------------------------

select pg_temp.host(format('select public.continue_game(%L)', pg_temp.room()));
select is((pg_temp.game()).round, 4, 'cada vuelta a hablar sube la ronda');
select pg_temp.host(format('select public.open_voting(%L)', pg_temp.room()));
select pg_temp.everyone_votes(pg_temp.u(5));
select pg_temp.host(format('select public.close_voting(%L)', pg_temp.room()));
select is(((pg_temp.game()).outcome ->> 'was_impostor')::boolean, true, 'el expulsado era el impostor');
select pg_temp.as_user(1);
select throws_ok(format('select public.back_to_lobby(%L)', pg_temp.room()), 'P0001', 'invalid_phase', 'solo se vuelve a la sala con la partida terminada');
select pg_temp.as_admin();
select pg_temp.host(format('select public.continue_game(%L)', pg_temp.room()));
select is((pg_temp.game()).phase, 'finished', 'sin impostores la partida termina');
select is((pg_temp.game()).winner, 'group', 'y gana el grupo');
select isnt((pg_temp.game()).finished_at, null, 'con su hora de fin');
select pg_temp.as_user(1);
select throws_ok(format('select public.continue_game(%L)', pg_temp.room()), 'P0001', 'invalid_phase', 'no se continúa una partida terminada');

-- back_to_lobby -----------------------------------------------------------------------------------

select pg_temp.as_user(2);
select throws_ok(format('select public.back_to_lobby(%L)', pg_temp.room()), 'P0001', 'not_host', 'solo el anfitrión vuelve a la sala');
select pg_temp.as_admin();
select is((pg_temp.host(format('select public.back_to_lobby(%L)', pg_temp.room()))) -> 'game', 'null'::jsonb, 'back_to_lobby vuelve a la sala de espera');
select is((select current_game_id from public.rooms where id = pg_temp.room()), null, 'la sala ya no tiene partida');

-- Victoria de los impostores: igualan en número -------------------------------------------------

select pg_temp.setup(5, 2);
-- Cae un jugador normal: quedan 2 impostores contra 2 normales.
select pg_temp.host(format('select public.open_voting(%L)', pg_temp.room()));
insert into ctx values ('victim', to_jsonb(pg_temp.alive_with('player', 1)));
select pg_temp.everyone_votes((select (value #>> '{}')::uuid from ctx where key = 'victim'));
select pg_temp.host(format('select public.close_voting(%L)', pg_temp.room()));
select is(((pg_temp.game()).outcome ->> 'was_impostor')::boolean, false, 'el expulsado era un jugador normal');
select pg_temp.host(format('select public.continue_game(%L)', pg_temp.room()));
select is((pg_temp.game()).phase, 'finished', 'con tantos impostores como normales se acaba');
select is((pg_temp.game()).winner, 'impostors', 'y ganan los impostores');

-- Seguridad de las funciones -----------------------------------------------------------------------

select is(
  (select bool_and(p.prosecdef and p.proconfig @> array['search_path=""'])
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('start_game', 'open_voting', 'cast_vote', 'close_voting', 'continue_game', 'back_to_lobby')),
  true,
  'las RPC de partida son security definer con search_path vacío'
);
select is(
  (select bool_or(has_function_privilege('anon', p.oid, 'execute'))
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public', 'private')),
  false,
  'anon sigue sin poder ejecutar ninguna función'
);

select * from finish();
rollback;
