begin;
create extension if not exists pgtap with schema extensions;

select plan(16);

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

create function pg_temp.state_of(n integer) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.get_room_state(%L)', pg_temp.room()))
$$;

create function pg_temp.answer(n integer) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.quien_lo_dijo_answer(%L, %L)', pg_temp.room(), format('SECRETO-%s', n)))
$$;

create function pg_temp.author() returns integer language sql stable as $$
  select right(gr.subject_id::text, 2)::integer
  from public.game_rounds gr
  join public.rooms r on r.current_game_id = gr.game_id
  join public.games g on g.id = gr.game_id and g.round = gr.round
  where r.id = pg_temp.room()
$$;

-- ¿Contiene la foto el texto de la respuesta de u(n)?
create function pg_temp.has_answer(state jsonb, n integer) returns boolean language sql immutable as $$
  select state::text like format('%%SECRETO-%s%%', n)
$$;

-- ¿Cuántas veces aparece el id de u(n) en la foto, fuera de los datos de la sala y de quien mira?
create function pg_temp.mentions(state jsonb, n integer) returns bigint language sql immutable as $$
  select count(*) from jsonb_path_query(state - 'room' - 'me', 'strict $.** ? (@ == $id)', jsonb_build_object('id', pg_temp.u(n)))
$$;

-- Sala de 4 con u1 de anfitrión, partida de 5 rondas.
insert into ctx select 'room', pg_temp.call(1, $$select public.create_room('Jugador 1')$$) -> 'room' -> 'id';
insert into ctx select 'code', to_jsonb((select code from public.rooms where id = pg_temp.room()));
select pg_temp.call(n, format('select public.join_room(%L, %L)', (select value #>> '{}' from ctx where key = 'code'), format('Jugador %s', n)))
from generate_series(2, 4) as n;
select pg_temp.call(1, format('select public.set_game(%L, %L)', pg_temp.room(), 'quien_lo_dijo'));
select pg_temp.call(1, format('select public.quien_lo_dijo_start(%L, 5)', pg_temp.room()));

-- Escribiendo: cada uno ve solo la suya ------------------------------------------------------------

select pg_temp.answer(2);
select pg_temp.answer(3);
select is(pg_temp.has_answer(pg_temp.state_of(1), 2) or pg_temp.has_answer(pg_temp.state_of(1), 3), false, 'escribiendo: quien no ha respondido no ve respuestas ajenas');
select is(pg_temp.has_answer(pg_temp.state_of(2), 2), true, 'cada uno ve la suya');
select is(pg_temp.has_answer(pg_temp.state_of(2), 3), false, 'pero no las de los demás');

-- Votando: solo la elegida, sin autor -------------------------------------------------------------

select pg_temp.answer(1);
select pg_temp.answer(4);
insert into ctx select 'author', to_jsonb(pg_temp.author());
insert into ctx select 'other', to_jsonb((select n from generate_series(1, 4) n where n <> pg_temp.author() order by n limit 1));
create function pg_temp.a() returns integer language sql stable as $$ select value::int from ctx where key = 'author' $$;
create function pg_temp.o() returns integer language sql stable as $$ select value::int from ctx where key = 'other' $$;

select is(pg_temp.state_of(pg_temp.o()) #>> '{game,phase}', 'voting', 'votando');
select is(pg_temp.has_answer(pg_temp.state_of(pg_temp.o()), pg_temp.a()), true, 'votando: todos ven la respuesta elegida');
select is(
  (select count(*) from generate_series(1, 4) n where n not in (pg_temp.a(), pg_temp.o()) and pg_temp.has_answer(pg_temp.state_of(pg_temp.o()), n)),
  0::bigint,
  'votando: nadie ve respuestas ajenas que no sean la elegida'
);
select is(pg_temp.mentions(pg_temp.state_of(pg_temp.o()), pg_temp.a()), 2::bigint, 'votando: el autor solo aparece en las listas de jugadores y de participantes');
select is(pg_temp.state_of(pg_temp.o()) #> '{game,author_id}', 'null'::jsonb, 'votando: la foto no dice el autor');
select is((pg_temp.state_of(pg_temp.a()) #>> '{game,my,is_author}')::boolean, true, 'votando: el autor recibe is_author');
select is(
  (select count(*) from generate_series(1, 4) n where n <> pg_temp.a() and (pg_temp.state_of(n) #>> '{game,my,is_author}')::boolean),
  0::bigint,
  'votando: los demás no'
);
select is(pg_temp.mentions(pg_temp.state_of(pg_temp.a()), pg_temp.a()), 2::bigint, 'votando: ni siquiera la foto del autor lleva el autor en otro sitio');

-- Un voto (de alguien que no es el autor) tampoco delata a quién falta.
select pg_temp.call(pg_temp.o(), format('select public.quien_lo_dijo_vote(%L, %L)', pg_temp.room(), pg_temp.u(pg_temp.a())));
select is(
  (select count(*) from jsonb_array_elements(pg_temp.state_of(1) #> '{game,participants}') p where (p ->> 'has_responded')::boolean),
  0::bigint,
  'votando: la foto no dice quién ha votado'
);
select is(
  (select count(*) from generate_series(1, 4) n where n <> pg_temp.o() and pg_temp.state_of(n) #> '{game,my,voted_for}' <> 'null'::jsonb),
  0::bigint,
  'votando: nadie ve votos ajenos'
);

-- Clasificación final con empate en cabeza ----------------------------------------------------------

update public.game_players gp set score = case gp.user_id
    when pg_temp.u(1) then 3 when pg_temp.u(2) then 1 when pg_temp.u(3) then 3 else 0 end
where gp.game_id = (select current_game_id from public.rooms where id = pg_temp.room());
update public.games set phase = 'finished', finished_at = now()
where id = (select current_game_id from public.rooms where id = pg_temp.room());
select is(
  (select jsonb_agg(r ->> 'name') from jsonb_array_elements(pg_temp.state_of(2) #> '{game,ranking}') r),
  '["Jugador 1", "Jugador 3", "Jugador 2", "Jugador 4"]'::jsonb,
  'la clasificación va por puntos, y los empatados en cabeza van juntos arriba'
);
select is(
  (select jsonb_agg((r ->> 'score')::int) from jsonb_array_elements(pg_temp.state_of(2) #> '{game,ranking}') r),
  '[3, 3, 1, 0]'::jsonb,
  'con sus puntos'
);
select is(pg_temp.state_of(2) #> '{game,author_id}', 'null'::jsonb, 'al terminar no queda nada de la ronda a medias');

select * from finish();
rollback;
