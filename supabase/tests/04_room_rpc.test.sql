begin;
create extension if not exists pgtap with schema extensions;

select plan(56);

-- Usuarios u01..u18 y utilidades de la prueba.
insert into auth.users (id)
select format('00000000-0000-0000-0000-0000000000%s', lpad(i::text, 2, '0'))::uuid
from generate_series(1, 18) as i;

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

create function pg_temp.room_id() returns uuid language sql stable as $$
  select (value -> 'room' ->> 'id')::uuid from ctx where key = 'room'
$$;

create function pg_temp.room_code() returns text language sql stable as $$
  select value -> 'room' ->> 'code' from ctx where key = 'room'
$$;

create function pg_temp.version() returns bigint language sql stable as $$
  select r.version from public.rooms r where r.id = pg_temp.room_id()
$$;

-- Sin sesión ------------------------------------------------------------------------------

select throws_ok($$select public.create_room('Fran')$$, 'P0001', 'not_authenticated', 'create_room exige sesión');
select throws_ok($$select public.join_room('KTRM', 'Fran')$$, 'P0001', 'not_authenticated', 'join_room exige sesión');
select throws_ok(
  $$select public.get_room_state('10000000-0000-0000-0000-000000000001')$$,
  'P0001', 'not_authenticated', 'get_room_state exige sesión'
);

-- create_room -----------------------------------------------------------------------------

select pg_temp.as_user(1);
insert into ctx values ('room', public.create_room('  Fran  '));

select is(pg_temp.room_code() ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ]{4}$', true, 'create_room genera un código válido');
select is((select value -> 'me' ->> 'name' from ctx where key = 'room'), 'Fran', 'el nombre se guarda recortado');
select is((select (value -> 'me' ->> 'is_host')::boolean from ctx where key = 'room'), true, 'quien crea la sala es anfitrión');
select is((select value -> 'room' ->> 'host_id' from ctx where key = 'room'), pg_temp.u(1)::text, 'host_id es quien crea');
select is((select jsonb_array_length(value -> 'players') from ctx where key = 'room'), 1, 'la sala nace con su creador');
select is((select value -> 'game' from ctx where key = 'room'), 'null'::jsonb, 'la sala nace en la sala de espera');
select is((select value -> 'room' ->> 'game' from ctx where key = 'room'), 'impostor', 'el juego por defecto es El impostor');
select throws_ok($$select public.create_room('')$$, 'P0001', 'name_invalid', 'create_room rechaza un nombre vacío');
select throws_ok($$select public.create_room('Quinceletrasaaa')$$, 'P0001', 'name_invalid', 'create_room rechaza un nombre largo');

