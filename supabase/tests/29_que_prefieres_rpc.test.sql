begin;
create extension if not exists pgtap with schema extensions;

select plan(35);

-- Utilidades ------------------------------------------------------------------------------

insert into auth.users (id)
select format('00000000-0000-0000-0000-0000000000%s', lpad(i::text, 2, '0'))::uuid
from generate_series(1, 9) as i;

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

create function pg_temp.code() returns text language sql stable as $$
  select value #>> '{}' from ctx where key = 'code'
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

create function pg_temp.act(n integer, action text) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.%s(%L)', action, pg_temp.room()))
$$;

create function pg_temp.choose(n integer, option text) returns jsonb language sql as $$
  select pg_temp.call(n, format('select public.que_prefieres_choose(%L, %L)', pg_temp.room(), option))
$$;

create function pg_temp.score(n integer) returns integer language sql stable as $$
  select score from public.game_players where game_id = (pg_temp.game()).id and user_id = pg_temp.u(n)
$$;

create function pg_temp.result() returns jsonb language sql stable as $$
  select result from public.game_rounds where game_id = (pg_temp.game()).id and round = (pg_temp.game()).round
$$;

-- Sala de 4 (u1 anfitrión) --------------------------------------------------------------------

insert into ctx select 'room', pg_temp.call(1, $$select public.create_room('Jugador 1')$$) -> 'room' -> 'id';
insert into ctx select 'code', to_jsonb((select code from public.rooms where id = pg_temp.room()));
select pg_temp.call(n, format('select public.join_room(%L, %L)', pg_temp.code(), format('Jugador %s', n)))
from generate_series(2, 4) as n;

-- Empezar ------------------------------------------------------------------------------------

select pg_temp.as_user(1);
select throws_ok(format('select public.que_prefieres_start(%L, 5)', pg_temp.room()), 'P0001', 'invalid_game', 'no se empieza si la sala eligió otro juego');
select lives_ok(format('select public.set_game(%L, %L)', pg_temp.room(), 'que_prefieres'), 'set_game acepta que_prefieres');
select throws_ok(format('select public.que_prefieres_start(%L, 6)', pg_temp.room()), 'P0001', 'invalid_rounds', 'las rondas son 5, 10 o 15');
select pg_temp.as_user(2);
select throws_ok(format('select public.que_prefieres_start(%L, 5)', pg_temp.room()), 'P0001', 'not_host', 'solo empieza el anfitrión');
select pg_temp.as_admin();

select pg_temp.call(1, format('select public.que_prefieres_start(%L, 5)', pg_temp.room()));
select is((pg_temp.game()).phase, 'voting', 'empieza eligiendo');
select is((pg_temp.game()).round, 1, 'en la ronda 1');
select is(
  (select p.game_type from public.game_rounds gr join public.prompts p on p.id = gr.prompt_id
   where gr.game_id = (pg_temp.game()).id and gr.round = 1),
  'que_prefieres',
  'con un dilema de que_prefieres'
);

-- Elegir: rechazos ---------------------------------------------------------------------------

select pg_temp.as_user(1);
select throws_ok(format('select public.que_prefieres_choose(%L, %L)', pg_temp.room(), 'c'), 'P0001', 'invalid_option', 'solo valen a y b');
select throws_ok(format('select public.que_prefieres_choose(%L, %L)', pg_temp.room(), 'A'), 'P0001', 'invalid_option', 'en minúscula');
select throws_ok(format('select public.que_prefieres_choose(%L, null)', pg_temp.room()), 'P0001', 'invalid_option', 'sin opción se rechaza');
select pg_temp.as_admin();

select pg_temp.choose(1, 'a');
select pg_temp.as_user(1);
select throws_ok(format('select public.que_prefieres_choose(%L, %L)', pg_temp.room(), 'b'), 'P0001', 'already_answered', 'no se elige dos veces');
select throws_ok(format('select public.que_prefieres_next(%L)', pg_temp.room()), 'P0001', 'invalid_phase', 'no se pasa de ronda eligiendo');
select pg_temp.as_admin();

