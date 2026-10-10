begin;
create extension if not exists pgtap with schema extensions;

select plan(24);

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

create function pg_temp.clue(n integer, text text) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.una_pista_clue(%L, %L)', pg_temp.room(), text))
$$;

create function pg_temp.keys(value jsonb) returns text[] language sql immutable as $$
  select array_agg(k order by k) from jsonb_object_keys(value) k
$$;

-- Sala de 4 con u1 de anfitrión (y primer adivino) y u2 de árbitro, partida de 5 rondas.
insert into ctx select 'room', pg_temp.call(1, $$select public.create_room('Jugador 1')$$) -> 'room' -> 'id';
select pg_temp.call(n, format('select public.join_room(%L, %L)', (select code from public.rooms where id = pg_temp.room()), format('Jugador %s', n)))
from generate_series(2, 4) as n;
select pg_temp.call(1, format('select public.set_game(%L, %L)', pg_temp.room(), 'una_pista'));
select pg_temp.call(1, format('select public.una_pista_start(%L, 5)', pg_temp.room()));
update public.game_rounds set word_id = (select id from public.words where word = 'Pingüino')
where game_id = (select current_game_id from public.rooms where id = pg_temp.room());

-- Escritura -----------------------------------------------------------------------------------------

select is(
  pg_temp.keys(pg_temp.game_of(2)),
  array['arbiter_id', 'category', 'clues', 'guesser_id', 'id', 'my', 'participants', 'phase', 'ranking',
        'result', 'round', 'team_score', 'total_rounds', 'type', 'word'],
  'la foto de una_pista tiene su forma propia'
);
select is(pg_temp.game_of(2) ->> 'type', 'una_pista', 'dice qué juego es');
select is(pg_temp.game_of(2) ->> 'guesser_id', pg_temp.u(1)::text, 'quién adivina');
select is(pg_temp.game_of(2) ->> 'arbiter_id', pg_temp.u(2)::text, 'quién arbitra');
select is((pg_temp.game_of(2) ->> 'team_score')::int, 0, 'el marcador de equipo empieza en 0');
select is(pg_temp.game_of(2) ->> 'word', 'Pingüino', 'quien da pista ve la palabra');
select is(pg_temp.game_of(2) ->> 'category', 'Animales', 'y la categoría');
select is(pg_temp.game_of(1) -> 'word', 'null'::jsonb, 'el adivino no ve la palabra');
select is(pg_temp.game_of(1) -> 'category', 'null'::jsonb, 'ni la categoría');
select is(pg_temp.keys(pg_temp.game_of(2) -> 'my'), array['alive', 'clue', 'is_participant'], 'mis datos: si participo y mi pista');

select pg_temp.clue(2, 'frío');
select is(pg_temp.game_of(2) #>> '{my,clue}', 'frío', 'veo mi pista');
select is(pg_temp.game_of(2) -> 'clues', 'null'::jsonb, 'escribiendo nadie ve las pistas');

-- Revisión ------------------------------------------------------------------------------------------

select pg_temp.clue(3, 'Antártida');
select pg_temp.clue(4, 'FRIO');
select is(pg_temp.game_of(2) ->> 'phase', 'review', 'revisando');
select is(
  pg_temp.game_of(3) -> 'clues',
  jsonb_build_array(
    jsonb_build_object('user_id', pg_temp.u(2), 'text', 'frío', 'cancelled', true),
    jsonb_build_object('user_id', pg_temp.u(3), 'text', 'Antártida', 'cancelled', false),
    jsonb_build_object('user_id', pg_temp.u(4), 'text', 'FRIO', 'cancelled', true)
  ),
  'quien ha dado pista ve todas, con autor y anuladas'
);
select is(pg_temp.game_of(1) -> 'clues', 'null'::jsonb, 'el adivino sigue sin ver nada');

-- Adivinar ------------------------------------------------------------------------------------------

select pg_temp.call(3, format('select public.una_pista_toggle_clue(%L, %L)', pg_temp.room(), pg_temp.u(4)));
select pg_temp.act(2, 'una_pista_show_clues');
select is(
  pg_temp.game_of(1) -> 'clues',
  '[{"text": "Antártida"}, {"text": "FRIO"}]'::jsonb,
  'el adivino ve solo el texto de las vivas, en orden alfabético'
);
select is(pg_temp.game_of(1) -> 'word', 'null'::jsonb, 'y sigue sin la palabra');
select is(jsonb_array_length(pg_temp.game_of(3) -> 'clues'), 3, 'los demás siguen viendo todas');

-- Revelación ----------------------------------------------------------------------------------------

select pg_temp.call(2, format('select public.una_pista_mark(%L, %L)', pg_temp.room(), 'correct'));
select is(pg_temp.game_of(1) ->> 'word', 'Pingüino', 'en la revelación el adivino ve la palabra');
select is(pg_temp.game_of(1) ->> 'result', 'correct', 'y el resultado');
select is(jsonb_array_length(pg_temp.game_of(1) -> 'clues'), 3, 'y todas las pistas, también las anuladas');
select is((pg_temp.game_of(1) ->> 'team_score')::int, 1, 'una acertada suma un punto de equipo');

-- Final ---------------------------------------------------------------------------------------------

update public.games set phase = 'finished', finished_at = now()
where id = (select current_game_id from public.rooms where id = pg_temp.room());
select is(pg_temp.game_of(3) -> 'ranking', 'null'::jsonb, 'al terminar no hay clasificación individual');
select is(
  array[(pg_temp.game_of(3) ->> 'team_score')::int, (pg_temp.game_of(3) ->> 'total_rounds')::int],
  array[1, 5],
  'sino el marcador de equipo sobre el total'
);

select * from finish();
rollback;
