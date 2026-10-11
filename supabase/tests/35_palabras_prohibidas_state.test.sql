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

create function pg_temp.game_of(n integer) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.get_room_state(%L)', pg_temp.room())) -> 'game'
$$;

create function pg_temp.keys(value jsonb) returns text[] language sql immutable as $$
  select array_agg(k order by k) from jsonb_object_keys(value) k
$$;

-- Sala de 4 con u1 de anfitrión: describe u1 y vigila u2. La tarjeta es la de la pizza.
insert into ctx select 'room', pg_temp.call(1, $$select public.create_room('Jugador 1')$$) -> 'room' -> 'id';
insert into ctx select 'code', to_jsonb((select code from public.rooms where id = pg_temp.room()));
select pg_temp.call(n, format('select public.join_room(%L, %L)', (select value #>> '{}' from ctx where key = 'code'), format('Jugador %s', n)))
from generate_series(2, 4) as n;
select pg_temp.call(1, format('select public.set_game(%L, %L)', pg_temp.room(), 'palabras_prohibidas'));
select pg_temp.call(1, format('select public.palabras_prohibidas_start(%L, 5)', pg_temp.room()));
update public.game_rounds set card_id = (select id from public.taboo_cards where word = 'Pizza')
where game_id = (select current_game_id from public.rooms where id = pg_temp.room());

-- Describiendo ------------------------------------------------------------------------------------

select is(
  pg_temp.keys(pg_temp.game_of(3)),
  array['describer_id', 'forbidden', 'id', 'my', 'participants', 'phase', 'ranking', 'result',
        'round', 'total_rounds', 'type', 'watcher_id', 'word'],
  'la foto de palabras_prohibidas tiene su forma propia'
);
select is(pg_temp.game_of(3) ->> 'type', 'palabras_prohibidas', 'dice qué juego es');
select is(pg_temp.game_of(3) ->> 'describer_id', pg_temp.u(1)::text, 'quién describe');
select is(pg_temp.game_of(3) ->> 'watcher_id', pg_temp.u(2)::text, 'quién vigila');
select is(pg_temp.game_of(1) ->> 'word', 'Pizza', 'quien describe ve la palabra');
select is(
  pg_temp.game_of(1) -> 'forbidden',
  '["Italia", "Queso", "Masa", "Horno", "Tomate"]'::jsonb,
  'y las prohibidas'
);
select is(pg_temp.game_of(2) ->> 'word', 'Pizza', 'quien vigila también las ve');
select is(pg_temp.game_of(3) -> 'word', 'null'::jsonb, 'quien adivina no ve la palabra');
select is(pg_temp.game_of(3) -> 'forbidden', 'null'::jsonb, 'ni las prohibidas');
select is(pg_temp.game_of(3) -> 'result', 'null'::jsonb, 'no hay resultado todavía');

-- Quien llega tarde es como quien adivina.
select pg_temp.call(5, format('select public.join_room(%L, %L)', (select value #>> '{}' from ctx where key = 'code'), 'Jugador 5'));
select is(pg_temp.game_of(5) -> 'word', 'null'::jsonb, 'quien llega tarde tampoco ve la palabra');
select is(pg_temp.game_of(5) #>> '{my,is_participant}', 'false', 'y no participa en esta ronda');

-- Si quien vigila cambia, el nuevo pasa a ver la tarjeta.
update public.room_players set last_seen_at = now() - interval '1 hour'
where room_id = pg_temp.room() and user_id = pg_temp.u(2);
select is(pg_temp.game_of(3) ->> 'word', 'Pizza', 'quien pasa a vigilar ve la palabra');
update public.room_players set last_seen_at = now()
where room_id = pg_temp.room() and user_id = pg_temp.u(2);

-- Revelación ------------------------------------------------------------------------------------

select pg_temp.call(1, format('select public.palabras_prohibidas_guessed(%L, %L)', pg_temp.room(), pg_temp.u(4)));
select is(pg_temp.game_of(3) ->> 'word', 'Pizza', 'en la revelación todos ven la palabra');
select is(jsonb_array_length(pg_temp.game_of(3) -> 'forbidden'), 5, 'y las prohibidas');
select is(
  pg_temp.game_of(3) -> 'result',
  jsonb_build_object('type', 'guessed', 'user_id', pg_temp.u(4)),
  'y cómo acabó la ronda'
);

-- Final ---------------------------------------------------------------------------------------------

update public.games set phase = 'finished', finished_at = now()
where id = (select current_game_id from public.rooms where id = pg_temp.room());
select is(
  pg_temp.game_of(3) -> 'ranking' -> 0 -> 'score',
  '1'::jsonb,
  'al terminar, la clasificación por puntos'
);

select * from finish();
rollback;
