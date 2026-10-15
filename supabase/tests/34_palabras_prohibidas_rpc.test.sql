begin;
create extension if not exists pgtap with schema extensions;

select plan(42);

-- Utilidades ------------------------------------------------------------------------------

insert into auth.users (id)
select format('00000000-0000-0000-0000-0000000000%s', lpad(i::text, 2, '0'))::uuid
from generate_series(1, 9) as i;

create function pg_temp.u(n integer) returns uuid language sql immutable as $$
  select format('00000000-0000-0000-0000-0000000000%s', lpad(n::text, 2, '0'))::uuid
$$;

create function pg_temp.n(id uuid) returns integer language sql immutable as $$
  select right(id::text, 2)::integer
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

create function pg_temp.act(n integer, action text) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.%s(%L)', action, pg_temp.room()))
$$;

create function pg_temp.guessed(n integer, target integer) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.palabras_prohibidas_guessed(%L, %L)', pg_temp.room(), pg_temp.u(target)))
$$;

create function pg_temp.describer() returns integer language sql stable as $$
  select pg_temp.n(subject_id) from public.game_rounds where game_id = (pg_temp.game()).id and round = (pg_temp.game()).round
$$;

create function pg_temp.watcher() returns integer language sql stable as $$
  select pg_temp.n(private.palabras_prohibidas_watcher(pg_temp.game()))
$$;

create function pg_temp.card(round integer) returns bigint language sql stable as $$
  select card_id from public.game_rounds where game_id = (pg_temp.game()).id and round = card.round
$$;

create function pg_temp.result() returns jsonb language sql stable as $$
  select result from public.game_rounds where game_id = (pg_temp.game()).id and round = (pg_temp.game()).round
$$;

create function pg_temp.scores() returns integer[] language sql stable as $$
  select array_agg(score order by user_id) from public.game_players where game_id = (pg_temp.game()).id
$$;

-- Sala de 4 (u1 anfitrión) --------------------------------------------------------------------

insert into ctx select 'room', pg_temp.call(1, $$select public.create_room('Jugador 1')$$) -> 'room' -> 'id';
insert into ctx select 'code', to_jsonb((select code from public.rooms where id = pg_temp.room()));
select pg_temp.call(n, format('select public.join_room(%L, %L)', pg_temp.code(), format('Jugador %s', n)))
from generate_series(2, 4) as n;

-- Empezar ------------------------------------------------------------------------------------

select pg_temp.as_user(1);
select throws_ok(format('select public.palabras_prohibidas_start(%L, 5)', pg_temp.room()), 'P0001', 'invalid_game', 'no se empieza si la sala eligió otro juego');
select lives_ok(format('select public.set_game(%L, %L)', pg_temp.room(), 'palabras_prohibidas'), 'set_game acepta palabras_prohibidas');
select throws_ok(format('select public.palabras_prohibidas_start(%L, 6)', pg_temp.room()), 'P0001', 'invalid_rounds', 'las rondas son 5, 10 o 15');
select pg_temp.as_admin();

select pg_temp.call(1, format('select public.palabras_prohibidas_start(%L, 5)', pg_temp.room()));
select is((pg_temp.game()).phase, 'describing', 'empieza describiendo');
select isnt(pg_temp.card(1), null, 'con una tarjeta');
select is(pg_temp.describer(), 1, 'describe primero el primero en entrar');
select is(pg_temp.watcher(), 2, 'y vigila el siguiente');

-- Quién hace qué ------------------------------------------------------------------------------

select pg_temp.as_user(2);
select throws_ok(format('select public.palabras_prohibidas_pass(%L)', pg_temp.room()), 'P0001', 'not_describer', 'solo pasa quien describe');
select throws_ok(format('select public.palabras_prohibidas_guessed(%L, %L)', pg_temp.room(), pg_temp.u(3)), 'P0001', 'not_describer', 'solo marca el acierto quien describe');
select pg_temp.as_user(3);
select throws_ok(format('select public.palabras_prohibidas_forbidden(%L)', pg_temp.room()), 'P0001', 'not_watcher', 'solo marca la prohibida quien vigila');
select pg_temp.as_user(1);
select throws_ok(format('select public.palabras_prohibidas_forbidden(%L)', pg_temp.room()), 'P0001', 'not_watcher', 'tampoco quien describe');
select throws_ok(format('select public.palabras_prohibidas_guessed(%L, %L)', pg_temp.room(), pg_temp.u(1)), 'P0001', 'invalid_target', 'quien describe no acierta su palabra');
select throws_ok(format('select public.palabras_prohibidas_guessed(%L, %L)', pg_temp.room(), pg_temp.u(2)), 'P0001', 'invalid_target', 'quien vigila no adivina');
select throws_ok(format('select public.palabras_prohibidas_guessed(%L, %L)', pg_temp.room(), pg_temp.u(9)), 'P0001', 'invalid_target', 'ni alguien de fuera');
select throws_ok(format('select public.palabras_prohibidas_guessed(%L, null)', pg_temp.room()), 'P0001', 'invalid_target', 'ni nadie');
select throws_ok(format('select public.palabras_prohibidas_next(%L)', pg_temp.room()), 'P0001', 'invalid_phase', 'no se pasa de ronda describiendo');
select pg_temp.as_user(9);
select throws_ok(format('select public.palabras_prohibidas_pass(%L)', pg_temp.room()), 'P0001', 'not_member', 'quien no está en la sala no hace nada');
select pg_temp.as_admin();