select pg_temp.call(5, format('select public.join_room(%L, %L)', pg_temp.code(), 'Jugador 5'));
select pg_temp.as_user(5);
select throws_ok(format('select public.que_prefieres_choose(%L, %L)', pg_temp.room(), 'a'), 'P0001', 'not_participant', 'quien llega tarde no elige en esta ronda');
select pg_temp.as_user(9);
select throws_ok(format('select public.que_prefieres_choose(%L, %L)', pg_temp.room(), 'a'), 'P0001', 'not_member', 'quien no está en la sala no elige');
select pg_temp.as_user(2);
select throws_ok(format('select public.que_prefieres_close(%L)', pg_temp.room()), 'P0001', 'not_host', 'solo cierra el anfitrión');
select pg_temp.as_admin();

-- Cierre automático con mayoría --------------------------------------------------------------

select pg_temp.choose(2, 'a');
select pg_temp.choose(3, 'b');
select is((pg_temp.game()).phase, 'voting', 'sigue eligiendo mientras falte alguien');
select is((select count(*) from public.answers where game_id = (pg_temp.game()).id and round = 1), 3::bigint, 'cada elección se guarda');
select pg_temp.choose(4, 'a');
select is((pg_temp.game()).phase, 'reveal', 'cierra sola cuando elige el último');
select is(pg_temp.result() ->> 'majority', 'a', 'gana la opción más elegida');
select is(pg_temp.result() -> 'choices' -> 'a', jsonb_build_array(pg_temp.u(1), pg_temp.u(2), pg_temp.u(4)), 'quién eligió A, por orden de entrada');
select is(pg_temp.result() -> 'choices' -> 'b', jsonb_build_array(pg_temp.u(3)), 'quién eligió B');
select is(array[pg_temp.score(1), pg_temp.score(2), pg_temp.score(3), pg_temp.score(4)], array[1, 1, 0, 1], 'un punto a cada uno de la mayoría');

select pg_temp.as_user(1);
select throws_ok(format('select public.que_prefieres_choose(%L, %L)', pg_temp.room(), 'a'), 'P0001', 'invalid_phase', 'no se elige en la revelación');
select throws_ok(format('select public.que_prefieres_close(%L)', pg_temp.room()), 'P0001', 'invalid_phase', 'no se cierra dos veces');
select pg_temp.as_user(2);
select throws_ok(format('select public.que_prefieres_next(%L)', pg_temp.room()), 'P0001', 'not_host', 'solo el anfitrión pasa de ronda');
select pg_temp.as_admin();

-- Empate, cierre forzado con elecciones parciales ----------------------------------------------

select pg_temp.act(1, 'que_prefieres_next');
select is((pg_temp.game()).round, 2, 'pasa a la ronda 2');
select is((pg_temp.game()).phase, 'voting', 'eligiendo otra vez');
select isnt(
  (select prompt_id from public.game_rounds where game_id = (pg_temp.game()).id and round = 2),
  (select prompt_id from public.game_rounds where game_id = (pg_temp.game()).id and round = 1),
  'con otro dilema'
);
select pg_temp.choose(1, 'a');
select pg_temp.choose(3, 'b');
select pg_temp.act(1, 'que_prefieres_close');
select is((pg_temp.game()).phase, 'reveal', 'el anfitrión cierra aunque falte gente');
select is(pg_temp.result() -> 'majority', 'null'::jsonb, 'empate: no hay mayoría');
select is(array[pg_temp.score(1), pg_temp.score(3)], array[1, 0], 'y nadie puntúa');

-- Sin elecciones -------------------------------------------------------------------------------

select pg_temp.act(1, 'que_prefieres_next');
select pg_temp.act(1, 'que_prefieres_close');
select is(pg_temp.result() -> 'choices', '{"a": [], "b": []}'::jsonb, 'sin elecciones, el reparto está vacío');
select is(pg_temp.result() -> 'majority', 'null'::jsonb, 'y sin mayoría');

-- Final ----------------------------------------------------------------------------------------

select pg_temp.act(1, 'que_prefieres_next');
select pg_temp.act(1, 'que_prefieres_close');
select pg_temp.act(1, 'que_prefieres_next');
select pg_temp.act(1, 'que_prefieres_close');
select pg_temp.act(1, 'que_prefieres_next');
select is((pg_temp.game()).phase, 'finished', 'tras la última ronda, la partida termina');
select is((pg_temp.game()).round, 5, 'después de 5 rondas');

select * from finish();
rollback;
