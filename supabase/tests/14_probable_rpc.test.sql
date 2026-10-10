begin;
create extension if not exists pgtap with schema extensions;

select plan(47);

-- Utilidades ------------------------------------------------------------------------------

insert into auth.users (id)
select format('00000000-0000-0000-0000-0000000000%s', lpad(i::text, 2, '0'))::uuid
from generate_series(1, 9) as i;

create function pg_temp.u(n integer) returns uuid language sql immutable as $$
  select format('00000000-0000-0000-0000-0000000000%s', lpad(n::text, 2, '0'))::uuid
$$;

create function pg_temp.as_user(n integer) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', pg_temp.u(n), 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
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

create function pg_temp.code() returns text language sql stable as $$
  select value #>> '{}' from ctx where key = 'code'
$$;

create function pg_temp.game() returns public.games language sql stable as $$
  select g.* from public.games g join public.rooms r on r.current_game_id = g.id where r.id = pg_temp.room()
$$;

create function pg_temp.call(n integer, sql text) returns jsonb language plpgsql as $$
declare
  result jsonb;
begin
  perform pg_temp.as_user(n);
  execute sql into result;
  perform pg_temp.as_admin();
  return result;
end;
$$;

create function pg_temp.host(action text) returns jsonb language sql as $$
  select pg_temp.call(1, format('select public.%s(%L)', action, pg_temp.room()))
$$;

create function pg_temp.vote(voter integer, target integer) returns jsonb language sql as $$
  select pg_temp.call(voter, format('select public.probable_vote(%L, %L)', pg_temp.room(), pg_temp.u(target)))
$$;

create function pg_temp.score(n integer) returns integer language sql stable as $$
  select score from public.game_players where game_id = (pg_temp.game()).id and user_id = pg_temp.u(n)
$$;

create function pg_temp.round_result() returns jsonb language sql stable as $$
  select result from public.game_rounds where game_id = (pg_temp.game()).id and round = (pg_temp.game()).round
$$;

create function pg_temp.join(n integer) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.join_room(%L, %L)', pg_temp.code(), format('Jugador %s', n)))
$$;

-- Sala con u1 de anfitrión y u2 --------------------------------------------------------------

insert into ctx select 'room', pg_temp.call(1, $$select public.create_room('Jugador 1')$$) -> 'room' -> 'id';
insert into ctx select 'code', to_jsonb((select code from public.rooms where id = pg_temp.room()));
select pg_temp.join(2);

-- probable_start: rechazos ----------------------------------------------------------------------

select pg_temp.as_user(1);
select throws_ok(format('select public.probable_start(%L, 10)', pg_temp.room()), 'P0001', 'invalid_game', 'no se empieza probable si la sala eligió otro juego');
select throws_ok(format('select public.set_game(%L, %L)', pg_temp.room(), 'parchis'), 'P0001', 'invalid_game', 'set_game sigue rechazando juegos que no existen');
select lives_ok(format('select public.set_game(%L, %L)', pg_temp.room(), 'probable'), 'set_game acepta probable');
select pg_temp.as_admin();
select is((select game from public.rooms where id = pg_temp.room()), 'probable', 'la sala elige probable');

select pg_temp.as_user(1);
select throws_ok(format('select public.probable_start(%L, 10)', pg_temp.room()), 'P0001', 'not_enough_players', 'hacen falta 3 jugadores');
select pg_temp.as_admin();
select pg_temp.join(3);
select pg_temp.join(4);

select pg_temp.as_user(2);
select throws_ok(format('select public.probable_start(%L, 10)', pg_temp.room()), 'P0001', 'not_host', 'solo el anfitrión empieza');
select pg_temp.as_user(1);
select throws_ok(format('select public.probable_start(%L, 7)', pg_temp.room()), 'P0001', 'invalid_rounds', 'las rondas son 5, 10 o 15');
select throws_ok(format('select public.probable_start(%L, null)', pg_temp.room()), 'P0001', 'invalid_rounds', 'hay que elegir rondas');
select pg_temp.as_admin();

