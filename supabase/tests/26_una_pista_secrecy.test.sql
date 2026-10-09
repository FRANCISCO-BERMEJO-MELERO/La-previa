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

create function pg_temp.game_id() returns uuid language sql stable as $$
  select current_game_id from public.rooms where id = pg_temp.room()
$$;

create function pg_temp.state_of(n integer) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.get_room_state(%L)', pg_temp.room()))
$$;

create function pg_temp.act(n integer, action text) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.%s(%L)', action, pg_temp.room()))
$$;

create function pg_temp.clue(n integer, text text) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.una_pista_clue(%L, %L)', pg_temp.room(), text))
$$;

create function pg_temp.mark(n integer, result text) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.una_pista_mark(%L, %L)', pg_temp.room(), result))
$$;

-- ¿Aparece el texto en alguna parte de la foto? Sin distinguir mayúsculas.
create function pg_temp.has(state jsonb, needle text) returns boolean language sql immutable as $$
  select position(lower(needle) in lower(state::text)) > 0
$$;

-- ¿Aparece alguna clave llamada `key` dentro de las pistas?
create function pg_temp.clue_has_key(state jsonb, key text) returns boolean language sql immutable as $$
  select exists (select 1 from jsonb_array_elements(coalesce(state #> '{game,clues}', '[]')) c where c ? key)
$$;

-- Sala de 4 (u1 anfitrión y primer adivino, u2 árbitro), partida de 5 rondas, palabra conocida.
insert into ctx select 'room', pg_temp.call(1, $$select public.create_room('Jugador 1')$$) -> 'room' -> 'id';
select pg_temp.call(n, format('select public.join_room(%L, %L)', (select code from public.rooms where id = pg_temp.room()), format('Jugador %s', n)))
from generate_series(2, 4) as n;
select pg_temp.call(1, format('select public.set_game(%L, %L)', pg_temp.room(), 'una_pista'));
select pg_temp.call(1, format('select public.una_pista_start(%L, 5)', pg_temp.room()));
update public.game_rounds set word_id = (select id from public.words where word = 'Pingüino') where game_id = pg_temp.game_id();

-- Escritura: el adivino no ve la palabra; nadie ve las pistas de otros --------------------------------

select pg_temp.clue(2, 'Sol');
select is(pg_temp.has(pg_temp.state_of(1), 'Pingüino'), false, 'escribiendo: la foto del adivino no contiene la palabra');
select is(pg_temp.has(pg_temp.state_of(1), 'Animales'), false, 'ni la categoría');
select is(pg_temp.has(pg_temp.state_of(3), 'Sol'), false, 'quien da pista no ve las de los demás');
select is(pg_temp.has(pg_temp.state_of(1), 'Sol'), false, 'ni el adivino');

-- Anulación de tres pistas iguales -------------------------------------------------------------------

select pg_temp.clue(3, 'sol');
select pg_temp.clue(4, 'SÓL');
select is(
  (select count(*) from public.answers where game_id = pg_temp.game_id() and cancelled),
  3::bigint,
  '"Sol", "sol" y "SÓL" se anulan entre sí'
);

-- Revisión y adivinanza con todas las pistas anuladas ---------------------------------------------------

select is(pg_temp.has(pg_temp.state_of(1), 'Sol'), false, 'revisando: el adivino no ve ninguna pista');
select is(pg_temp.has(pg_temp.state_of(1), 'Pingüino'), false, 'ni la palabra');
select pg_temp.act(2, 'una_pista_show_clues');
select is(pg_temp.state_of(1) #> '{game,clues}', '[]'::jsonb, 'adivinando con todas anuladas: el adivino juega sin pistas');
select is(pg_temp.has(pg_temp.state_of(1), 'Sol'), false, 'y no ve las anuladas');
select is(pg_temp.has(pg_temp.state_of(1), 'Pingüino'), false, 'ni la palabra');
select pg_temp.mark(2, 'wrong');
select is((pg_temp.state_of(1) #>> '{game,team_score}')::int, 0, 'fallada no suma');
select is(pg_temp.has(pg_temp.state_of(1), 'Pingüino'), true, 'en la revelación el adivino ve la palabra');

-- Ronda 2: el adivino ve solo las vivas, sin autor ------------------------------------------------------

select pg_temp.act(2, 'una_pista_next');
update public.game_rounds set word_id = (select id from public.words where word = 'Paella') where game_id = pg_temp.game_id() and round = 2;
select pg_temp.clue(1, 'arroz');
select pg_temp.clue(3, 'Valencia');
select pg_temp.clue(4, 'domingo');
select pg_temp.call(3, format('select public.una_pista_toggle_clue(%L, %L)', pg_temp.room(), pg_temp.u(4)));
select pg_temp.act(1, 'una_pista_show_clues');
select is(pg_temp.has(pg_temp.state_of(2), 'domingo'), false, 'adivinando: el adivino no ve las pistas anuladas');
select is(pg_temp.clue_has_key(pg_temp.state_of(2), 'user_id'), false, 'ni de quién es cada pista');
select is(pg_temp.has(pg_temp.state_of(2), 'Paella'), false, 'ni la palabra');
select pg_temp.mark(1, 'pass');
select is((pg_temp.state_of(2) #>> '{game,team_score}')::int, 0, 'pasar no suma');

-- Árbitro cuando el anfitrión adivina y el siguiente está desconectado ----------------------------------

select pg_temp.act(1, 'una_pista_next');
update public.game_rounds set subject_id = pg_temp.u(1) where game_id = pg_temp.game_id() and round = 3;
update public.room_players set last_seen_at = now() - interval '5 minutes' where user_id = pg_temp.u(2);
select is(
  private.una_pista_arbiter((select g from public.games g where g.id = pg_temp.game_id())),
  pg_temp.u(3),
  'si el anfitrión adivina, arbitra el siguiente conectado por orden de entrada'
);
update public.room_players set last_seen_at = now() where user_id = pg_temp.u(2);
select is(
  private.una_pista_arbiter((select g from public.games g where g.id = pg_temp.game_id())),
  pg_temp.u(2),
  'y si vuelve a estar conectado, el primero por orden de entrada'
);

select * from finish();
rollback;
