begin;
create extension if not exists pgtap with schema extensions;

select plan(31);

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
  select g.* from public.games g where g.room_id = pg_temp.room() order by g.created_at desc limit 1
$$;

create function pg_temp.call(n integer, sql text) returns jsonb language plpgsql as $$
declare
  result jsonb;
begin
  perform pg_temp.as_uid(pg_temp.u(n));
  execute sql into result;
  perform pg_temp.as_admin();
  return result;
end;
$$;

create function pg_temp.state_of(n integer) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.get_room_state(%L)', pg_temp.room()))
$$;

create function pg_temp.host(action text) returns jsonb language sql as $$
  select pg_temp.call(1, format('select public.%s(%L)', action, pg_temp.room()))
$$;

create function pg_temp.vote(voter integer, target integer) returns jsonb language sql as $$
  select pg_temp.call(voter, format('select public.cast_vote(%L, %L)', pg_temp.room(), pg_temp.u(target)))
$$;

-- Sala de `players` (u1 anfitrión) con partida; los impostores son los últimos `impostors`.
create function pg_temp.setup(players integer, impostors integer) returns void language plpgsql as $$
declare
  state jsonb;
begin
  perform pg_temp.as_uid(pg_temp.u(1));
  state := public.create_room('Jugador 1');
  for n in 2..players loop
    perform pg_temp.as_uid(pg_temp.u(n));
    perform public.join_room(state -> 'room' ->> 'code', format('Jugador %s', n));
  end loop;
  perform pg_temp.as_uid(pg_temp.u(1));
  perform public.start_game((state -> 'room' ->> 'id')::uuid, impostors);
  perform pg_temp.as_admin();
  delete from ctx;
  insert into ctx values ('room', to_jsonb(state -> 'room' ->> 'id'));
  update public.game_roles gr
  set role = case when gr.user_id in (select pg_temp.u(n) from generate_series(players - impostors + 1, players) n)
                  then 'impostor' else 'player' end
  where gr.game_id = (pg_temp.game()).id;
  insert into ctx values ('word', to_jsonb((select w.word from public.words w where w.id = (pg_temp.game()).word_id)));
end;
$$;

-- ¿Aparece en la foto algún valor igual a `needle`?
create function pg_temp.contains(state jsonb, needle text) returns boolean language sql immutable as $$
  select jsonb_path_exists(state, 'strict $.** ? (@ == $needle)', jsonb_build_object('needle', needle))
$$;

-- ¿Aparece alguna clave llamada `key` en cualquier nivel?
create function pg_temp.has_key(state jsonb, key text) returns boolean language sql immutable as $$
  select exists (
    select 1 from jsonb_path_query(state, 'strict $.**') node
    where jsonb_typeof(node) = 'object' and node ? key
  )
$$;

create function pg_temp.word() returns text language sql stable as $$
  select value #>> '{}' from ctx where key = 'word'
$$;

-- Secreto antes de 'finished' -------------------------------------------------------------------
-- 5 jugadores; u4 y u5 son los impostores. u2 es un jugador normal.

select pg_temp.setup(5, 2);

select is(pg_temp.contains((pg_temp.state_of(2) -> 'game') - 'type'::text, 'impostor'), false, 'hablando: la foto de un jugador normal no tiene ningún rol de impostor');
select is(
  (select count(*) from jsonb_path_query(pg_temp.state_of(2), 'strict $.**.role')),
  1::bigint,
  'hablando: solo hay un rol en la foto, el propio'
);
select is(pg_temp.contains(pg_temp.state_of(4), pg_temp.word()), false, 'hablando: la foto del impostor no contiene la palabra');
select is(pg_temp.contains((pg_temp.state_of(4) -> 'game') - 'type'::text, 'impostor'), true, 'el impostor sí sabe que lo es');
select is(
  (select count(*) from jsonb_path_query((pg_temp.state_of(4) -> 'game') - 'type'::text, 'strict $.** ? (@ == "impostor")')),
  1::bigint,
  'hablando: el impostor no sabe quién es el otro impostor'
);

select pg_temp.host('open_voting');
select pg_temp.vote(2, 4);
select pg_temp.vote(3, 4);
select is(pg_temp.state_of(5) -> 'game' -> 'my' -> 'voted_for', 'null'::jsonb, 'votando: no se ve el voto de otros');
select is(pg_temp.contains(pg_temp.state_of(5), pg_temp.u(4)::text), true, 'votando: el votado aparece solo como participante');
select is(
  (select count(*) from jsonb_path_query(pg_temp.state_of(5), 'strict $.** ? (@ == $id)', jsonb_build_object('id', pg_temp.u(4)))),
  2::bigint,
  'votando: el votado solo aparece en las listas de jugadores y de participantes'
);
select is(pg_temp.has_key(pg_temp.state_of(3), 'target_id'), false, 'votando: la foto no tiene destinos de votos');
select is(pg_temp.has_key(pg_temp.state_of(3), 'votes'), false, 'votando: ni recuentos');
select is(pg_temp.contains((pg_temp.state_of(2) -> 'game') - 'type'::text, 'impostor'), false, 'votando: sigue sin roles ajenos');
select is(pg_temp.contains(pg_temp.state_of(5), pg_temp.word()), false, 'votando: el impostor sigue sin la palabra');

