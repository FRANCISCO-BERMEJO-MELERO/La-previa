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

-- Sala de u1 con u2..u(n).
create function pg_temp.room_with(players integer) returns uuid language plpgsql as $$
declare
  state jsonb;
begin
  perform pg_temp.as_user(1);
  state := public.create_room('Jugador 1');
  for n in 2..players loop
    perform pg_temp.as_user(n);
    perform public.join_room(state -> 'room' ->> 'code', format('Jugador %s', n));
  end loop;
  perform pg_temp.as_admin();
  return (state -> 'room' ->> 'id')::uuid;
end;
$$;

create function pg_temp.room() returns uuid language sql stable as $$
  select (value ->> 'id')::uuid from ctx where key = 'room'
$$;

create function pg_temp.game() returns public.games language sql stable as $$
  select g.* from public.games g join public.rooms r on r.current_game_id = g.id where r.id = pg_temp.room()
$$;

-- Validaciones ----------------------------------------------------------------------------

insert into ctx values ('room', jsonb_build_object('id', pg_temp.room_with(2)));

select pg_temp.as_user(1);
select throws_ok(format('select public.start_game(%L, 1)', pg_temp.room()), 'P0001', 'not_enough_players', 'con 2 jugadores no se empieza');
select pg_temp.as_admin();

delete from ctx;
insert into ctx values ('room', jsonb_build_object('id', pg_temp.room_with(5)));

select pg_temp.as_user(2);
select throws_ok(format('select public.start_game(%L, 1)', pg_temp.room()), 'P0001', 'not_host', 'solo el anfitrión empieza');

select pg_temp.as_user(1);
select throws_ok(format('select public.start_game(%L, 0)', pg_temp.room()), 'P0001', 'invalid_impostor_count', 'al menos un impostor');
select throws_ok(format('select public.start_game(%L, null)', pg_temp.room()), 'P0001', 'invalid_impostor_count', 'el número de impostores es obligatorio');
select throws_ok(format('select public.start_game(%L, 3)', pg_temp.room()), 'P0001', 'invalid_impostor_count', 'con 5 jugadores, 3 impostores son demasiados');

-- Con 4 jugadores, 2 impostores igualarían a los normales.
select pg_temp.as_admin();
insert into ctx values ('code', to_jsonb((select code from public.rooms where id = pg_temp.room())));
delete from public.room_players where room_id = pg_temp.room() and user_id = pg_temp.u(5);
select pg_temp.as_user(1);
select throws_ok(format('select public.start_game(%L, 2)', pg_temp.room()), 'P0001', 'invalid_impostor_count', '2 × impostores tiene que ser menor que jugadores');
select pg_temp.as_user(5);
select public.join_room((select value #>> '{}' from ctx where key = 'code'), 'Jugador 5');

-- Empezar ---------------------------------------------------------------------------------

select pg_temp.as_admin();
insert into ctx values ('version', to_jsonb((select version from public.rooms where id = pg_temp.room())));
-- Un desconectado también participa.
update public.room_players set last_seen_at = now() - interval '5 minutes' where room_id = pg_temp.room() and user_id = pg_temp.u(4);

select pg_temp.as_user(1);
select lives_ok(format('select public.start_game(%L, 2)', pg_temp.room()), 'el anfitrión empieza con 5 jugadores y 2 impostores');
select pg_temp.as_admin();

select isnt((pg_temp.game()).id, null, 'la sala apunta a la partida');
select is((pg_temp.game()).phase, 'talking', 'la partida empieza hablando');
select is((pg_temp.game()).round, 1, 'en la ronda 1');
select is((pg_temp.game()).impostor_count, 2, 'con los impostores pedidos');
select is(
  (select version from public.rooms where id = pg_temp.room()),
  (select value::bigint + 1 from ctx where key = 'version'),
  'empezar sube la versión'
);
select is((select count(*) from public.game_players where game_id = (pg_temp.game()).id), 5::bigint, 'participan los 5, también el desconectado');
select is(
  (select count(*) from public.game_players where game_id = (pg_temp.game()).id and alive and not has_voted),
  5::bigint,
  'todos empiezan vivos y sin votar'
);
select is(
  (select count(*) from public.game_roles where game_id = (pg_temp.game()).id and role = 'impostor'),
  2::bigint,
  'se reparten exactamente 2 impostores'
);
select is(
  (select count(*) from public.game_roles where game_id = (pg_temp.game()).id),
  5::bigint,
  'cada participante tiene su rol'
);
select is((select active from public.words where id = (pg_temp.game()).word_id), true, 'la palabra es una activa');

select pg_temp.as_user(1);
select throws_ok(format('select public.start_game(%L, 1)', pg_temp.room()), 'P0001', 'invalid_phase', 'no se empieza con una partida en curso');

-- Volver a jugar sin repetir palabra --------------------------------------------------------

select pg_temp.as_admin();
-- Solo quedan dos palabras activas: la de esta partida y otra.
update public.words set active = (id in ((pg_temp.game()).word_id, (select min(id) from public.words where id <> (pg_temp.game()).word_id)));
insert into ctx values ('first_word', to_jsonb((pg_temp.game()).word_id));
update public.games set phase = 'finished', winner = 'group', finished_at = now() where id = (pg_temp.game()).id;

select pg_temp.as_user(1);
select lives_ok(format('select public.start_game(%L, 1)', pg_temp.room()), 'se vuelve a jugar desde una partida terminada');
select pg_temp.as_admin();
select isnt((pg_temp.game()).word_id, (select value::bigint from ctx where key = 'first_word'), 'la palabra no se repite mientras queden otras');

-- Agotadas las palabras, se repite alguna en vez de fallar.
update public.games set phase = 'finished', winner = 'group', finished_at = now() where id = (pg_temp.game()).id;
select pg_temp.as_user(1);
select lives_ok(format('select public.start_game(%L, 1)', pg_temp.room()), 'sin palabras nuevas se repite alguna');
select pg_temp.as_admin();
select is((select count(*) from public.games where room_id = pg_temp.room()), 3::bigint, 'la sala guarda sus tres partidas');

select * from finish();
rollback;
