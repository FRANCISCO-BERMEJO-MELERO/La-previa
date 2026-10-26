begin;
create extension if not exists pgtap with schema extensions;

select plan(22);

-- Utilidades ------------------------------------------------------------------------------

insert into auth.users (id)
select format('00000000-0000-0000-0000-0000000000%s', lpad(i::text, 2, '0'))::uuid
from generate_series(1, 8) as i;

create function pg_temp.u(n integer) returns uuid language sql immutable as $$
  select format('00000000-0000-0000-0000-0000000000%s', lpad(n::text, 2, '0'))::uuid
$$;

create function pg_temp.ids(ns integer[]) returns uuid[] language sql immutable as $$
  select array(select pg_temp.u(n) from unnest(ns) with ordinality as e(n, o) order by o)
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

create function pg_temp.state() returns public.dados_state language sql stable as $$
  select s.* from public.dados_state s where s.game_id = (pg_temp.game()).id
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

create function pg_temp.start_sql(mode text, a integer[], b integer[]) returns text language sql stable as $$
  select format('select public.dados_start(%L, %L, %L, %L)', pg_temp.room(), mode, pg_temp.ids(a), pg_temp.ids(b))
$$;

create function pg_temp.start(mode text, a integer[], b integer[]) returns jsonb language sql as $$
  select pg_temp.call(1, pg_temp.start_sql(mode, a, b))
$$;

create function pg_temp.view(n integer) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.get_room_state(%L)', pg_temp.room())) -> 'game'
$$;

create function pg_temp.leave(n integer) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.leave_room(%L)', pg_temp.room()))
$$;

create function pg_temp.disconnect(n integer) returns void language sql as $$
  update public.room_players set last_seen_at = now() - interval '10 minutes'
  where room_id = pg_temp.room() and user_id = pg_temp.u(n);
$$;

create function pg_temp.kick(n integer) returns jsonb language sql as $$
  select pg_temp.call(1, format('select public.kick_player(%L, %L)', pg_temp.room(), pg_temp.u(n)))
$$;

-- Sala de 8 (u1 anfitrión) ------------------------------------------------------------------

insert into ctx select 'room', pg_temp.call(1, $$select public.create_room('Jugador 1')$$) -> 'room' -> 'id';
insert into ctx select 'code', to_jsonb((select code from public.rooms where id = pg_temp.room()));
select pg_temp.call(n, format('select public.join_room(%L, %L)', pg_temp.code(), format('Jugador %s', n)))
from generate_series(2, 8) as n;
select pg_temp.call(1, format('select public.set_game(%L, %L)', pg_temp.room(), 'dados'));

-- 1 contra 1: u1 contra u2; miran los demás ------------------------------------------------

select pg_temp.start('1v1', array[1], array[2]);

select pg_temp.leave(8);
select is((pg_temp.game()).phase, 'playing', 'si se va un espectador, la partida sigue');
select pg_temp.disconnect(7);
select pg_temp.kick(7);
select is((pg_temp.game()).phase, 'playing', 'y si se echa a un espectador desconectado, también');

select pg_temp.as_user(1);
select throws_ok(
  format('select public.kick_player(%L, %L)', pg_temp.room(), pg_temp.u(2)),
  'P0001', 'cannot_kick', 'a un jugador conectado no se le echa a media partida'
);
select pg_temp.as_admin();

select pg_temp.leave(2);
select is((pg_temp.game()).phase, 'finished', 'si se va un jugador, la partida termina en el acto');
select is(
  pg_temp.view(3) -> 'result',
  jsonb_build_object('winner', 'A', 'reason', 'forfeit', 'left', jsonb_build_object('user_id', pg_temp.u(2), 'name', 'Jugador 2')),
  'gana el otro bando por abandono, y se dice quién se fue'
);
select is(pg_temp.view(3) -> 'turn', 'null'::jsonb, 'ya no le toca a nadie');
select is(pg_temp.view(3) -> 'sides' -> 1 -> 'members' -> 0 ->> 'name', 'Jugador 2', 'el bando conserva el nombre de quien se fue');
select pg_temp.as_user(1);
select throws_ok(format('select public.dados_place(%L, 0)', pg_temp.room()), 'P0001', 'invalid_phase', 'ya no se coloca');