-- Acierto ----------------------------------------------------------------------------------------

select pg_temp.guessed(1, 3);
select is((pg_temp.game()).phase, 'reveal', 'acertar pasa a la revelación');
select is(pg_temp.result(), jsonb_build_object('type', 'guessed', 'user_id', pg_temp.u(3)), 'con quién acertó');
select is(pg_temp.scores(), array[1, 0, 1, 0], 'un punto para quien acierta y otro para quien describe');

select pg_temp.as_user(1);
select throws_ok(format('select public.palabras_prohibidas_pass(%L)', pg_temp.room()), 'P0001', 'invalid_phase', 'en la revelación ya no se pasa');
select pg_temp.as_user(2);
select throws_ok(format('select public.palabras_prohibidas_next(%L)', pg_temp.room()), 'P0001', 'not_host', 'solo el anfitrión pasa de ronda');
select pg_temp.as_admin();

-- Prohibida ---------------------------------------------------------------------------------------

select pg_temp.act(1, 'palabras_prohibidas_next');
select is((pg_temp.game()).round, 2, 'ronda 2');
select is(pg_temp.describer(), 2, 'el turno de describir rota');
select is(pg_temp.watcher(), 3, 'y vigila el siguiente');
select isnt(pg_temp.card(2), pg_temp.card(1), 'con otra tarjeta');
select pg_temp.act(3, 'palabras_prohibidas_forbidden');
select is(pg_temp.result(), '{"type": "forbidden"}'::jsonb, 'quien vigila canta la prohibida');
select is(pg_temp.scores(), array[1, 0, 1, 0], 'y nadie puntúa');

-- Pasar ---------------------------------------------------------------------------------------------

select pg_temp.act(1, 'palabras_prohibidas_next');
select is(pg_temp.describer(), 3, 'describe el tercero');
select pg_temp.act(3, 'palabras_prohibidas_pass');
select is(pg_temp.result(), '{"type": "passed"}'::jsonb, 'quien describe pasa');
select is(pg_temp.scores(), array[1, 0, 1, 0], 'y nadie puntúa');

-- Vigilar al dar la vuelta y con desconectados -----------------------------------------------------

select pg_temp.act(1, 'palabras_prohibidas_next');
select is(pg_temp.describer(), 4, 'describe el último en entrar');
select is(pg_temp.watcher(), 1, 'y vigila el primero, dando la vuelta');
update public.room_players set last_seen_at = now() - interval '1 hour'
where room_id = pg_temp.room() and user_id = pg_temp.u(1);
select is(pg_temp.watcher(), 2, 'si quien vigila se desconecta, vigila el siguiente conectado');
select throws_ok(
  format('select pg_temp.act(1, %L)', 'palabras_prohibidas_forbidden'),
  'P0001', 'not_watcher', 'y el desconectado deja de vigilar'
);
update public.room_players set last_seen_at = now()
where room_id = pg_temp.room() and user_id = pg_temp.u(1);

-- Si se va quien describe, la ronda se anula --------------------------------------------------------

select pg_temp.call(4, format('select public.leave_room(%L)', pg_temp.room()));
select is((pg_temp.game()).round, 4, 'la ronda anulada no cuenta: sigue siendo la 4');
select is((pg_temp.game()).phase, 'describing', 'y se vuelve a describir');
select is(pg_temp.describer(), 1, 'con otro que describe');
select is(pg_temp.result(), null, 'sin resultado');
select pg_temp.as_user(1);
select throws_ok(format('select public.palabras_prohibidas_guessed(%L, %L)', pg_temp.room(), pg_temp.u(4)), 'P0001', 'invalid_target', 'quien se ha ido no puede acertar');
select pg_temp.as_admin();

-- Si se va quien vigila, vigila el siguiente ----------------------------------------------------------

select is(pg_temp.watcher(), 2, 'vigila el segundo');
select pg_temp.call(3, format('select public.leave_room(%L)', pg_temp.room()));
select is((pg_temp.game()).phase, 'finished', 'con menos de 3 activos la partida termina');

select * from finish();
rollback;
