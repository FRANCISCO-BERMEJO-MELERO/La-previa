begin;
create extension if not exists pgtap with schema extensions;

select plan(18);

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

create function pg_temp.game() returns public.games language sql stable as $$
  select g.* from public.games g join public.rooms r on r.current_game_id = g.id where r.id = pg_temp.room()
$$;

create function pg_temp.state_of(n integer) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.get_room_state(%L)', pg_temp.room()))
$$;

create function pg_temp.act(n integer, action text) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.%s(%L)', action, pg_temp.room()))
$$;

create function pg_temp.leave(n integer) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.leave_room(%L)', pg_temp.room()))
$$;

create function pg_temp.describer() returns integer language sql stable as $$
  select pg_temp.n(subject_id) from public.game_rounds where game_id = (pg_temp.game()).id and round = (pg_temp.game()).round
$$;

create function pg_temp.watcher() returns integer language sql stable as $$
  select pg_temp.n(private.palabras_prohibidas_watcher(pg_temp.game()))
$$;

-- La tarjeta de la ronda en curso.
create function pg_temp.card() returns public.taboo_cards language sql stable as $$
  select t.* from public.game_rounds gr join public.taboo_cards t on t.id = gr.card_id
  where gr.game_id = (pg_temp.game()).id and gr.round = (pg_temp.game()).round
$$;

-- ¿Cuántas veces aparece la palabra o alguna de sus prohibidas como valor en la foto?
create function pg_temp.mentions(state jsonb, card public.taboo_cards) returns bigint language sql immutable as $$
  select count(*) from unnest(array_append(card.forbidden, card.word)) secret,
    lateral jsonb_path_query(state, 'strict $.** ? (@ == $v)', jsonb_build_object('v', secret))
$$;

-- Sala de 5 con u1 de anfitrión y solo tres tarjetas activas ----------------------------------------

insert into ctx select 'room', pg_temp.call(1, $$select public.create_room('Jugador 1')$$) -> 'room' -> 'id';
insert into ctx select 'code', to_jsonb((select code from public.rooms where id = pg_temp.room()));
select pg_temp.call(n, format('select public.join_room(%L, %L)', (select value #>> '{}' from ctx where key = 'code'), format('Jugador %s', n)))
from generate_series(2, 5) as n;
update public.taboo_cards set active = word in ('Pizza', 'Paella', 'Tortilla');
select pg_temp.call(1, format('select public.set_game(%L, %L)', pg_temp.room(), 'palabras_prohibidas'));
select pg_temp.call(1, format('select public.palabras_prohibidas_start(%L, 5)', pg_temp.room()));

-- Secreto mientras se describe ----------------------------------------------------------------------

select is(pg_temp.mentions(pg_temp.state_of(3), pg_temp.card()), 0::bigint, 'quien adivina no recibe ni la palabra ni las prohibidas');
select is(pg_temp.mentions(pg_temp.state_of(5), pg_temp.card()), 0::bigint, 'nadie que adivina');
select is(pg_temp.mentions(pg_temp.state_of(1), pg_temp.card()), 6::bigint, 'quien describe recibe la palabra y las cinco prohibidas');
select is(pg_temp.mentions(pg_temp.state_of(2), pg_temp.card()), 6::bigint, 'y quien vigila también');
select is(
  (select result from public.game_rounds where game_id = (pg_temp.game()).id and round = 1),
  null,
  'sin resultado hasta que acaba la ronda'
);

-- Quien se va sin describir ni vigilar no cambia la ronda ----------------------------------------------

select pg_temp.leave(3);
select is((pg_temp.game()).phase, 'describing', 'si se va quien adivina, se sigue describiendo');
select is(array[pg_temp.describer(), pg_temp.watcher()], array[1, 2], 'con los mismos papeles');
select pg_temp.act(1, 'palabras_prohibidas_pass');
select is(pg_temp.mentions(pg_temp.state_of(5), pg_temp.card()), 6::bigint, 'en la revelación quien adivinaba ya lo ve todo');

-- El turno salta a quien se ha ido -------------------------------------------------------------------

select pg_temp.act(1, 'palabras_prohibidas_next');
select is(pg_temp.describer(), 2, 'describe el siguiente');
select is(pg_temp.watcher(), 4, 'y vigila el siguiente activo, saltando a quien se fue');

-- Si se va quien vigila, la ronda sigue con otro --------------------------------------------------------

select pg_temp.leave(4);
select is((pg_temp.game()).phase, 'describing', 'si se va quien vigila, la ronda sigue');
select is(pg_temp.watcher(), 5, 'y vigila el siguiente');
select is(pg_temp.mentions(pg_temp.state_of(5), pg_temp.card()), 6::bigint, 'que pasa a ver la tarjeta');
select pg_temp.act(5, 'palabras_prohibidas_forbidden');
select is((pg_temp.game()).phase, 'reveal', 'y puede cantar la prohibida');

-- No se repite tarjeta en la sala -----------------------------------------------------------------------

select pg_temp.act(1, 'palabras_prohibidas_next');
select is(pg_temp.describer(), 5, 'describe quien aún no lo había hecho');
select is(pg_temp.watcher(), 1, 'y vigila el primero, dando la vuelta');
select is(
  (select count(distinct card_id) from public.game_rounds where game_id = (pg_temp.game()).id),
  3::bigint,
  'tres rondas, tres tarjetas distintas'
);

-- Final anticipado ------------------------------------------------------------------------------------

select pg_temp.leave(2);
select is((pg_temp.game()).phase, 'finished', 'con menos de 3 activos la partida termina');

select * from finish();
rollback;
