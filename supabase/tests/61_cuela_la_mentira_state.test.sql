begin;
create extension if not exists pgtap with schema extensions;

select plan(36);

-- Utilidades ------------------------------------------------------------------------------

insert into auth.users (id)
select format('00000000-0000-0000-0000-0000000000%s', lpad(i::text, 2, '0'))::uuid
from generate_series(1, 5) as i;

create function pg_temp.u(n integer) returns uuid language sql immutable as $$
  select format('00000000-0000-0000-0000-0000000000%s', lpad(n::text, 2, '0'))::uuid
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

create function pg_temp.state(n integer) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.get_room_state(%L)', pg_temp.room())) -> 'game'
$$;

create function pg_temp.option_of(target_text text) returns uuid language sql stable as $$
  select option_id from public.cuela_options
  where game_id = (pg_temp.game()).id and round = (pg_temp.game()).round and text = target_text
$$;

-- Lo que no puede salir de la base de datos antes de la revelación.
create function pg_temp.leaks(state jsonb) returns boolean language sql immutable as $$
  select coalesce(state ->> 'explanation', state ->> 'round_points') is not null
    or state::text ~ '"(kind|author_ids|left_author_ids|voter_ids)"'
$$;

update public.cuela_questions set active = false;
insert into public.cuela_questions (text, truth, accepted, explanation, source, distractors)
values ('¿Para qué servía el objeto de prueba?', 'Para sujetar una vela', '{}', 'Explicación secreta.', 'Prueba',
  '{"Para afinar guitarras", "Para medir la lluvia"}');

-- Sala de 4 con u1 de anfitrión.
insert into ctx select 'room', pg_temp.call(1, $$select public.create_room('Jugador 1')$$) -> 'room' -> 'id';
select pg_temp.call(n, format('select public.join_room(%L, %L)', (select code from public.rooms where id = pg_temp.room()), format('Jugador %s', n)))
from generate_series(2, 4) as n;
select pg_temp.call(1, format('select public.set_game(%L, %L)', pg_temp.room(), 'cuela_la_mentira'));
select pg_temp.call(1, format('select public.cuela_start(%L, 5)', pg_temp.room()));

-- Escritura -------------------------------------------------------------------------------------

select is(pg_temp.state(2) ->> 'type', 'cuela_la_mentira', 'la foto es la de Cuela la mentira');
select is(pg_temp.state(2) ->> 'question', '¿Para qué servía el objeto de prueba?', 'con la pregunta');
select is(pg_temp.state(2) -> 'options', 'null'::jsonb, 'sin opciones mientras se escribe');

