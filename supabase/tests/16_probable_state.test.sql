begin;
create extension if not exists pgtap with schema extensions;

select plan(20);

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

create function pg_temp.host(action text) returns jsonb language sql as $$
  select pg_temp.call(1, format('select public.%s(%L)', action, pg_temp.room()))
$$;

create function pg_temp.vote(voter integer, target integer) returns jsonb language sql as $$
  select pg_temp.call(voter, format('select public.probable_vote(%L, %L)', pg_temp.room(), pg_temp.u(target)))
$$;

create function pg_temp.keys(value jsonb) returns text[] language sql immutable as $$
  select array_agg(k order by k) from jsonb_object_keys(value) k
$$;

create function pg_temp.participant(game jsonb, n integer) returns jsonb language sql immutable as $$
  select p from jsonb_array_elements(game -> 'participants') p where p ->> 'user_id' = pg_temp.u(n)::text
$$;

-- Sala de 3 con u1 de anfitrión, partida de 5 rondas.
insert into ctx select 'room', pg_temp.call(1, $$select public.create_room('Jugador 1')$$) -> 'room' -> 'id';
insert into ctx select 'code', to_jsonb((select code from public.rooms where id = pg_temp.room()));
select pg_temp.call(n, format('select public.join_room(%L, %L)', (select value #>> '{}' from ctx where key = 'code'), format('Jugador %s', n)))
from generate_series(2, 3) as n;
select pg_temp.call(1, format('select public.set_game(%L, %L)', pg_temp.room(), 'probable'));
select pg_temp.call(1, format('select public.probable_start(%L, 5)', pg_temp.room()));

-- Votación ----------------------------------------------------------------------------------------

select is(
  pg_temp.keys(pg_temp.game_of(2)),
  array['id', 'my', 'participants', 'phase', 'prompt', 'ranking', 'round', 'round_winner_ids', 'tally', 'total_rounds', 'type'],
  'la foto de probable tiene su forma propia'
);
select is(pg_temp.game_of(2) ->> 'type', 'probable', 'dice que es probable');
select is(pg_temp.game_of(2) ->> 'phase', 'voting', 'votando');
select is((pg_temp.game_of(2) ->> 'round')::int, 1, 'en la ronda 1');
select is((pg_temp.game_of(2) ->> 'total_rounds')::int, 5, 'de 5');
select is(
  pg_temp.game_of(2) ->> 'prompt',
  (select p.text from public.game_rounds gr join public.prompts p on p.id = gr.prompt_id join public.rooms r on r.current_game_id = gr.game_id where r.id = pg_temp.room() and gr.round = 1),
  'con la pregunta de la ronda'
);
select is(
  pg_temp.keys(pg_temp.game_of(2) -> 'participants' -> 0),
  array['alive', 'has_responded', 'name', 'score', 'user_id'],
  'cada participante lleva nombre, si sigue, sus puntos y si ya ha respondido'
);
select is(
  (select array_agg(p ->> 'name') from jsonb_array_elements(pg_temp.game_of(2) -> 'participants') p),
  array['Jugador 1', 'Jugador 2', 'Jugador 3'],
  'en el orden de entrada a la sala'
);
select is(
  pg_temp.game_of(2) -> 'my',
  '{"is_participant": true, "alive": true, "voted_for": null}'::jsonb,
  'mis datos antes de votar'
);

select pg_temp.vote(2, 3);
select is(pg_temp.game_of(2) #>> '{my,voted_for}', pg_temp.u(3)::text, 'veo mi voto');
select is((pg_temp.participant(pg_temp.game_of(3), 2) ->> 'has_responded')::boolean, true, 'los demás ven que he votado');
select is((pg_temp.participant(pg_temp.game_of(3), 3) ->> 'has_responded')::boolean, false, 'y quién falta');
select is(
  array[pg_temp.game_of(2) -> 'tally', pg_temp.game_of(2) -> 'round_winner_ids', pg_temp.game_of(2) -> 'ranking'],
  array['null'::jsonb, 'null'::jsonb, 'null'::jsonb],
  'sin recuento ni clasificación mientras se vota'
);

-- Llega tarde -------------------------------------------------------------------------------------

select pg_temp.call(4, format('select public.join_room(%L, %L)', (select value #>> '{}' from ctx where key = 'code'), 'Jugador 4'));
select is(
  pg_temp.game_of(4) -> 'my',
  '{"is_participant": false, "alive": false, "voted_for": null}'::jsonb,
  'quien llega tarde no participa'
);
select isnt(pg_temp.game_of(4) ->> 'prompt', null, 'pero ve la pregunta');

-- Revelación --------------------------------------------------------------------------------------

select pg_temp.vote(1, 3);
select pg_temp.vote(3, 1);
select is(pg_temp.game_of(2) ->> 'phase', 'reveal', 'al votar todos, revelación');
select is(
  pg_temp.game_of(2) -> 'tally',
  jsonb_build_array(
    jsonb_build_object('user_id', pg_temp.u(3), 'votes', 2, 'voter_ids', (select jsonb_agg(x order by x) from unnest(array[pg_temp.u(1), pg_temp.u(2)]) x)),
    jsonb_build_object('user_id', pg_temp.u(1), 'votes', 1, 'voter_ids', jsonb_build_array(pg_temp.u(3)))
  ),
  'el recuento dice cuántos votos y de quién, de más a menos'
);
select is(pg_temp.game_of(4) -> 'round_winner_ids', jsonb_build_array(pg_temp.u(3)), 'y quién se lleva el punto');

-- Final ------------------------------------------------------------------------------------------

select pg_temp.host('probable_next');
select pg_temp.vote(1, 2);
select pg_temp.vote(2, 2);
select pg_temp.vote(3, 2);
select pg_temp.vote(4, 3);
select pg_temp.host('probable_next'), pg_temp.host('probable_close') from generate_series(3, 5);
select pg_temp.host('probable_next');
select is(
  pg_temp.game_of(2) -> 'ranking',
  jsonb_build_array(
    jsonb_build_object('user_id', pg_temp.u(2), 'name', 'Jugador 2', 'score', 1),
    jsonb_build_object('user_id', pg_temp.u(3), 'name', 'Jugador 3', 'score', 1),
    jsonb_build_object('user_id', pg_temp.u(1), 'name', 'Jugador 1', 'score', 0),
    jsonb_build_object('user_id', pg_temp.u(4), 'name', 'Jugador 4', 'score', 0)
  ),
  'al terminar, la clasificación por puntos'
);
select is(pg_temp.game_of(2) -> 'tally', 'null'::jsonb, 'y ya no el recuento de la ronda');

select * from finish();
rollback;
