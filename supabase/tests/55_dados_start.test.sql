begin;
create extension if not exists pgtap with schema extensions;

select plan(39);

-- Utilidades ------------------------------------------------------------------------------

insert into auth.users (id)
select format('00000000-0000-0000-0000-0000000000%s', lpad(i::text, 2, '0'))::uuid
from generate_series(1, 8) as i;

create function pg_temp.u(n integer) returns uuid language sql immutable as $$
  select format('00000000-0000-0000-0000-0000000000%s', lpad(n::text, 2, '0'))::uuid
$$;

create function pg_temp.n(id uuid) returns integer language sql immutable as $$
  select right(id::text, 2)::integer
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

create function pg_temp.finish() returns void language sql as $$
  select private.dados_finish((pg_temp.game()).id, null, 'board_full', null)
$$;

-- Sala de 6 (u1 anfitrión); u7 y u8 existen pero no están en la sala ------------------------

insert into ctx select 'room', pg_temp.call(1, $$select public.create_room('Jugador 1')$$) -> 'room' -> 'id';
insert into ctx select 'code', to_jsonb((select code from public.rooms where id = pg_temp.room()));
select pg_temp.call(n, format('select public.join_room(%L, %L)', pg_temp.code(), format('Jugador %s', n)))
from generate_series(2, 6) as n;

select pg_temp.as_user(1);
select throws_ok(pg_temp.start_sql('1v1', array[1], array[2]), 'P0001', 'invalid_game', 'no se empieza si la sala eligió otro juego');
select pg_temp.as_admin();
select pg_temp.call(1, format('select public.set_game(%L, %L)', pg_temp.room(), 'dados'));

-- Rechazos ----------------------------------------------------------------------------------

select pg_temp.as_user(2);
select throws_ok(pg_temp.start_sql('1v1', array[1], array[2]), 'P0001', 'not_host', 'solo empieza el anfitrión');
select pg_temp.as_user(1);
select throws_ok(pg_temp.start_sql('3v3', array[1], array[2]), 'P0001', 'invalid_mode', 'modalidad desconocida');
select throws_ok(pg_temp.start_sql(null, array[1], array[2]), 'P0001', 'invalid_mode', 'sin modalidad');
select throws_ok(pg_temp.start_sql('1v1', array[1, 3], array[2]), 'P0001', 'invalid_teams', 'en 1 contra 1 va uno por bando');
select throws_ok(pg_temp.start_sql('2v2', array[1, 3], array[2]), 'P0001', 'invalid_teams', 'en 2 contra 2 van dos por bando');
select throws_ok(pg_temp.start_sql('2v2', array[1, 3, 5], array[2, 4, 6]), 'P0001', 'invalid_teams', 'ni tres');
select throws_ok(pg_temp.start_sql('1v1', array[]::integer[], array[]::integer[]), 'P0001', 'invalid_teams', 'ni nadie');
select throws_ok(
  format('select public.dados_start(%L, %L, null, %L)', pg_temp.room(), '1v1', pg_temp.ids(array[2])),
  'P0001', 'invalid_teams', 'un bando sin lista'
);
select throws_ok(
  format('select public.dados_start(%L, %L, %L, %L)', pg_temp.room(), '1v1', array[null]::uuid[], pg_temp.ids(array[2])),
  'P0001', 'invalid_teams', 'un hueco vacío'
);
select throws_ok(pg_temp.start_sql('2v2', array[1, 1], array[2, 3]), 'P0001', 'invalid_teams', 'repetidos en un bando');
select throws_ok(pg_temp.start_sql('2v2', array[1, 2], array[2, 3]), 'P0001', 'invalid_teams', 'alguien en los dos bandos');
select throws_ok(pg_temp.start_sql('1v1', array[1], array[1]), 'P0001', 'invalid_teams', 'contra sí mismo');
select throws_ok(pg_temp.start_sql('2v2', array[1, 7], array[2, 3]), 'P0001', 'invalid_teams', 'alguien que no está en la sala');
select pg_temp.as_admin();

-- 1 contra 1: u1 contra u2; miran u3 a u6 ---------------------------------------------------

select pg_temp.start('1v1', array[1], array[2]);

select is((pg_temp.game()).phase, 'playing', 'la partida empieza jugando');
select is(
  (select array_agg(pg_temp.n(gp.user_id) || gp.side order by gp.user_id) from public.game_players gp where gp.game_id = (pg_temp.game()).id),
  array['1A', '2B'],
  'solo juegan los asignados, cada uno en su bando'
);
select ok(
  (select array(select pg_temp.n(t) from unnest(turn_order) t) from pg_temp.state()) in (array[1, 2], array[2, 1]),
  'el orden alterna los dos jugadores'
);
select ok((pg_temp.state()).pending_die between 1 and 6, 'el primer dado ya está tirado');
select is((pg_temp.state()).turn_index, 0, 'empieza el primero del orden');
select is((pg_temp.state()).boards, '{"A": [[], [], []], "B": [[], [], []]}'::jsonb, 'con los tableros vacíos');

