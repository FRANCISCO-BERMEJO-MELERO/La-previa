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

create function pg_temp.act(n integer, action text) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.%s(%L)', action, pg_temp.room()))
$$;

create function pg_temp.choose(n integer, option text) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.que_prefieres_choose(%L, %L)', pg_temp.room(), option))
$$;

create function pg_temp.keys(value jsonb) returns text[] language sql immutable as $$
  select array_agg(k order by k) from jsonb_object_keys(value) k
$$;

-- Sala de 3 con u1 de anfitrión, partida de 5 rondas con un dilema conocido.
insert into ctx select 'room', pg_temp.call(1, $$select public.create_room('Jugador 1')$$) -> 'room' -> 'id';
select pg_temp.call(n, format('select public.join_room(%L, %L)', (select code from public.rooms where id = pg_temp.room()), format('Jugador %s', n)))
from generate_series(2, 3) as n;
select pg_temp.call(1, format('select public.set_game(%L, %L)', pg_temp.room(), 'que_prefieres'));
select pg_temp.call(1, format('select public.que_prefieres_start(%L, 5)', pg_temp.room()));
update public.game_rounds set prompt_id = (select id from public.prompts where text = 'Volar')
where game_id = (select current_game_id from public.rooms where id = pg_temp.room());

-- Eligiendo -----------------------------------------------------------------------------------

select is(
  pg_temp.keys(pg_temp.game_of(2)),
  array['choices', 'id', 'majority', 'my', 'option_a', 'option_b', 'participants', 'phase', 'ranking',
        'round', 'total_rounds', 'type'],
  'la foto de que_prefieres tiene su forma propia'
);
select is(pg_temp.game_of(2) ->> 'type', 'que_prefieres', 'dice qué juego es');
select is(pg_temp.game_of(2) ->> 'option_a', 'Volar', 'la opción A');
select is(pg_temp.game_of(2) ->> 'option_b', 'Ser invisible', 'y la B');
select is(pg_temp.keys(pg_temp.game_of(2) -> 'my'), array['alive', 'choice', 'is_participant'], 'mis datos: si participo y mi elección');
select is(pg_temp.game_of(2) #> '{my,choice}', 'null'::jsonb, 'sin elegir todavía');

select pg_temp.choose(2, 'b');
select is(pg_temp.game_of(2) #>> '{my,choice}', 'b', 'veo lo que he elegido');
select is(pg_temp.game_of(1) #> '{my,choice}', 'null'::jsonb, 'los demás no ven mi elección como suya');
select is(
  (select jsonb_agg(p -> 'has_responded' order by p ->> 'name') from jsonb_array_elements(pg_temp.game_of(1) -> 'participants') p),
  '[false, true, false]'::jsonb,
  'se ve quién ha elegido'
);
select is(pg_temp.game_of(1) -> 'choices', 'null'::jsonb, 'pero no el reparto');
select is(pg_temp.game_of(1) -> 'majority', 'null'::jsonb, 'ni la mayoría');

-- Revelación ------------------------------------------------------------------------------------

select pg_temp.choose(1, 'a');
select pg_temp.choose(3, 'b');
select is(pg_temp.game_of(1) ->> 'phase', 'reveal', 'revelando');
select is(
  pg_temp.game_of(1) -> 'choices',
  jsonb_build_object('a', jsonb_build_array(pg_temp.u(1)), 'b', jsonb_build_array(pg_temp.u(2), pg_temp.u(3))),
  'en la revelación todos ven el reparto'
);
select is(pg_temp.game_of(1) ->> 'majority', 'b', 'y la opción mayoritaria');
select is(
  (select jsonb_agg(p -> 'score' order by p ->> 'name') from jsonb_array_elements(pg_temp.game_of(1) -> 'participants') p),
  '[0, 1, 1]'::jsonb,
  'con los puntos ya sumados'
);
select is(pg_temp.game_of(1) -> 'ranking', 'null'::jsonb, 'sin clasificación hasta el final');

-- Final ---------------------------------------------------------------------------------------------

update public.games set phase = 'finished', finished_at = now()
where id = (select current_game_id from public.rooms where id = pg_temp.room());
select is(
  pg_temp.game_of(3) -> 'ranking',
  jsonb_build_array(
    jsonb_build_object('user_id', pg_temp.u(2), 'name', 'Jugador 2', 'score', 1),
    jsonb_build_object('user_id', pg_temp.u(3), 'name', 'Jugador 3', 'score', 1),
    jsonb_build_object('user_id', pg_temp.u(1), 'name', 'Jugador 1', 'score', 0)
  ),
  'al terminar, la clasificación por puntos'
);

select * from finish();
rollback;