select pg_temp.as_user(18);
select is(
  (select bool_and(public.create_room('Otro') -> 'room' ->> 'code' ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ]{4}$') from generate_series(1, 40)),
  true,
  'cuarenta salas seguidas tienen códigos del alfabeto permitido'
);
select pg_temp.as_admin();
select is(
  (select count(distinct code) from public.rooms),
  (select count(*) from public.rooms),
  'no se repite ningún código'
);

-- join_room -------------------------------------------------------------------------------

select pg_temp.as_user(2);
select throws_ok($$select public.join_room('ZZZZ', 'Lucía')$$, 'P0001', 'room_not_found', 'sala inexistente');
select throws_ok(format('select public.join_room(%L, %L)', pg_temp.room_code(), ''), 'P0001', 'name_invalid', 'nombre vacío');
select throws_ok(format('select public.join_room(%L, %L)', pg_temp.room_code(), '   '), 'P0001', 'name_invalid', 'nombre de solo espacios');
select throws_ok(format('select public.join_room(%L, %L)', pg_temp.room_code(), 'Quinceletrasaaa'), 'P0001', 'name_invalid', 'nombre de 15 caracteres');
select throws_ok(format('select public.join_room(%L, %L)', pg_temp.room_code(), 'FRAN'), 'P0001', 'name_taken', 'nombre repetido con distinta capitalización');

select pg_temp.as_admin();
insert into ctx values ('v_before_join', to_jsonb(pg_temp.version()));
select pg_temp.as_user(2);
insert into ctx values ('lucia', public.join_room(lower(pg_temp.room_code()), 'Lucía'));
select is((select value -> 'me' ->> 'name' from ctx where key = 'lucia'), 'Lucía', 'join_room acepta el código en minúsculas');
select is((select (value -> 'me' ->> 'is_host')::boolean from ctx where key = 'lucia'), false, 'quien se une no es anfitrión');
select is(
  (select jsonb_path_query_array(value, '$.players[*].name') from ctx where key = 'lucia'),
  '["Fran", "Lucía"]'::jsonb,
  'la lista va por orden de entrada'
);
select pg_temp.as_admin();
select is(pg_temp.version(), (select value::bigint + 1 from ctx where key = 'v_before_join'), 'unirse sube la versión');

insert into ctx values ('v_before_rejoin', to_jsonb(pg_temp.version()));
select pg_temp.as_user(2);
select is(
  (public.join_room(pg_temp.room_code(), 'Otro nombre') -> 'me' ->> 'name'),
  'Lucía',
  'reentrar devuelve el estado sin cambiar el nombre'
);
select pg_temp.as_admin();
select is(pg_temp.version(), (select value::bigint from ctx where key = 'v_before_rejoin'), 'reentrar no sube la versión');
select is((select count(*) from public.room_players where room_id = pg_temp.room_id()), 2::bigint, 'reentrar no duplica al jugador');

-- Se llena la sala hasta 16.
create function pg_temp.fill_room() returns void language plpgsql as $$
begin
  for n in 3..16 loop
    perform pg_temp.as_user(n);
    perform public.join_room(pg_temp.room_code(), format('Jugador %s', n));
  end loop;
end;
$$;
select pg_temp.fill_room();
select pg_temp.as_admin();
select is((select count(*) from public.room_players where room_id = pg_temp.room_id()), 16::bigint, 'caben 16 jugadores');
select pg_temp.as_user(17);
select throws_ok(format('select public.join_room(%L, %L)', pg_temp.room_code(), 'Sergio'), 'P0001', 'room_full', 'el 17.º no cabe');

-- get_room_state --------------------------------------------------------------------------

select throws_ok(format('select public.get_room_state(%L)', pg_temp.room_id()), 'P0001', 'not_member', 'un no miembro no lee el estado');
select throws_ok(
  $$select public.get_room_state('10000000-0000-0000-0000-00000000dead')$$,
  'P0001', 'room_not_found', 'sala inexistente en get_room_state'
);

select pg_temp.as_admin();
insert into ctx values ('v_before_get', to_jsonb(pg_temp.version()));
update public.room_players set last_seen_at = now() - interval '1 hour' where room_id = pg_temp.room_id() and user_id = pg_temp.u(2);
select pg_temp.as_user(2);
select is((public.get_room_state(pg_temp.room_id()) -> 'me' ->> 'user_id'), pg_temp.u(2)::text, 'get_room_state devuelve la foto de quien llama');
select pg_temp.as_admin();
select is(pg_temp.version(), (select value::bigint from ctx where key = 'v_before_get'), 'get_room_state no sube la versión sin traspaso');
select is(
  (select last_seen_at from public.room_players where room_id = pg_temp.room_id() and user_id = pg_temp.u(2)),
  now(),
  'get_room_state marca last_seen_at'
);

-- Conexión: last_seen_at de hace más de 25 s es desconectado.
update public.room_players set last_seen_at = now() - interval '30 seconds' where room_id = pg_temp.room_id() and user_id = pg_temp.u(3);
select pg_temp.as_user(2);
select is(
  (select p ->> 'connected' from jsonb_array_elements(public.get_room_state(pg_temp.room_id()) -> 'players') p where p ->> 'user_id' = pg_temp.u(3)::text),
  'false',
  'quien no da señal en 25 s aparece desconectado'
);
select pg_temp.as_admin();

-- set_game y kick_player: solo el anfitrión ----------------------------------------------------

select pg_temp.as_user(2);
select throws_ok(format('select public.set_game(%L, %L)', pg_temp.room_id(), 'impostor'), 'P0001', 'not_host', 'set_game exige ser anfitrión');
select throws_ok(format('select public.kick_player(%L, %L)', pg_temp.room_id(), pg_temp.u(3)), 'P0001', 'not_host', 'kick_player exige ser anfitrión');

select pg_temp.as_user(1);
select throws_ok(format('select public.set_game(%L, %L)', pg_temp.room_id(), 'parchis'), 'P0001', 'invalid_game', 'set_game rechaza un juego inexistente');
select is((public.set_game(pg_temp.room_id(), 'impostor') -> 'room' ->> 'game'), 'impostor', 'set_game cambia el juego');
select throws_ok(format('select public.kick_player(%L, %L)', pg_temp.room_id(), pg_temp.u(1)), 'P0001', 'cannot_kick', 'el anfitrión no se echa a sí mismo');
select throws_ok(format('select public.kick_player(%L, %L)', pg_temp.room_id(), pg_temp.u(17)), 'P0001', 'cannot_kick', 'no se echa a quien no está');
select is(
  (select jsonb_array_length(public.kick_player(pg_temp.room_id(), pg_temp.u(16)) -> 'players')),
  15,
  'en la sala de espera se echa a cualquiera'
);

-- Con partida en curso: solo a desconectados, y set_game no vale.
select pg_temp.as_admin();
insert into public.games (id, room_id, impostor_count, word_id) values ('20000000-0000-0000-0000-000000000001', pg_temp.room_id(), 1, (select min(id) from public.words));
update public.rooms set current_game_id = '20000000-0000-0000-0000-000000000001' where id = pg_temp.room_id();
update public.room_players set last_seen_at = now() where room_id = pg_temp.room_id() and user_id = pg_temp.u(4);
update public.room_players set last_seen_at = now() - interval '1 minute' where room_id = pg_temp.room_id() and user_id = pg_temp.u(5);
select pg_temp.as_user(1);
select throws_ok(format('select public.set_game(%L, %L)', pg_temp.room_id(), 'impostor'), 'P0001', 'invalid_phase', 'set_game solo en la sala de espera');
select throws_ok(format('select public.kick_player(%L, %L)', pg_temp.room_id(), pg_temp.u(4)), 'P0001', 'cannot_kick', 'en partida no se echa a un conectado');
select lives_ok(format('select public.kick_player(%L, %L)', pg_temp.room_id(), pg_temp.u(5)), 'en partida se echa a un desconectado');
select pg_temp.as_admin();
update public.rooms set current_game_id = null where id = pg_temp.room_id();

-- Traspaso automático del anfitrión ---------------------------------------------------------

update public.room_players set last_seen_at = now() - interval '2 minutes' where room_id = pg_temp.room_id();
update public.room_players set last_seen_at = now() where room_id = pg_temp.room_id() and user_id = pg_temp.u(4);
insert into ctx values ('v_before_transfer', to_jsonb(pg_temp.version()));
select pg_temp.as_user(3);
select is(
  (public.get_room_state(pg_temp.room_id()) -> 'room' ->> 'host_id'),
  pg_temp.u(3)::text,
  'el anfitrión inactivo 90 s pasa al conectado más antiguo'
);
select pg_temp.as_admin();
select is(pg_temp.version(), (select value::bigint + 1 from ctx where key = 'v_before_transfer'), 'el traspaso sube la versión');

update public.room_players set last_seen_at = now() - interval '60 seconds' where room_id = pg_temp.room_id() and user_id = pg_temp.u(3);
select pg_temp.as_user(4);
select is(
  (public.get_room_state(pg_temp.room_id()) -> 'room' ->> 'host_id'),
  pg_temp.u(3)::text,
  'con 60 s sin señal el anfitrión no cambia'
);

-- leave_room ------------------------------------------------------------------------------

select pg_temp.as_admin();
-- u3 anfitrión desconectado; u4 conectado; el resto desconectados.
update public.room_players set last_seen_at = now() - interval '2 minutes' where room_id = pg_temp.room_id() and user_id <> pg_temp.u(4);
select pg_temp.as_user(3);
select is(public.leave_room(pg_temp.room_id()), null, 'leave_room no devuelve foto');
select pg_temp.as_admin();
select is((select host_id from public.rooms where id = pg_temp.room_id()), pg_temp.u(4), 'si sale el anfitrión, pasa al conectado más antiguo');
select is(
  (select count(*) from public.room_players where room_id = pg_temp.room_id() and user_id = pg_temp.u(3)),
  0::bigint,
  'quien sale deja de ser miembro'
);

-- Sin conectados, pasa al más antiguo.
update public.room_players set last_seen_at = now() - interval '2 minutes' where room_id = pg_temp.room_id();
select pg_temp.as_user(4);
select public.leave_room(pg_temp.room_id());
select pg_temp.as_admin();
select is((select host_id from public.rooms where id = pg_temp.room_id()), pg_temp.u(1), 'sin conectados, pasa al miembro más antiguo');

delete from public.room_players where room_id = pg_temp.room_id() and user_id <> pg_temp.u(1);
select pg_temp.as_user(1);
select public.leave_room(pg_temp.room_id());
select pg_temp.as_admin();
select is((select count(*) from public.rooms where id = pg_temp.room_id()), 0::bigint, 'si sale el último, la sala se borra');

select pg_temp.as_user(1);
select throws_ok(format('select public.leave_room(%L)', pg_temp.room_id()), 'P0001', 'room_not_found', 'no se sale de una sala borrada');

-- Seguridad de las funciones ------------------------------------------------------------------

select pg_temp.as_admin();
select is(
  (select bool_and(p.prosecdef and p.proconfig @> array['search_path=""'])
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('create_room', 'join_room', 'get_room_state', 'set_game', 'kick_player', 'leave_room')),
  true,
  'las RPC son security definer con search_path vacío'
);
select is(
  (select bool_or(has_function_privilege('anon', p.oid, 'execute'))
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public', 'private')),
  false,
  'anon no puede ejecutar ninguna función'
);
select is(
  (select array_agg(p.proname::text order by p.proname)
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'private' and has_function_privilege('authenticated', p.oid, 'execute')),
  array['is_room_member'],
  'de private, authenticated solo ejecuta is_room_member'
);

select * from finish();
rollback;