-- probable_start ------------------------------------------------------------------------------

select pg_temp.call(1, format('select public.probable_start(%L, 5)', pg_temp.room()));
select is((pg_temp.game()).game_type, 'probable', 'la partida es de probable');
select is((pg_temp.game()).phase, 'voting', 'empieza votando');
select is((pg_temp.game()).round, 1, 'en la ronda 1');
select is((pg_temp.game()).total_rounds, 5, 'de las 5 elegidas');
select is(
  (select count(*) from public.game_players where game_id = (pg_temp.game()).id and alive and score = 0),
  4::bigint,
  'participan los 4 miembros, con 0 puntos'
);
select isnt(
  (select prompt_id from public.game_rounds where game_id = (pg_temp.game()).id and round = 1),
  null,
  'la ronda 1 tiene pregunta'
);

select pg_temp.as_user(1);
select throws_ok(format('select public.probable_start(%L, 5)', pg_temp.room()), 'P0001', 'invalid_phase', 'no se empieza con una partida en curso');
select throws_ok(format('select public.set_game(%L, %L)', pg_temp.room(), 'impostor'), 'P0001', 'invalid_phase', 'no se cambia de juego en partida');

-- Las acciones de El impostor no sirven aquí.
select throws_ok(format('select public.cast_vote(%L, %L)', pg_temp.room(), pg_temp.u(2)), 'P0001', 'invalid_phase', 'cast_vote no vale en probable');
select throws_ok(format('select public.close_voting(%L)', pg_temp.room()), 'P0001', 'invalid_phase', 'close_voting no vale en probable');
select throws_ok(format('select public.open_voting(%L)', pg_temp.room()), 'P0001', 'invalid_phase', 'open_voting no vale en probable');
select throws_ok(format('select public.back_to_lobby(%L)', pg_temp.room()), 'P0001', 'invalid_phase', 'no se vuelve a la sala con la partida en curso');
select throws_ok(format('select public.probable_next(%L)', pg_temp.room()), 'P0001', 'invalid_phase', 'no se pasa de ronda votando');

-- probable_vote: rechazos -----------------------------------------------------------------------

select throws_ok(format('select public.probable_vote(%L, %L)', pg_temp.room(), pg_temp.u(9)), 'P0001', 'invalid_target', 'solo se vota a participantes');
select throws_ok(format('select public.probable_vote(%L, null)', pg_temp.room()), 'P0001', 'invalid_target', 'hay que votar a alguien');
select pg_temp.as_admin();

select pg_temp.join(5);
select pg_temp.as_user(5);
select throws_ok(format('select public.probable_vote(%L, %L)', pg_temp.room(), pg_temp.u(2)), 'P0001', 'not_participant', 'quien llegó tarde no vota en esta ronda');
select pg_temp.as_user(6);
select throws_ok(format('select public.probable_vote(%L, %L)', pg_temp.room(), pg_temp.u(2)), 'P0001', 'not_member', 'quien no está en la sala no vota');
select pg_temp.as_user(2);
select throws_ok(format('select public.probable_close(%L)', pg_temp.room()), 'P0001', 'not_host', 'solo el anfitrión cierra');
select pg_temp.as_admin();

-- Ronda 1: ganador único ------------------------------------------------------------------------

select lives_ok($$select pg_temp.vote(1, 1)$$, 'uno puede votarse a sí mismo');
select pg_temp.as_user(1);
select throws_ok(format('select public.probable_vote(%L, %L)', pg_temp.room(), pg_temp.u(2)), 'P0001', 'already_voted', 'no se vota dos veces');
select pg_temp.as_admin();
select pg_temp.vote(2, 1);
select pg_temp.vote(3, 2);
select pg_temp.host('probable_close');