select pg_temp.as_user(1);
select throws_ok(pg_temp.start_sql('1v1', array[1], array[2]), 'P0001', 'invalid_phase', 'no se empieza otra con una en curso');
select pg_temp.as_admin();

-- Foto --------------------------------------------------------------------------------------

select is(pg_temp.view(3) -> 'type', '"dados"', 'la variante es dados');
select is(pg_temp.view(3) ->> 'mode', '1v1', 'con su modalidad');
select is(
  pg_temp.view(3) -> 'sides' -> 0,
  jsonb_build_object(
    'side', 'A',
    'members', jsonb_build_array(jsonb_build_object('user_id', pg_temp.u(1), 'name', 'Jugador 1')),
    'board', '[[], [], []]'::jsonb,
    'column_scores', '[0, 0, 0]'::jsonb,
    'total', 0
  ),
  'cada bando con quién juega, su tablero y sus puntos'
);
select is(pg_temp.view(3) -> 'sides' -> 1 ->> 'side', 'B', 'los dos bandos, A y B');
select is(
  pg_temp.view(3) -> 'turn',
  jsonb_build_object(
    'user_id', (pg_temp.state()).turn_order[1],
    'side', case pg_temp.n((pg_temp.state()).turn_order[1]) when 1 then 'A' else 'B' end
  ),
  'a quién le toca y de qué bando es'
);
select is((pg_temp.view(3) ->> 'pending_die')::integer, (pg_temp.state()).pending_die, 'todos ven el dado pendiente');
select is(pg_temp.view(3) -> 'pending_die', pg_temp.view(4) -> 'pending_die', 'el mismo para todos');
select is(pg_temp.view(3) -> 'pending_die', pg_temp.view(3) -> 'pending_die', 'y el mismo al releer la foto');
select is(pg_temp.view(3) -> 'my', '{"side": null, "is_spectator": true, "is_my_turn": false}'::jsonb, 'quien no juega mira');
select is(
  pg_temp.view(pg_temp.n((pg_temp.state()).turn_order[1])) -> 'my' -> 'is_my_turn',
  'true'::jsonb,
  'a quien le toca se le dice'
);
select is(
  pg_temp.view(pg_temp.n((pg_temp.state()).turn_order[2])) -> 'my' -> 'is_my_turn',
  'false'::jsonb,
  'y al otro no'
);
select is(pg_temp.view(2) -> 'my' ->> 'side', 'B', 'cada jugador sabe su bando');
select is(pg_temp.view(3) -> 'result', 'null'::jsonb, 'sin resultado mientras se juega');

-- Entrar tarde ------------------------------------------------------------------------------

select pg_temp.call(7, format('select public.join_room(%L, %L)', pg_temp.code(), 'Jugador 7'));
select is(pg_temp.view(7) -> 'my', '{"side": null, "is_spectator": true, "is_my_turn": false}'::jsonb, 'quien entra tarde mira la partida');

-- 2 contra 2: orden alterno y bando inicial al azar -----------------------------------------

select pg_temp.finish();
select pg_temp.start('2v2', array[1, 3], array[2, 4]);
select is(
  (
    select array(select gp.side from unnest(s.turn_order) with ordinality as t(id, o) join public.game_players gp on gp.game_id = s.game_id and gp.user_id = t.id order by t.o)
    from pg_temp.state() s
  ) in (array['A', 'B', 'A', 'B'], array['B', 'A', 'B', 'A']),
  true,
  'los turnos alternan los bandos'
);
select is(
  (select count(distinct t) from unnest((pg_temp.state()).turn_order) t),
  4::bigint,
  'y pasan por las cuatro personas'
);

create temp table openers (side text, first_of_a integer);
do $$
begin
  for i in 1..40 loop
    perform pg_temp.finish();
    perform pg_temp.start('2v2', array[1, 3], array[2, 4]);
    insert into openers
    select gp.side, (select pg_temp.n(t.id) from unnest(s.turn_order) with ordinality as t(id, o) join public.game_players a on a.game_id = s.game_id and a.user_id = t.id and a.side = 'A' order by t.o limit 1)
    from pg_temp.state() s
    join public.game_players gp on gp.game_id = s.game_id and gp.user_id = s.turn_order[1];
  end loop;
end;
$$;
select is((select count(distinct side) from openers), 2::bigint, 'a veces abre A y a veces B');
select is((select count(distinct first_of_a) from openers), 2::bigint, 'y dentro de un equipo, el orden también se sortea');

select * from finish();
rollback;