-- Empate: la revelación no dice quién es impostor ni cuántos votos hubo.
select pg_temp.vote(4, 2);
select pg_temp.vote(5, 2);
select pg_temp.host('close_voting');
select is(pg_temp.state_of(2) -> 'game' -> 'outcome' ->> 'type', 'tie', 'revelación con empate');
select is(pg_temp.contains((pg_temp.state_of(2) -> 'game') - 'type'::text, 'impostor'), false, 'revelación: sin roles ajenos');
select is(pg_temp.has_key(pg_temp.state_of(2), 'votes'), false, 'revelación: sin recuentos');
select is(pg_temp.contains(pg_temp.state_of(4), pg_temp.word()), false, 'revelación: el impostor sigue sin la palabra');
select is(pg_temp.state_of(2) -> 'game' -> 'result', 'null'::jsonb, 'revelación: aún sin resultado');

-- Partida completa con dos impostores -------------------------------------------------------------

select pg_temp.host('continue_game');
select pg_temp.host('open_voting');
select pg_temp.vote(1, 4);
select pg_temp.vote(2, 4);
select pg_temp.vote(3, 4);
select pg_temp.host('close_voting');
select is(
  pg_temp.state_of(1) -> 'game' -> 'outcome',
  jsonb_build_object('type', 'eliminated', 'user_id', pg_temp.u(4), 'name', 'Jugador 4', 'was_impostor', true),
  'cae el primer impostor'
);
select is((pg_temp.state_of(1) -> 'game' ->> 'game_over')::boolean, false, 'con otro impostor vivo la partida sigue');
select is((pg_temp.state_of(1) -> 'game' ->> 'impostors_left')::int, 1, 'queda un impostor');

select pg_temp.host('continue_game');
select pg_temp.host('open_voting');
select pg_temp.vote(1, 5);
select pg_temp.vote(2, 5);
select pg_temp.host('close_voting');
select is((pg_temp.state_of(1) -> 'game' ->> 'game_over')::boolean, true, 'cae el segundo impostor y se acaba');
select pg_temp.host('continue_game');
select is(
  pg_temp.state_of(2) -> 'game' -> 'result',
  jsonb_build_object('winner', 'group', 'word', pg_temp.word(), 'impostor_ids', jsonb_build_array(pg_temp.u(4), pg_temp.u(5))),
  'al terminar gana el grupo y se revelan los dos impostores y la palabra'
);
select is(pg_temp.contains(pg_temp.state_of(4), pg_temp.word()), true, 'al terminar el impostor ya ve la palabra');
select is((pg_temp.game()).round, 3, 'la partida ha durado tres rondas');

-- Volver a jugar desde el final mantiene la sala y los jugadores.
select is(
  jsonb_array_length(pg_temp.call(1, format('select public.start_game(%L, 2)', pg_temp.room())) -> 'game' -> 'participants'),
  5,
  'volver a jugar empieza otra partida con los mismos jugadores'
);
select is((select count(*) from public.games where room_id = pg_temp.room()), 2::bigint, 'en la misma sala');

-- Abandonos que faltaban ---------------------------------------------------------------------------

-- Se va un impostor mientras se habla.
select pg_temp.setup(5, 1);
select pg_temp.call(5, format('select public.leave_room(%L)', pg_temp.room()));
select is(
  (pg_temp.game()).outcome,
  jsonb_build_object('type', 'left', 'user_id', pg_temp.u(5), 'name', 'Jugador 5', 'was_impostor', true),
  'hablando: el impostor que se va se revela como impostor'
);
select is((pg_temp.state_of(1) -> 'game' ->> 'game_over')::boolean, true, 'y si era el último, la partida se acaba al continuar');

-- Se va un jugador normal en plena votación; los votos se borran.
select pg_temp.setup(5, 1);
select pg_temp.host('open_voting');
select pg_temp.vote(1, 5);
select pg_temp.vote(5, 1);
select pg_temp.call(3, format('select public.leave_room(%L)', pg_temp.room()));
select is(
  (pg_temp.game()).outcome,
  jsonb_build_object('type', 'left', 'user_id', pg_temp.u(3), 'name', 'Jugador 3', 'was_impostor', false),
  'votando: el jugador normal que se va se revela como no impostor'
);
select is(
  (select count(*) from public.votes where game_id = (pg_temp.game()).id),
  0::bigint,
  'votando: los votos de la ronda se borran'
);
select is(pg_temp.state_of(1) -> 'game' -> 'my' -> 'voted_for', 'null'::jsonb, 'y nadie conserva su voto');

select * from finish();
rollback;