select is((pg_temp.game()).phase, 'reveal', 'cerrar pasa a la revelación con votos parciales');
select is(array[pg_temp.score(1), pg_temp.score(2), pg_temp.score(3)], array[1, 0, 0], 'el más votado se lleva un punto');
select is(
  pg_temp.round_result(),
  jsonb_build_object(
    'tally', jsonb_build_array(
      jsonb_build_object('user_id', pg_temp.u(1), 'votes', 2, 'voter_ids', jsonb_build_array(pg_temp.u(1), pg_temp.u(2))),
      jsonb_build_object('user_id', pg_temp.u(2), 'votes', 1, 'voter_ids', jsonb_build_array(pg_temp.u(3)))
    ),
    'winner_ids', jsonb_build_array(pg_temp.u(1))
  ),
  'el recuento queda guardado, de más a menos votos'
);
select pg_temp.as_user(4);
select throws_ok(format('select public.probable_vote(%L, %L)', pg_temp.room(), pg_temp.u(2)), 'P0001', 'invalid_phase', 'no se vota en la revelación');
select pg_temp.as_admin();

-- Ronda 2: empate en cabeza ---------------------------------------------------------------------

select pg_temp.host('probable_next');
select is((pg_temp.game()).round, 2, 'siguiente ronda');
select is((pg_temp.game()).phase, 'voting', 'que empieza votando');
select pg_temp.vote(1, 2);
select pg_temp.vote(2, 1);
select pg_temp.host('probable_close');
select is(array[pg_temp.score(1), pg_temp.score(2), pg_temp.score(3)], array[2, 1, 0], 'en un empate puntúan todos los empatados');
select is(jsonb_array_length(pg_temp.round_result() -> 'winner_ids'), 2, 'y todos son ganadores de la ronda');

-- Ronda 3: sin votos ----------------------------------------------------------------------------

select pg_temp.host('probable_next');
select pg_temp.host('probable_close');
select is(array[pg_temp.score(1), pg_temp.score(2), pg_temp.score(3)], array[2, 1, 0], 'sin votos nadie puntúa');
select is(pg_temp.round_result(), '{"tally": [], "winner_ids": []}'::jsonb, 'y el recuento está vacío');

-- Rondas 4 y 5, y final -------------------------------------------------------------------------

select pg_temp.host('probable_next');
select pg_temp.host('probable_close');
select pg_temp.host('probable_next');
select pg_temp.host('probable_close');
select is((pg_temp.game()).round, 5, 'última ronda');
select pg_temp.host('probable_next');
select is((pg_temp.game()).phase, 'finished', 'tras la última ronda la partida termina');
select isnt((pg_temp.game()).finished_at, null, 'con fecha de fin');
select is(
  (select count(distinct prompt_id) from public.game_rounds where game_id = (pg_temp.game()).id),
  5::bigint,
  'ninguna pregunta se repite en la partida'
);
select pg_temp.as_user(1);
select throws_ok(format('select public.probable_next(%L)', pg_temp.room()), 'P0001', 'invalid_phase', 'una partida terminada no avanza');
select pg_temp.as_admin();

-- Volver a jugar y volver a la sala -------------------------------------------------------------

insert into ctx select 'first_game', to_jsonb((pg_temp.game()).id);
select pg_temp.call(1, format('select public.probable_start(%L, 5)', pg_temp.room()));
select isnt((pg_temp.game()).id, (select (value #>> '{}')::uuid from ctx where key = 'first_game'), 'volver a jugar crea otra partida');
select is(
  (select count(*) from public.game_players where game_id = (pg_temp.game()).id),
  5::bigint,
  'en la que juega también quien llegó tarde'
);
select is(
  (select count(*) from public.game_rounds gr
   where gr.game_id = (select (value #>> '{}')::uuid from ctx where key = 'first_game')
     and gr.prompt_id = (select prompt_id from public.game_rounds where game_id = (pg_temp.game()).id and round = 1)),
  0::bigint,
  'y la pregunta no ha salido antes en la sala'
);

update public.games set phase = 'finished', finished_at = now() where id = (pg_temp.game()).id;
select pg_temp.host('back_to_lobby');
select is((select current_game_id from public.rooms where id = pg_temp.room()), null, 'back_to_lobby vale para probable');

select * from finish();
rollback;
