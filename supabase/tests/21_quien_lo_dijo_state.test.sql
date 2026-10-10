begin;
create extension if not exists pgtap with schema extensions;

select plan(22);

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

create function pg_temp.answer(n integer, text text) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.quien_lo_dijo_answer(%L, %L)', pg_temp.room(), text))
$$;

create function pg_temp.vote(voter integer, target uuid) returns jsonb language sql as $$
  select pg_temp.call(voter, format('select public.quien_lo_dijo_vote(%L, %L)', pg_temp.room(), target))
$$;

create function pg_temp.author() returns uuid language sql stable as $$
  select gr.subject_id from public.game_rounds gr join public.rooms r on r.current_game_id = gr.game_id
  join public.games g on g.id = gr.game_id and g.round = gr.round where r.id = pg_temp.room()
$$;

create function pg_temp.n(id uuid) returns integer language sql immutable as $$
  select right(id::text, 2)::integer
$$;

-- Primer jugador que no es el autor, empezando a contar después de `skip`.
create function pg_temp.voter(skip integer) returns integer language sql stable as $$
  select n from generate_series(1, 4) n where n <> pg_temp.n(pg_temp.author()) and n > skip order by n limit 1
$$;

create function pg_temp.keys(value jsonb) returns text[] language sql immutable as $$
  select array_agg(k order by k) from jsonb_object_keys(value) k
$$;

create function pg_temp.responded(game jsonb) returns boolean[] language sql immutable as $$
  select array_agg((p ->> 'has_responded')::boolean order by p ->> 'user_id') from jsonb_array_elements(game -> 'participants') p
$$;

-- Sala de 4 con u1 de anfitrión, partida de 5 rondas.
insert into ctx select 'room', pg_temp.call(1, $$select public.create_room('Jugador 1')$$) -> 'room' -> 'id';
insert into ctx select 'code', to_jsonb((select code from public.rooms where id = pg_temp.room()));
select pg_temp.call(n, format('select public.join_room(%L, %L)', (select value #>> '{}' from ctx where key = 'code'), format('Jugador %s', n)))
from generate_series(2, 4) as n;
select pg_temp.call(1, format('select public.set_game(%L, %L)', pg_temp.room(), 'quien_lo_dijo'));
select pg_temp.call(1, format('select public.quien_lo_dijo_start(%L, 5)', pg_temp.room()));

-- Escritura -------------------------------------------------------------------------------------

select is(
  pg_temp.keys(pg_temp.game_of(2)),
  array['annulled', 'answers', 'author_id', 'correct_ids', 'featured_text', 'id', 'my', 'participants',
        'phase', 'prompt', 'ranking', 'round', 'total_rounds', 'type', 'vote_progress', 'wrong_ids'],
  'la foto de quien_lo_dijo tiene su forma propia'
);
select is(pg_temp.game_of(2) ->> 'type', 'quien_lo_dijo', 'dice qué juego es');
select is(pg_temp.game_of(2) ->> 'phase', 'writing', 'escribiendo');
select isnt(pg_temp.game_of(2) ->> 'prompt', null, 'con la pregunta');
select is(
  pg_temp.keys(pg_temp.game_of(2) -> 'my'),
  array['alive', 'answer', 'is_author', 'is_participant', 'voted_for'],
  'mis datos: si participo, mi respuesta, si soy el autor y mi voto'
);

select pg_temp.answer(2, 'Dormir');
select is(pg_temp.game_of(2) #>> '{my,answer}', 'Dormir', 'veo mi respuesta');
select is(pg_temp.game_of(3) #>> '{my,answer}', null, 'quien no ha respondido no tiene respuesta');
select is(pg_temp.responded(pg_temp.game_of(3)), array[false, true, false, false], 'se ve quién ha respondido');
select is(pg_temp.game_of(2) -> 'featured_text', 'null'::jsonb, 'escribiendo no hay respuesta elegida');

-- Votación -------------------------------------------------------------------------------------------

select pg_temp.answer(n, format('Respuesta %s', n)) from generate_series(1, 4) as n where n <> 2;
select is(pg_temp.game_of(1) ->> 'phase', 'voting', 'con todas las respuestas, votación');
select is(
  pg_temp.game_of(1) ->> 'featured_text',
  (select text from public.answers where user_id = pg_temp.author()),
  'todos ven la respuesta elegida'
);
select is((pg_temp.game_of(pg_temp.n(pg_temp.author())) #>> '{my,is_author}')::boolean, true, 'el autor sabe que es la suya');
select is((pg_temp.game_of(pg_temp.voter(0)) #>> '{my,is_author}')::boolean, false, 'los demás no son el autor');
select is(pg_temp.game_of(1) -> 'vote_progress', '{"voted": 0, "total": 3}'::jsonb, 'votan todos menos el autor');

select pg_temp.vote(pg_temp.voter(0), pg_temp.author());
select is(pg_temp.game_of(pg_temp.voter(0)) #>> '{my,voted_for}', pg_temp.author()::text, 'veo mi voto');
select is(pg_temp.game_of(1) -> 'vote_progress', '{"voted": 1, "total": 3}'::jsonb, 'el contador sube');
select is(pg_temp.responded(pg_temp.game_of(1)), array[false, false, false, false], 'y no se dice quién ha votado');

-- Revelación -------------------------------------------------------------------------------------------

select pg_temp.vote(n, pg_temp.u(pg_temp.voter(0)))
from generate_series(1, 4) n
where n <> pg_temp.n(pg_temp.author()) and n <> pg_temp.voter(0);
select is(pg_temp.game_of(1) ->> 'phase', 'reveal', 'votan todos y se revela');
select is(pg_temp.game_of(1) ->> 'author_id', pg_temp.author()::text, 'el autor');
select is(
  pg_temp.game_of(1) -> 'correct_ids',
  jsonb_build_array(pg_temp.u(pg_temp.voter(0))),
  'quién acertó'
);
select is(jsonb_array_length(pg_temp.game_of(1) -> 'wrong_ids'), 2, 'y quién falló');
select is(
  pg_temp.game_of(1) -> 'answers',
  (select jsonb_agg(jsonb_build_object('user_id', pg_temp.u(n), 'text', case when n = 2 then 'Dormir' else format('Respuesta %s', n) end) order by n) from generate_series(1, 4) n),
  'y todas las respuestas con su autor, en orden de entrada'
);

select * from finish();
rollback;