-- Volver a jugar con alguien que ya no está: el cliente vuelve a la sala de espera
select throws_ok(pg_temp.start_sql('1v1', array[1], array[2]), 'P0001', 'invalid_teams', 'no se repite con un jugador que ya no está');
select pg_temp.as_admin();
select is(
  pg_temp.call(1, format('select public.back_to_lobby(%L)', pg_temp.room())) -> 'game',
  'null'::jsonb,
  'y se vuelve a la sala de espera'
);

-- Expulsión de un jugador desconectado ------------------------------------------------------

select pg_temp.start('1v1', array[3], array[1]);
select pg_temp.disconnect(3);
select pg_temp.kick(3);
select is(
  pg_temp.view(4) -> 'result',
  jsonb_build_object('winner', 'B', 'reason', 'forfeit', 'left', jsonb_build_object('user_id', pg_temp.u(3), 'name', 'Jugador 3')),
  'echar a un jugador desconectado termina la partida a favor del otro bando'
);

-- El anfitrión que mira también puede irse sin parar nada ---------------------------------

select pg_temp.start('1v1', array[4], array[5]);
select pg_temp.leave(1);
select is((pg_temp.game()).phase, 'playing', 'si el anfitrión mira y se va, la partida sigue');
select is((select host_id from public.rooms where id = pg_temp.room()), pg_temp.u(4), 'y la sala pasa al siguiente por antigüedad');

-- 2 contra 2 y volver a jugar ---------------------------------------------------------------

update public.dados_state set boards = '{"A": [[1, 2, 3], [1, 2, 3], [1, 2]], "B": [[], [], []]}', pending_die = 3,
  turn_order = pg_temp.ids(array[4, 5]), turn_index = 0
where game_id = (pg_temp.game()).id;
select pg_temp.call(4, format('select public.dados_place(%L, 2)', pg_temp.room()));
select is((pg_temp.game()).phase, 'finished', 'la partida termina');
select pg_temp.call(1, format('select public.join_room(%L, %L)', pg_temp.code(), 'Jugador 1'));

select pg_temp.call(4, pg_temp.start_sql('2v2', array[4, 6], array[5, 1]));
insert into ctx select 'first', to_jsonb((pg_temp.game()).id);
-- Se fuerza el final para jugar otra con los mismos equipos.
select private.dados_finish((pg_temp.game()).id, 'A', 'board_full', null);

select pg_temp.as_user(4);
select lives_ok(pg_temp.start_sql('2v2', array[4, 6], array[5, 1]), 'volver a jugar con los mismos equipos');
select pg_temp.as_admin();
select isnt((pg_temp.game()).id, (select (value #>> '{}')::uuid from ctx where key = 'first'), 'es una partida nueva');
select is((pg_temp.state()).boards, '{"A": [[], [], []], "B": [[], [], []]}'::jsonb, 'con los tableros vacíos');
select is((pg_temp.state()).mode, '2v2', 'misma modalidad');
select is(
  (select array_agg(right(gp.user_id::text, 2)::integer || gp.side order by gp.user_id) from public.game_players gp where gp.game_id = (pg_temp.game()).id),
  array['1B', '4A', '5B', '6A'],
  'y mismos equipos'
);
select is((pg_temp.state()).end_reason, null::text, 'sin resultado anterior');

select pg_temp.leave(5);
select is(pg_temp.view(6) -> 'result' ->> 'winner', 'A', 'en 2 contra 2, si se va uno, gana el otro equipo');
select is(pg_temp.view(6) -> 'result' -> 'left' ->> 'name', 'Jugador 5', 'por abandono de quien se fue');

select * from finish();
rollback;
