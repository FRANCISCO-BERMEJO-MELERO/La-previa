begin;
create extension if not exists pgtap with schema extensions;

select plan(17);

-- Utilidades ------------------------------------------------------------------------------

insert into auth.users (id)
select format('00000000-0000-0000-0000-0000000000%s', lpad(i::text, 2, '0'))::uuid
from generate_series(1, 9) as i;

create function pg_temp.u(n integer) returns uuid language sql immutable as $$
  select format('00000000-0000-0000-0000-0000000000%s', lpad(n::text, 2, '0'))::uuid
$$;

create function pg_temp.call(n integer, sql text) returns jsonb language plpgsql as $$
declare
  result jsonb;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', pg_temp.u(n), 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  execute sql into result;
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  return result;
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

create function pg_temp.state_of(n integer) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.get_room_state(%L)', pg_temp.room()))
$$;

create function pg_temp.act(n integer, action text) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.%s(%L)', action, pg_temp.room()))
$$;

create function pg_temp.choose(n integer, option text) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.que_prefieres_choose(%L, %L)', pg_temp.room(), option))
$$;

-- ¿Cuántas veces aparece el texto `value` como valor en la foto?
create function pg_temp.mentions(state jsonb, value text) returns bigint language sql immutable as $$
  select count(*) from jsonb_path_query(state, 'strict $.** ? (@ == $v)', jsonb_build_object('v', value))
$$;

create function pg_temp.round_prompt(round integer) returns bigint language sql stable as $$
  select prompt_id from public.game_rounds where game_id = (pg_temp.game()).id and round = round_prompt.round
$$;

-- Sala de 5 con u1 de anfitrión y solo dos dilemas activos ---------------------------------------

insert into ctx select 'room', pg_temp.call(1, $$select public.create_room('Jugador 1')$$) -> 'room' -> 'id';
insert into ctx select 'code', to_jsonb((select code from public.rooms where id = pg_temp.room()));
select pg_temp.call(n, format('select public.join_room(%L, %L)', pg_temp.code(), format('Jugador %s', n)))
from generate_series(2, 5) as n;
update public.prompts set active = text in ('Volar', 'Leer mentes') where game_type = 'que_prefieres';
select pg_temp.call(1, format('select public.set_game(%L, %L)', pg_temp.room(), 'que_prefieres'));
select pg_temp.call(1, format('select public.que_prefieres_start(%L, 5)', pg_temp.room()));

-- Secreto mientras se elige -----------------------------------------------------------------------

select pg_temp.choose(2, 'a');
select pg_temp.choose(3, 'b');
select is(pg_temp.mentions(pg_temp.state_of(1), 'a'), 0::bigint, 'quien no ha elegido no ve ninguna elección');
select is(pg_temp.mentions(pg_temp.state_of(1), 'b'), 0::bigint, 'de ninguna de las dos opciones');
select is(pg_temp.mentions(pg_temp.state_of(2), 'a'), 1::bigint, 'quien ha elegido ve solo la suya');
select is(pg_temp.mentions(pg_temp.state_of(2), 'b'), 0::bigint, 'y no la de los demás');
select is(pg_temp.state_of(1) #> '{game,choices}', 'null'::jsonb, 'no hay reparto');
select is(
  (select result from public.game_rounds where game_id = (pg_temp.game()).id and round = 1),
  null,
  'ni recuento guardado hasta cerrar'
);

-- Irse a media ronda ------------------------------------------------------------------------------

select pg_temp.choose(4, 'a');
select pg_temp.call(4, format('select public.leave_room(%L)', pg_temp.room()));
select is(
  (select count(*) from public.answers where game_id = (pg_temp.game()).id and user_id = pg_temp.u(4)),
  0::bigint,
  'la elección de quien se va se borra'
);
select pg_temp.call(9, format('select public.join_room(%L, %L)', pg_temp.code(), 'Jugador 9'));
select pg_temp.call(5, format('select public.leave_room(%L)', pg_temp.room()));
select is((pg_temp.game()).phase, 'voting', 'falta el anfitrión: sigue eligiendo');
select pg_temp.choose(1, 'b');
select is((pg_temp.game()).phase, 'reveal', 'cierra cuando eligen todos los que quedan');
select is(
  (select result -> 'choices' from public.game_rounds where game_id = (pg_temp.game()).id and round = 1),
  jsonb_build_object('a', jsonb_build_array(pg_temp.u(2)), 'b', jsonb_build_array(pg_temp.u(1), pg_temp.u(3))),
  'el reparto no cuenta a quien se fue'
);
select is(
  (select score from public.game_players where game_id = (pg_temp.game()).id and user_id = pg_temp.u(9)),
  null,
  'quien llegó tarde no juega esta ronda'
);

-- Ronda siguiente ---------------------------------------------------------------------------------

select pg_temp.act(1, 'que_prefieres_next');
select isnt(pg_temp.round_prompt(2), pg_temp.round_prompt(1), 'no se repite dilema en la sala');
select is(
  (select alive from public.game_players where game_id = (pg_temp.game()).id and user_id = pg_temp.u(9)),
  true,
  'quien llegó tarde juega desde la ronda siguiente'
);
select lives_ok(
  format('select pg_temp.choose(9, %L)', 'a'),
  'y ya puede elegir'
);
select is((pg_temp.game()).phase, 'voting', 'falta gente por elegir');

-- Final anticipado ------------------------------------------------------------------------------------

select pg_temp.call(9, format('select public.leave_room(%L)', pg_temp.room()));
select is((pg_temp.game()).phase, 'voting', 'con 3 activos la partida sigue');
select pg_temp.call(3, format('select public.leave_room(%L)', pg_temp.room()));
select is((pg_temp.game()).phase, 'finished', 'con menos de 3 activos la partida termina');

select * from finish();
rollback;