select pg_temp.call(2, format('select public.cuela_answer(%L, %L)', pg_temp.room(), 'Para <b>medir</b> la lluvia'));
select is(pg_temp.state(2) #>> '{my,answer}', 'Para <b>medir</b> la lluvia', 'cada uno recupera su mentira, tal cual');
select is(pg_temp.state(3) #>> '{my,answer}', null, 'y no la de otro');
select ok(pg_temp.state(3)::text !~ 'medir', 'ninguna mentira ajena en la foto');
select ok(pg_temp.state(3)::text !~ 'sujetar una vela', 'ni la verdad');
select ok(not pg_temp.leaks(pg_temp.state(3)), 'ni nada de la revelación');
select is(
  (select jsonb_agg(p -> 'has_responded' order by p ->> 'user_id') from jsonb_array_elements(pg_temp.state(3) -> 'participants') as p),
  '[false, true, false, false]'::jsonb,
  'se ve quién ha enviado'
);

select pg_temp.call(3, format('select public.cuela_answer(%L, %L)', pg_temp.room(), 'para <B>MEDIR</B> la lluvia'));
select pg_temp.call(4, format('select public.cuela_answer(%L, %L)', pg_temp.room(), 'Para colgar llaves'));
select pg_temp.call(1, format('select public.cuela_close_writing(%L)', pg_temp.room()));

-- Votación --------------------------------------------------------------------------------------

select is(jsonb_array_length(pg_temp.state(1) -> 'options'), 3, 'tres opciones: verdad y dos mentiras');
select is(
  (select jsonb_agg(o -> 'id') from jsonb_array_elements(pg_temp.state(1) -> 'options') as o),
  (select jsonb_agg(o -> 'id') from jsonb_array_elements(pg_temp.state(4) -> 'options') as o),
  'en el mismo orden para todos'
);
select is(
  (select jsonb_agg(o -> 'id') from jsonb_array_elements(pg_temp.state(1) -> 'options') as o),
  (select jsonb_agg(to_jsonb(option_id) order by position) from public.cuela_options where game_id = (pg_temp.game()).id),
  'el orden barajado que se guardó'
);
select ok(not pg_temp.leaks(pg_temp.state(n)), format('la foto de u%s no dice cuál es la verdad ni de quién es nada', n))
from generate_series(1, 4) as n;
select is(
  (select jsonb_agg(o ->> 'text') from jsonb_array_elements(pg_temp.state(2) -> 'options') as o where (o ->> 'is_mine')::boolean),
  '["Para <b>medir</b> la lluvia"]'::jsonb,
  'cada autor ve marcada solo su opción'
);
select is(
  (select jsonb_agg(o ->> 'text') from jsonb_array_elements(pg_temp.state(3) -> 'options') as o where (o ->> 'is_mine')::boolean),
  '["Para <b>medir</b> la lluvia"]'::jsonb,
  'también si la mentira se fundió con la de otro'
);
select is(
  (select count(*) from jsonb_array_elements(pg_temp.state(1) -> 'options') as o where (o ->> 'is_mine')::boolean),
  0::bigint,
  'quien no escribió no tiene ninguna suya'
);

select pg_temp.call(2, format('select public.cuela_vote(%L, %L)', pg_temp.room(), pg_temp.option_of('Para colgar llaves')));
select is(pg_temp.state(2) #>> '{my,voted_option_id}', pg_temp.option_of('Para colgar llaves')::text, 'cada uno recupera su voto');
select is(pg_temp.state(3) #>> '{my,voted_option_id}', null, 'y no el de otro');
select ok(not pg_temp.leaks(pg_temp.state(3)), 'ningún voto ajeno en la foto');
select is(
  (select jsonb_agg(p -> 'has_responded' order by p ->> 'user_id') from jsonb_array_elements(pg_temp.state(3) -> 'participants') as p),
  '[false, true, false, false]'::jsonb,
  'se ve quién ha votado'
);
select ok(
  (select r::text from public.rooms r where r.id = pg_temp.room()) !~ '(sujetar|medir|colgar)',
  'nada de esto en la fila de la sala'
);

-- Quien llega tarde mira la votación sin ser de nadie.
select pg_temp.call(5, format('select public.join_room(%L, %L)', (select code from public.rooms where id = pg_temp.room()), 'Jugador 5'));
select is(pg_temp.state(5) #>> '{my,is_participant}', 'false', 'quien llega tarde no juega');
select ok(not pg_temp.leaks(pg_temp.state(5)), 'y tampoco ve la verdad');

select pg_temp.call(1, format('select public.cuela_vote(%L, %L)', pg_temp.room(), pg_temp.option_of('Para sujetar una vela')));
select pg_temp.call(3, format('select public.cuela_vote(%L, %L)', pg_temp.room(), pg_temp.option_of('Para colgar llaves')));
select pg_temp.call(4, format('select public.cuela_vote(%L, %L)', pg_temp.room(), pg_temp.option_of('Para <b>medir</b> la lluvia')));

-- Revelación ------------------------------------------------------------------------------------

select is(pg_temp.state(3) ->> 'phase', 'reveal', 'votan todos y se revela');
select is(pg_temp.state(3) ->> 'explanation', 'Explicación secreta.', 'con la explicación');
select is(
  (select o ->> 'text' from jsonb_array_elements(pg_temp.state(3) -> 'options') as o where o ->> 'kind' = 'truth'),
  'Para sujetar una vela',
  'la verdad, marcada'
);
select is(
  (select o -> 'author_ids' from jsonb_array_elements(pg_temp.state(3) -> 'options') as o where o ->> 'text' = 'Para <b>medir</b> la lluvia'),
  jsonb_build_array(pg_temp.u(2), pg_temp.u(3)),
  'cada mentira con sus autores'
);
select is(
  (select o -> 'voter_ids' from jsonb_array_elements(pg_temp.state(3) -> 'options') as o where o ->> 'text' = 'Para colgar llaves'),
  jsonb_build_array(pg_temp.u(2), pg_temp.u(3)),
  'y quién la ha votado'
);
select is(
  pg_temp.state(3) -> 'round_points',
  jsonb_build_array(
    jsonb_build_object('user_id', pg_temp.u(1), 'points', 2),
    jsonb_build_object('user_id', pg_temp.u(2), 'points', 1),
    jsonb_build_object('user_id', pg_temp.u(3), 'points', 1),
    jsonb_build_object('user_id', pg_temp.u(4), 'points', 2)
  ),
  'y los puntos de la ronda de cada uno'
);
select is(
  (select o -> 'left_author_ids' from jsonb_array_elements(pg_temp.state(3) -> 'options') as o where o ->> 'text' = 'Para colgar llaves'),
  '[]'::jsonb,
  'sin nadie que se haya ido'
);

-- Final con empate: u1 y u4 llevan 2 y nadie suma en las rondas que quedan.
do $$
begin
  for i in 2..5 loop
    perform pg_temp.call(1, format('select public.cuela_next(%L)', pg_temp.room()));
    perform pg_temp.call(1, format('select public.cuela_close_writing(%L)', pg_temp.room()));
    perform pg_temp.call(1, format('select public.cuela_close_voting(%L)', pg_temp.room()));
  end loop;
end;
$$;
select pg_temp.call(1, format('select public.cuela_next(%L)', pg_temp.room()));
select is(pg_temp.state(2) ->> 'phase', 'finished', 'tras la última ronda, final');
select is(
  (select jsonb_agg(r ->> 'score') from jsonb_array_elements(pg_temp.state(2) -> 'ranking') as r),
  '["2", "2", "1", "1", "0"]'::jsonb,
  'la clasificación, de más a menos, con quien entró tarde'
);
select is(
  (select jsonb_agg(r ->> 'user_id') from jsonb_array_elements(pg_temp.state(2) -> 'ranking') as r where (r ->> 'score')::integer = 2),
  jsonb_build_array(pg_temp.u(1), pg_temp.u(4)),
  'con empate en cabeza, los dos arriba con los mismos puntos'
);

select * from finish();
rollback;
